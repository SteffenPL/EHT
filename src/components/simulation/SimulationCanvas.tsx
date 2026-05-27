/**
 * Simulation canvas component with Pixi.js rendering.
 * Automatically resizes to fill its container.
 */
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { SimulationRenderer } from '../../rendering';
import { useTheme, useModel } from '@/contexts';
import type { BaseSimulationParams } from '../../core/registry';
import {
  createVideoEncoder,
  getVideoFormatInfo,
  isMP4Supported,
  isMP4AV1Supported,
  isWebMSupported,
  type IVideoEncoder,
  type VideoFormat,
} from '../../core/export/videoEncoder';

function waitForDocumentReady(): Promise<void> {
  if (typeof document === 'undefined' || document.readyState !== 'loading') {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });
}

function waitForAnimationFrame(): Promise<void> {
  if (typeof requestAnimationFrame === 'undefined') {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

/** Ref interface exposed by SimulationCanvas */
export interface SimulationCanvasRef {
  /** Get a screenshot of the current canvas as a data URL */
  getScreenshot: () => string | null;
  /** Start recording video in the specified format */
  startRecording: (format: VideoFormat) => Promise<void>;
  /** Capture current frame during recording */
  captureFrame: (timestamp: number) => Promise<void>;
  /** Stop recording and return video blob with MIME type */
  stopRecording: () => Promise<{ blob: Blob; mimeType: string } | null>;
  /** Check if currently recording */
  isRecording: () => boolean;
  /** Check if MP4 recording is supported */
  isMP4Supported: () => Promise<boolean>;
  /** Check if MP4 AV1 recording is supported */
  isMP4AV1Supported: () => Promise<boolean>;
  /** Check if WebM recording is supported */
  isWebMSupported: () => Promise<boolean>;
}

export interface SimulationCanvasProps {
  state: any;
  params: BaseSimulationParams;
  /** Minimum height in pixels. Default: 350 */
  minHeight?: number;
  /** Maximum height in pixels. Default: Infinity (no cap) */
  maxHeight?: number;
  /** Aspect ratio (width/height). Default: 1 for square */
  aspectRatio?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Model-specific render options */
  renderOptions?: Record<string, boolean>;
  /** Transient renderer overlay data for interactions */
  interactionOverlay?: Record<string, unknown>;
  /** Enable nucleus dragging for models that expose cells with pos/R_soft. */
  dragEnabled?: boolean;
  onCellDragStart?: (cellIndex: number, position: { x: number; y: number }) => void;
  onCellDragMove?: (cellIndex: number, position: { x: number; y: number }) => void;
  onCellDragEnd?: (cellIndex: number, position: { x: number; y: number }) => void;
}

export const SimulationCanvas = forwardRef<SimulationCanvasRef, SimulationCanvasProps>(({
  state,
  params,
  minHeight = 350,
  maxHeight = Infinity,
  aspectRatio = 1,
  className,
  style,
  renderOptions = {},
  interactionOverlay = {},
  dragEnabled = false,
  onCellDragStart,
  onCellDragMove,
  onCellDragEnd,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SimulationRenderer | null>(null);
  const videoEncoderRef = useRef<IVideoEncoder | null>(null);
  const videoFormatRef = useRef<VideoFormat>('mp4'); // Store current recording format
  const isFinishingRef = useRef<boolean>(false); // Track if encoder is being finalized
  const dragRef = useRef<{ pointerId: number; cellIndex: number } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [size, setSize] = useState({ width: 800, height: minHeight });
  const { isDark } = useTheme();
  const { currentModel } = useModel();

  // Expose imperative methods via ref
  useImperativeHandle(ref, () => ({
    getScreenshot: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL('image/png');
      }
      return null;
    },
    startRecording: async (format: VideoFormat) => {
      if (!canvasRef.current || videoEncoderRef.current) return;

      const canvas = canvasRef.current;
      videoFormatRef.current = format; // Store format for stopRecording
      isFinishingRef.current = false; // Reset finishing flag

      const encoder = createVideoEncoder(format, {
        width: canvas.width,
        height: canvas.height,
        frameRate: 30, // 30 FPS
        // Bitrate will be calculated automatically based on resolution
      });

      try {
        await encoder.init();
        videoEncoderRef.current = encoder;
      } catch (error) {
        console.error('Failed to initialize video encoder:', error);
        throw error; // Re-throw so caller can handle
      }
    },
    captureFrame: async (timestamp: number) => {
      const encoder = videoEncoderRef.current;
      const canvas = canvasRef.current;

      if (!encoder || !canvas) return;

      try {
        await encoder.addFrame(canvas, timestamp);
      } catch (error) {
        console.error('Failed to capture frame:', error);
        // Don't throw - just log and continue
      }
    },
    stopRecording: async () => {
      const encoder = videoEncoderRef.current;
      if (!encoder) {
        return null;
      }

      const format = videoFormatRef.current;

      // Set finishing flag BEFORE calling finish() to prevent race conditions
      isFinishingRef.current = true;

      try {
        const blob = await encoder.finish();
        videoEncoderRef.current = null;
        isFinishingRef.current = false;

        // Return blob with appropriate MIME type
        const { mimeType } = getVideoFormatInfo(format);
        return { blob, mimeType };
      } catch (error) {
        console.error('Failed to finalize video:', error);
        videoEncoderRef.current = null;
        isFinishingRef.current = false;
        throw error;
      }
    },
    isRecording: () => {
      return videoEncoderRef.current !== null;
    },
    isMP4Supported: async () => {
      return await isMP4Supported();
    },
    isMP4AV1Supported: async () => {
      return await isMP4AV1Supported();
    },
    isWebMSupported: async () => {
      return await isWebMSupported();
    },
  }), []);

  // Measure container size
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = Math.floor(rect.width);
      const targetHeight = Math.floor(containerWidth / aspectRatio);
      const newHeight = Math.min(maxHeight, Math.max(minHeight, targetHeight));
      // If height was capped, shrink width to maintain aspect ratio
      const newWidth = newHeight < targetHeight
        ? Math.floor(newHeight * aspectRatio)
        : containerWidth;

      if (newWidth > 0 && newHeight > 0) {
        setSize({ width: newWidth, height: newHeight });
      }
    }
  }, [minHeight, maxHeight, aspectRatio]);

  // Observe container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial size
    updateSize();

    // ResizeObserver for dynamic resizing
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    // Also listen to window resize as a fallback
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [updateSize]);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const initRenderer = async () => {
      let renderer: SimulationRenderer | null = null;

      try {
        await waitForDocumentReady();
        await waitForAnimationFrame();

        if (cancelled || canvasRef.current !== canvas || !canvas.isConnected) {
          return;
        }

        renderer = new SimulationRenderer({ width: size.width, height: size.height, isDark });
        await renderer.init(canvas);

        if (cancelled || canvasRef.current !== canvas) {
          renderer.destroy();
          return;
        }

        rendererRef.current = renderer;
        renderer.setModel(currentModel);
        renderer.setParams(params);
        setIsReady(true);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to initialize simulation renderer:', error);
        }
        renderer?.destroy();
      }
    };

    initRenderer();

    return () => {
      cancelled = true;
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
      setIsReady(false);
    };
    // Only reinitialize on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update params when they change
  useEffect(() => {
    if (rendererRef.current && isReady) {
      rendererRef.current.setParams(params);
      // Re-render after params change
      if (state) {
        rendererRef.current.render(state);
      }
    }
  }, [params, isReady, state]);

  // Handle resize
  useEffect(() => {
    if (rendererRef.current && isReady && size.width > 0 && size.height > 0) {
      rendererRef.current.resize(size.width, size.height);
      // Re-render after resize
      if (state) {
        rendererRef.current.render(state);
      }
    }
  }, [size.width, size.height, isReady, state]);

  // Render state when it changes
  useEffect(() => {
    if (rendererRef.current && state && isReady) {
      rendererRef.current.render(state);

      // Capture frame if recording (check finishing flag to prevent race conditions)
      if (videoEncoderRef.current && canvasRef.current && !isFinishingRef.current) {
        const timestamp = state.t !== undefined ? state.t * 1000 : 0; // Convert hours to milliseconds
        videoEncoderRef.current.addFrame(canvasRef.current, timestamp)
          .catch(err => console.error('Failed to capture frame:', err));
      }
    }
  }, [state, isReady]);

  // Update theme when dark mode changes
  useEffect(() => {
    if (rendererRef.current && isReady) {
      rendererRef.current.setDarkMode(isDark);
      // Re-render with new theme
      if (state) {
        rendererRef.current.render(state);
      }
    }
  }, [isDark, isReady, state]);

  // Update model when it changes
  useEffect(() => {
    if (rendererRef.current && isReady) {
      rendererRef.current.setModel(currentModel);
      rendererRef.current.setParams(params);
      // Re-render with new model
      if (state) {
        rendererRef.current.render(state);
      }
    }
  }, [currentModel, isReady, state, params]);

  // Update render options when they change
  useEffect(() => {
    if (rendererRef.current && isReady) {
      rendererRef.current.setRenderOptions(renderOptions);
      // Re-render with new options
      if (state) {
        rendererRef.current.render(state);
      }
    }
  }, [renderOptions, isReady, state]);

  // Update transient interaction overlays when they change
  useEffect(() => {
    if (rendererRef.current && isReady) {
      rendererRef.current.setInteractionOverlay?.(interactionOverlay);
      if (state) {
        rendererRef.current.render(state);
      }
    }
  }, [interactionOverlay, isReady, state]);

  const getCanvasPosition = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return renderer.screenToWorld({
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    });
  }, []);

  const findCellAtPosition = useCallback((position: { x: number; y: number }) => {
    const cells = state?.cells;
    if (!Array.isArray(cells)) return null;

    let closestIndex: number | null = null;
    let closestDistanceSq = Infinity;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell?.pos) continue;

      const radius = Math.max(
        typeof cell.R_soft === 'number' ? cell.R_soft : 0,
        typeof cell.R_hard === 'number' ? cell.R_hard : 0,
        0.35
      );
      const dx = position.x - cell.pos.x;
      const dy = position.y - cell.pos.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq <= radius * radius && distanceSq < closestDistanceSq) {
        closestIndex = i;
        closestDistanceSq = distanceSq;
      }
    }

    return closestIndex;
  }, [state]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragEnabled) return;

    const position = getCanvasPosition(event);
    if (!position) return;

    const cellIndex = findCellAtPosition(position);
    if (cellIndex === null) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, cellIndex };
    onCellDragStart?.(cellIndex, position);
  }, [dragEnabled, findCellAtPosition, getCanvasPosition, onCellDragStart]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const position = getCanvasPosition(event);
    if (!position) return;

    event.preventDefault();
    onCellDragMove?.(drag.cellIndex, position);
  }, [getCanvasPosition, onCellDragMove]);

  const finishDrag = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const position = getCanvasPosition(event);
    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (position) {
      onCellDragEnd?.(drag.cellIndex, position);
    }
  }, [getCanvasPosition, onCellDragEnd]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        minHeight: `${minHeight}px`,
        display: 'flex',
        justifyContent: 'center',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{
          display: 'block',
          width: `${size.width}px`,
          height: `${size.height}px`,
          cursor: dragEnabled ? 'grab' : 'default',
          touchAction: dragEnabled ? 'none' : 'auto',
        }}
      />
    </div>
  );
});

SimulationCanvas.displayName = 'SimulationCanvas';
