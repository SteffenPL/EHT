/**
 * Simulation canvas component with Pixi.js rendering.
 * Automatically resizes to fill its container.
 */
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { SimulationRenderer } from '../../rendering';
import { useTheme, useModel } from '@/contexts';
import type { BaseSimulationParams } from '../../core/registry';

/** Ref interface exposed by SimulationCanvas */
export interface SimulationCanvasRef {
  /** Get a screenshot of the current canvas as a data URL */
  getScreenshot: () => string | null;
  /** Start recording video */
  startRecording: () => void;
  /** Stop recording and return video blob */
  stopRecording: () => Promise<Blob | null>;
  /** Check if currently recording */
  isRecording: () => boolean;
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
}

export const SimulationCanvas = forwardRef<SimulationCanvasRef, SimulationCanvasProps>(({
  state,
  params,
  minHeight = 350,
  aspectRatio = 1,
  className,
  style,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SimulationRenderer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
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
    startRecording: () => {
      if (!canvasRef.current || mediaRecorderRef.current) return;

      const stream = canvasRef.current.captureStream(30); // 30 FPS
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // Capture every 100ms
    },
    stopRecording: () => {
      return new Promise((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
          resolve(null);
          return;
        }

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          recordedChunksRef.current = [];
          mediaRecorderRef.current = null;
          resolve(blob);
        };

        recorder.stop();
      });
    },
    isRecording: () => {
      return mediaRecorderRef.current?.state === 'recording';
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
