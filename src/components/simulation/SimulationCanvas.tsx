/**
 * Simulation canvas component with Pixi.js rendering.
 */
import { useEffect, useRef, useState } from 'react';
import { SimulationRenderer } from '../../rendering';
import type { SimulationState, SimulationParams } from '../../core/types';

export interface SimulationCanvasProps {
  state: SimulationState | null;
  params: SimulationParams;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SimulationCanvas({
  state,
  params,
  width = 800,
  height = 400,
  className,
  style,
}: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SimulationRenderer | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;

    const initRenderer = async () => {
      const renderer = new SimulationRenderer({ width, height });
      await renderer.init(canvas);

      if (mounted) {
        rendererRef.current = renderer;
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
  }, []);

  // Update params when they change
  useEffect(() => {
    if (rendererRef.current && isReady) {
      rendererRef.current.setParams(params);
    }
  }, [params, isReady]);

  // Handle resize
  useEffect(() => {
    if (rendererRef.current && isReady) {
      rendererRef.current.resize(width, height);
    }
  }, [width, height, isReady]);

  // Render state when it changes
  useEffect(() => {
    if (rendererRef.current && state && isReady) {
      rendererRef.current.render(state);
    }
  }, [state, isReady]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        display: 'block',
        ...style,
      }}
    />
  );
}
