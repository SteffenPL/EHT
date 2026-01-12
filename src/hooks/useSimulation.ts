/**
 * React hook for managing simulation state with time-travel capability.
 * Stores all computed states for scrubbing back and forth through the simulation.
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
  /** Maximum time that has been simulated so far */
  maxSimulatedTime: number;
  /** Whether simulation is catching up to a seek target */
  isCatchingUp: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  step: () => void;
  /** Seek to a specific time. If time > maxSimulatedTime, will compute until caught up */
  seekTo: (time: number) => void;
  setParams: (params: Params) => void;
  engine: SimulationEngine<Params, State> | null;
}

/** Helper to deep clone state for storage */
function cloneState<State>(s: State): State {
  if (typeof s === 'object' && s !== null) {
    return structuredClone(s);
  }
  return s;
}

/** Helper to get time from state */
function getStateTime(state: any): number {
  return state?.t ?? 0;
}

export function useSimulation<Params = any, State = any>(options: UseSimulationOptions<Params, State>): UseSimulationResult<Params, State> {
  const { model, params: initialParams, autoInit = true, paramChangeBehavior = 'init' } = options;

  const [params, setParamsState] = useState<Params>(initialParams);
  const [state, setState] = useState<State | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCatchingUp, setIsCatchingUp] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const engineRef = useRef<SimulationEngine<Params, State> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  // State history: stores all computed states for time-travel
  const stateHistoryRef = useRef<State[]>([]);
  // Target time for seeking (when catching up)
  const seekTargetRef = useRef<number | null>(null);

  // Initialize engine and history on first render
  useEffect(() => {
    engineRef.current = new SimulationEngine({ model, params: initialParams });
    if (autoInit) {
      engineRef.current.init();
      const initialState = engineRef.current.getState();
      const cloned = cloneState(initialState);
      stateHistoryRef.current = [cloned];
      setCurrentIndex(0);
      setState(cloned);
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
    setIsRunning(false);
    setIsCatchingUp(false);
    seekTargetRef.current = null;

    // Reinitialize the engine with new model/params
    engineRef.current = new SimulationEngine({ model, params: initialParams });
    const initialState = engineRef.current.getState();
    const cloned = cloneState(initialState);
    stateHistoryRef.current = [cloned];
    setCurrentIndex(0);
    setState(cloned);

    if (paramChangeBehavior === 'step') {
      // Run one step after init
      engineRef.current.step();
      const s = cloneState(engineRef.current.getState());
      stateHistoryRef.current.push(s);
      setCurrentIndex(1);
      setState(s);
    } else if (paramChangeBehavior === 'run') {
      // Start the simulation running
      setIsRunning(true);
    }
    // 'init' just initializes (already done above)
  }, [model, initialParams, paramChangeBehavior]);

  // Animation loop - handles both running and catching up
  useEffect(() => {
    const shouldAnimate = isRunning || isCatchingUp;
    if (!shouldAnimate || !engineRef.current) return;

    let lastTime = performance.now();
    const targetDt = 40; // ~25 fps for normal playback
    const catchUpDt = 0; // No delay when catching up (compute as fast as possible)

    const animate = (currentTime: number) => {
      if (!engineRef.current) return;

      const elapsed = currentTime - lastTime;
      const frameTime = isCatchingUp ? catchUpDt : targetDt;

      if (elapsed >= frameTime) {
        lastTime = currentTime;

        if (isCatchingUp && seekTargetRef.current !== null) {
          // Catching up mode: compute states until we reach target time
          const history = stateHistoryRef.current;
          const maxTime = history.length > 0 ? getStateTime(history[history.length - 1]) : 0;

          if (maxTime >= seekTargetRef.current || engineRef.current.isComplete()) {
            // We've caught up or reached the end
            // Find the closest state to the target time
            const targetTime = seekTargetRef.current;
            let bestIndex = history.length - 1;
            for (let i = 0; i < history.length; i++) {
              if (getStateTime(history[i]) >= targetTime) {
                bestIndex = i;
                break;
              }
            }
            setCurrentIndex(bestIndex);
            setState(history[bestIndex]);
            setIsCatchingUp(false);
            seekTargetRef.current = null;
            return;
          }

          // Compute next state
          engineRef.current.step();
          const newState = cloneState(engineRef.current.getState());
          stateHistoryRef.current.push(newState);

          // Update display to show progress
          const newIndex = stateHistoryRef.current.length - 1;
          setCurrentIndex(newIndex);
          setState(newState);

        } else if (isRunning) {
          // Normal running mode - play through history or compute new states
          const history = stateHistoryRef.current;
          const nextIndex = currentIndex + 1;

          if (nextIndex < history.length) {
            // We have this state in history, just advance the index
            setCurrentIndex(nextIndex);
            setState(history[nextIndex]);
          } else if (!engineRef.current.isComplete()) {
            // Need to compute the next state
            engineRef.current.step();
            const newState = cloneState(engineRef.current.getState());
            stateHistoryRef.current.push(newState);
            setCurrentIndex(stateHistoryRef.current.length - 1);
            setState(newState);
          } else {
            // Reached end of simulation, stop playing
            setIsRunning(false);
          }
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
  }, [isRunning, isCatchingUp, currentIndex]);

  const start = useCallback(() => {
    setIsCatchingUp(false);
    seekTargetRef.current = null;
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    setIsCatchingUp(false);
    seekTargetRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsCatchingUp(false);
    seekTargetRef.current = null;

    // Just go back to the first frame (don't reinitialize simulation)
    const history = stateHistoryRef.current;
    if (history.length > 0) {
      setCurrentIndex(0);
      setState(history[0]);
    }
  }, []);

  const step = useCallback(() => {
    if (!engineRef.current) return;

    const history = stateHistoryRef.current;
    const nextIndex = currentIndex + 1;

    if (nextIndex < history.length) {
      // State exists in history, just move to it
      setCurrentIndex(nextIndex);
      setState(history[nextIndex]);
    } else if (!engineRef.current.isComplete()) {
      // Need to compute new state
      engineRef.current.step();
      const newState = cloneState(engineRef.current.getState());
      stateHistoryRef.current.push(newState);
      setCurrentIndex(stateHistoryRef.current.length - 1);
      setState(newState);
    }
  }, [currentIndex]);

  const seekTo = useCallback((targetTime: number) => {
    const history = stateHistoryRef.current;
    if (history.length === 0) return;

    // Clamp target time to valid range
    const pAny = params as any;
    const endTime = pAny?.general?.t_end ?? Infinity;
    targetTime = Math.max(0, Math.min(targetTime, endTime));

    const maxSimulatedTime = getStateTime(history[history.length - 1]);

    if (targetTime <= maxSimulatedTime) {
      // Target is within computed history - find closest state
      let bestIndex = 0;
      let bestDiff = Infinity;

      for (let i = 0; i < history.length; i++) {
        const stateTime = getStateTime(history[i]);
        const diff = Math.abs(stateTime - targetTime);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = i;
        }
        // Stop early if we've passed the target
        if (stateTime > targetTime) break;
      }

      setIsRunning(false);
      setIsCatchingUp(false);
      seekTargetRef.current = null;
      setCurrentIndex(bestIndex);
      setState(history[bestIndex]);
    } else {
      // Target is beyond computed history - need to catch up
      setIsRunning(false);
      seekTargetRef.current = targetTime;
      setIsCatchingUp(true);
    }
  }, [params]);

  const setParams = useCallback((newParams: Params) => {
    setIsRunning(false);
    setIsCatchingUp(false);
    seekTargetRef.current = null;
    setParamsState(newParams);

    if (engineRef.current) {
      engineRef.current.resetWithParams(newParams);
      const initialState = cloneState(engineRef.current.getState());
      stateHistoryRef.current = [initialState];
      setCurrentIndex(0);
      setState(initialState);
    }
  }, []);

  // Compute derived values
  const history = stateHistoryRef.current;
  const maxSimulatedTime = history.length > 0 ? getStateTime(history[history.length - 1]) : 0;

  return {
    state,
    params,
    isRunning,
    isComplete: engineRef.current?.isComplete() ?? false,
    time: (state as any)?.t ?? 0,
    stepCount: (state as any)?.step_count ?? 0,
    maxSimulatedTime,
    isCatchingUp,
    start,
    pause,
    reset,
    step,
    seekTo,
    setParams,
    engine: engineRef.current
  };
}
