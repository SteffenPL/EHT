/**
 * React hook for managing simulation state.
 * Uses the generic simulation engine.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { SimulationEngine } from '../core/simulation/engine';
import type { SimulationModel } from '../core/interfaces/model';

/** Behavior when parameters change */
export type ParamChangeBehavior = 'init' | 'step' | 'run';

export interface UseSimulationOptions<Params = any, State = any> {
  model: SimulationModel<Params, State>;
  params: Params;
  autoInit?: boolean;
  /** What to do when params change. Default: 'init' */
  paramChangeBehavior?: ParamChangeBehavior;
}

export interface UseSimulationResult<Params = any, State = any> {
  state: State | null;
  params: Params;
  isRunning: boolean;
  isComplete: boolean;
  time: number;
  stepCount: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  step: () => void;
  setParams: (params: Params) => void;
  engine: SimulationEngine<Params, State> | null;
}

export function useSimulation<Params = any, State = any>(options: UseSimulationOptions<Params, State>): UseSimulationResult<Params, State> {
  const { model, params: initialParams, autoInit = true, paramChangeBehavior = 'init' } = options;

  const [params, setParamsState] = useState<Params>(initialParams);
  const [state, setState] = useState<State | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const engineRef = useRef<SimulationEngine<Params, State> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  // Force update helper
  const [, forceUpdate] = useState({});

  // Initialize engine on first render
  useEffect(() => {
    engineRef.current = new SimulationEngine({ model, params: initialParams });
    if (autoInit) {
      engineRef.current.init();
      setState(engineRef.current.getState());
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
    engineRef.current = new SimulationEngine({ model, params: initialParams });

    setState(engineRef.current.getState());

    if (paramChangeBehavior === 'step') {
      // Run one step after init
      engineRef.current.step();
      setState(engineRef.current.getState());
      // Force update if state ref didn't change
      forceUpdate({});
    } else if (paramChangeBehavior === 'run') {
      // Start the simulation running
      setIsRunning(true);
    }
    // 'init' just initializes (already done above)
  }, [model, initialParams, paramChangeBehavior]);

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

        // Update React state
        const s = engineRef.current.getState();

        // Ensure state update triggers re-render (handle mutations)
        if (typeof s === 'object' && s !== null) {
          setState(Array.isArray(s) ? [...s] : { ...s } as any);
        } else {
          setState(s);
        }
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
      engineRef.current.init();
      const s = engineRef.current.getState();
      setState(typeof s === 'object' && s !== null ? { ...s } as any : s);
    }
  }, []);

  const step = useCallback(() => {
    if (engineRef.current && !engineRef.current.isComplete()) {
      engineRef.current.step();
      const s = engineRef.current.getState();
      setState(typeof s === 'object' && s !== null ? { ...s } as any : s);
    }
  }, []);

  const setParams = useCallback((newParams: Params) => {
    setIsRunning(false);
    setParamsState(newParams);
    if (engineRef.current) {
      engineRef.current.resetWithParams(newParams);
      const s = engineRef.current.getState();
      setState(typeof s === 'object' && s !== null ? { ...s } as any : s);
    }
  }, []);

  return {
    state,
    params,
    isRunning,
    isComplete: engineRef.current?.isComplete() ?? false,
    time: (state as any)?.t ?? 0,
    stepCount: (state as any)?.step_count ?? 0,
    start,
    pause,
    reset,
    step,
    setParams,
    engine: engineRef.current
  };
}
