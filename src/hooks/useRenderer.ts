/**
 * React hook for managing the Pixi.js renderer.
 */
import { useRef, useEffect, useCallback } from 'react';
import { SimulationRenderer } from '../rendering';
import type { BaseSimulationState as SimulationState } from '../core/types';
import type { ModelDefinition, BaseSimulationParams } from '../core/registry';

export interface UseRendererOptions {
  width?: number;
  height?: number;
  isDark?: boolean;
}

export interface UseRendererResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  render: (state: SimulationState) => void;
  setParams: (params: BaseSimulationParams) => void;
  setModel: (model: ModelDefinition<BaseSimulationParams>) => void;
  setDarkMode: (isDark: boolean) => void;
  resize: (width: number, height: number) => void;
}

export function useRenderer(options: UseRendererOptions = {}): UseRendererResult {
  const { width = 800, height = 400, isDark = false } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<SimulationRenderer | null>(null);
  const initializedRef = useRef(false);

  // Initialize renderer when canvas is available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || initializedRef.current) return;

    const initRenderer = async () => {
      const renderer = new SimulationRenderer({ width, height, isDark });
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
  }, [width, height, isDark]);

  const render = useCallback((state: SimulationState) => {
    if (rendererRef.current) {
      rendererRef.current.render(state);
    }
  }, []);

  const setParams = useCallback((params: BaseSimulationParams) => {
    if (rendererRef.current) {
      rendererRef.current.setParams(params);
    }
  }, []);

  const setModel = useCallback((model: ModelDefinition<BaseSimulationParams>) => {
    if (rendererRef.current) {
      rendererRef.current.setModel(model);
    }
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    if (rendererRef.current) {
      rendererRef.current.setDarkMode(dark);
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
    setModel,
    setDarkMode,
    resize,
  };
}
