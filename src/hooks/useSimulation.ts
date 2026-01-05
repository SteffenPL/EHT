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

  const snapshotState = useCallback((): SimulationState | null => {
    const current = engineRef.current?.getState();
    if (!current) return null;
    return JSON.parse(JSON.stringify(current)) as SimulationState;
  }, []);

  // Initialize engine
  useEffect(() => {
    // Clear the previous state so we don't render it with the new params/viewport.
    setState(null);

    engineRef.current = new SimulationEngine({ params });
    if (autoInit) {
      engineRef.current.init();
      setState(snapshotState());
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [params, autoInit, snapshotState]);

  // Sync external parameter changes into hook state
  useEffect(() => {
    setIsRunning(false);
    setParamsState(initialParams);
  }, [initialParams]);

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
        setState(snapshotState());
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, snapshotState]);

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
      setState(snapshotState());
    }
  }, [snapshotState]);

  const step = useCallback(() => {
    if (engineRef.current && !engineRef.current.isComplete()) {
      engineRef.current.step();
      setState(snapshotState());
    }
  }, [snapshotState]);

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
