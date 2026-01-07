/**
 * React hook for managing simulation state.
 * Uses the model-aware simulation engine.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { ModelSimulationEngine } from '../core/simulation/model-engine';
import type { SimulationState } from '../core/types';
import type { ModelDefinition, BaseSimulationParams } from '../core/registry';

/** Behavior when parameters change */
export type ParamChangeBehavior = 'init' | 'step' | 'run';

export interface UseSimulationOptions {
  model: ModelDefinition<BaseSimulationParams>;
  params: BaseSimulationParams;
  autoInit?: boolean;
  /** What to do when params change. Default: 'init' */
  paramChangeBehavior?: ParamChangeBehavior;
}

export interface UseSimulationResult {
  state: SimulationState | null;
  params: BaseSimulationParams;
  isRunning: boolean;
  isComplete: boolean;
  time: number;
  stepCount: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  step: () => void;
  setParams: (params: BaseSimulationParams) => void;
}

export function useSimulation(options: UseSimulationOptions): UseSimulationResult {
  const { model, params: initialParams, autoInit = true, paramChangeBehavior = 'init' } = options;

  const [params, setParamsState] = useState<BaseSimulationParams>(initialParams);
  const [state, setState] = useState<SimulationState | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const engineRef = useRef<ModelSimulationEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  const snapshotState = useCallback((): SimulationState | null => {
    const current = engineRef.current?.getState();
    if (!current) return null;
    return JSON.parse(JSON.stringify(current)) as SimulationState;
  }, []);

  // Initialize engine on first render
  useEffect(() => {
    engineRef.current = new ModelSimulationEngine({ model, params: initialParams });
    if (autoInit) {
      engineRef.current.init();
      setState(snapshotState());
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle parameter or model changes
  useEffect(() => {
    // Skip the first render - engine is initialized above
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setParamsState(initialParams);

    // Reinitialize the engine with new model/params
    setIsRunning(false);
    engineRef.current = new ModelSimulationEngine({ model, params: initialParams });
    engineRef.current.init();
    setState(snapshotState());

    if (paramChangeBehavior === 'step') {
      // Run one step after init
      engineRef.current.step();
      setState(snapshotState());
    } else if (paramChangeBehavior === 'run') {
      // Start the simulation running
      setIsRunning(true);
    }
    // 'init' just initializes (already done above)
  }, [model, initialParams, paramChangeBehavior, snapshotState]);

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

  const setParams = useCallback((newParams: BaseSimulationParams) => {
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
