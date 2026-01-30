/**
 * Simulation canvas component with Pixi.js rendering.
 * Automatically resizes to fill its container.
 */
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { SimulationRenderer } from '../../rendering';
import { useTheme, useModel } from '@/contexts';
import type { BaseSimulationParams } from '../../core/registry';
import { MP4VideoEncoder, isMP4Supported } from '../../core/export/videoEncoder';

/** Ref interface exposed by SimulationCanvas */
export interface SimulationCanvasRef {
  /** Get a screenshot of the current canvas as a data URL */
  getScreenshot: () => string | null;
  /** Start recording video (MP4 format) */
  startRecording: () => Promise<void>;
  /** Capture current frame during recording */
  captureFrame: (timestamp: number) => Promise<void>;
  /** Stop recording and return video blob */
  stopRecording: () => Promise<Blob | null>;
  /** Check if currently recording */
  isRecording: () => boolean;
  /** Check if MP4 recording is supported */
  isMP4Supported: () => boolean;
}

export interface SimulationCanvasProps {
  state: any;
  params: BaseSimulationParams;
  /** Minimum height in pixels. Default: 350 */
  minHeight?: number;
  /** Aspect ratio (width/height). Default: 1 for square */
  aspectRatio?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Model-specific render options */
  renderOptions?: Record<string, boolean>;
}

export const SimulationCanvas = forwardRef<SimulationCanvasRef, SimulationCanvasProps>(({
  state,
  params,
  minHeight = 350,
  aspectRatio = 1,
  className,
  style,
  renderOptions = {},
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SimulationRenderer | null>(null);
  const videoEncoderRef = useRef<MP4VideoEncoder | null>(null);
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
    startRecording: async () => {
      if (!canvasRef.current || videoEncoderRef.current) return;

      const canvas = canvasRef.current;
      const encoder = new MP4VideoEncoder({
        width: canvas.width,
        height: canvas.height,
        frameRate: 30, // 30 FPS
        // Bitrate will be calculated automatically based on resolution
      });

      await encoder.init();
      videoEncoderRef.current = encoder;
    },
    captureFrame: async (timestamp: number) => {
      const encoder = videoEncoderRef.current;
      const canvas = canvasRef.current;

      if (!encoder || !canvas) return;

      await encoder.addFrame(canvas, timestamp);
    },
    stopRecording: async () => {
      const encoder = videoEncoderRef.current;
      if (!encoder) {
        return null;
      }

      const blob = await encoder.finish();
      videoEncoderRef.current = null;
      return blob;
    },
    isRecording: () => {
      return videoEncoderRef.current !== null;
    },
    isMP4Supported: () => {
      return isMP4Supported();
    },
  }), []);

  // Measure container size
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      // Enforce aspect ratio: height = width / aspectRatio
      const targetHeight = Math.floor(newWidth / aspectRatio);
      const newHeight = Math.max(minHeight, targetHeight);

      if (newWidth > 0 && newHeight > 0) {
        setSize({ width: newWidth, height: newHeight });
      }
    }
  }, [minHeight, aspectRatio]);

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

    let mounted = true;

    const initRenderer = async () => {
      const renderer = new SimulationRenderer({ width: size.width, height: size.height, isDark });
      await renderer.init(canvas);

      if (mounted) {
        rendererRef.current = renderer;
        renderer.setModel(currentModel);
        renderer.setParams(params);
        setIsReady(true);
      }
    };

    initRenderer();

    return () => {
      mounted = false;
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

      // Capture frame if recording
      if (videoEncoderRef.current && canvasRef.current) {
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

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        minHeight: `${minHeight}px`,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
});

SimulationCanvas.displayName = 'SimulationCanvas';
