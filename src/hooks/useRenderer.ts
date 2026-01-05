/**
 * React hook for managing the Pixi.js renderer.
 */
import { useRef, useEffect, useCallback } from 'react';
import { SimulationRenderer } from '../rendering';
import type { SimulationState, SimulationParams } from '../core/types';

export interface UseRendererOptions {
  width?: number;
  height?: number;
}

export interface UseRendererResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  render: (state: SimulationState) => void;
  setParams: (params: SimulationParams) => void;
  resize: (width: number, height: number) => void;
}

export function useRenderer(options: UseRendererOptions = {}): UseRendererResult {
  const { width = 800, height = 400 } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<SimulationRenderer | null>(null);
  const initializedRef = useRef(false);

  // Initialize renderer when canvas is available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || initializedRef.current) return;

    const initRenderer = async () => {
      const renderer = new SimulationRenderer({ width, height });
      await renderer.init(canvas);
      rendererRef.current = renderer;
      initializedRef.current = true;
    };

    initRenderer();

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [width, height]);

  const render = useCallback((state: SimulationState) => {
    if (rendererRef.current) {
      rendererRef.current.render(state);
    }
  }, []);

  const setParams = useCallback((params: SimulationParams) => {
    if (rendererRef.current) {
      rendererRef.current.setParams(params);
    }
  }, []);

  const resize = useCallback((w: number, h: number) => {
    if (rendererRef.current) {
      rendererRef.current.resize(w, h);
    }
  }, []);

  return {
    canvasRef,
    render,
    setParams,
    resize,
  };
}
