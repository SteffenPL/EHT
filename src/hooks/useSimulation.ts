/**
 * React hook for managing simulation state.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { SimulationEngine, type SimulationParams, type SimulationState, DEFAULT_PARAMS } from '../core';

export interface UseSimulationOptions {
  params?: SimulationParams;
  autoInit?: boolean;
}

export interface UseSimulationResult {
  state: SimulationState | null;
  params: SimulationParams;
  isRunning: boolean;
  isComplete: boolean;
  time: number;
  stepCount: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  step: () => void;
  setParams: (params: SimulationParams) => void;
}

export function useSimulation(options: UseSimulationOptions = {}): UseSimulationResult {
  const { params: initialParams = DEFAULT_PARAMS, autoInit = true } = options;

  const [params, setParamsState] = useState<SimulationParams>(initialParams);
  const [state, setState] = useState<SimulationState | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const engineRef = useRef<SimulationEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize engine
  useEffect(() => {
    engineRef.current = new SimulationEngine({ params });
    if (autoInit) {
      engineRef.current.init();
      setState({ ...engineRef.current.getState() } as SimulationState);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [params, autoInit]);

  // Animation loop
  useEffect(() => {
    if (!isRunning || !engineRef.current) return;

    let lastTime = performance.now();
    const targetDt = 40; // ~25 fps

    const animate = (currentTime: number) => {
      if (!engineRef.current || !isRunning) return;

      const elapsed = currentTime - lastTime;

      if (elapsed >= targetDt) {
        lastTime = currentTime;

        if (engineRef.current.isComplete()) {
          setIsRunning(false);
          return;
        }

        engineRef.current.step();
        setState({ ...engineRef.current.getState() } as SimulationState);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    if (engineRef.current) {
      engineRef.current.reset();
      setState({ ...engineRef.current.getState() } as SimulationState);
    }
  }, []);

  const step = useCallback(() => {
    if (engineRef.current && !engineRef.current.isComplete()) {
      engineRef.current.step();
      setState({ ...engineRef.current.getState() } as SimulationState);
    }
  }, []);

  const setParams = useCallback((newParams: SimulationParams) => {
    setIsRunning(false);
    setParamsState(newParams);
  }, []);

  return {
    state,
    params,
    isRunning,
    isComplete: engineRef.current?.isComplete() ?? false,
    time: state?.t ?? 0,
    stepCount: state?.step_count ?? 0,
    start,
    pause,
    reset,
    step,
    setParams,
  };
}
