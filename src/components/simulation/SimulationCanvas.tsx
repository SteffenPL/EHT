/**
 * Simulation canvas component with Pixi.js rendering.
 * Automatically resizes to fill its container.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationRenderer } from '../../rendering';
import { useTheme, useModel } from '@/contexts';
import type { BaseSimulationParams } from '../../core/registry';

export interface SimulationCanvasProps {
  state: any;
  params: BaseSimulationParams;
  /** Minimum height in pixels. Default: 350 */
  minHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SimulationCanvas({
  state,
  params,
  minHeight = 350,
  className,
  style,
}: SimulationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SimulationRenderer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [size, setSize] = useState({ width: 800, height: minHeight });
  const { isDark } = useTheme();
  const { currentModel } = useModel();

  // Measure container size
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.max(minHeight, Math.floor(rect.height));

      if (newWidth > 0 && newHeight > 0) {
        setSize({ width: newWidth, height: newHeight });
      }
    }
  }, [minHeight]);

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
}
