/**
 * React hook for managing simulation state with time-travel capability.
 * Stores all computed states for scrubbing back and forth through the simulation.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { SimulationEngine } from '../core/simulation/engine';
import type { SimulationModel } from '../core/interfaces/model';
import {
  nowMs,
  withActiveSimulationProfiler,
  type SimulationProfilerCollector,
} from '../core/profiling/simulation-profiler';

/** Behavior when parameters change */
export type ParamChangeBehavior = 'init' | 'step' | 'run';
export type SimulationMode = 'slider' | 'realtime';

export interface UseSimulationOptions<Params = any, State = any> {
  model: SimulationModel<Params, State>;
  params: Params;
  autoInit?: boolean;
  /** What to do when params change. Default: 'init' */
  paramChangeBehavior?: ParamChangeBehavior;
  /** Slider mode preserves time-travel history; realtime mode steps from the displayed state. */
  simulationMode?: SimulationMode;
  /** Optional live constraint applied before and after each realtime step. */
  realtimeStateMutator?: (state: State) => void;
  /** Optional collector for the currently visible simulation profiler. */
  profiler?: SimulationProfilerCollector | null;
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
  /** Mutate the displayed state and continue future steps from that state. */
  mutateState: (mutator: (state: State) => void) => void;
  setParams: (params: Params) => void;
  engine: SimulationEngine<Params, State> | null;
}

/** Helper to deep clone state for storage */
function cloneState<State>(s: State): State {
  if (typeof s === 'object' && s !== null) {
    const cloned = structuredClone(s);
    const sourceAny = s as any;
    const clonedAny = cloned as any;

    if (
      sourceAny.basalGeometry &&
      typeof sourceAny.basalGeometry.projectPoint === 'function'
    ) {
      clonedAny.basalGeometry = sourceAny.basalGeometry;
    }

    return cloned;
  }
  return s;
}

/** Helper to get time from state */
function getStateTime(state: any): number {
  return state?.t ?? 0;
}

export function useSimulation<Params = any, State = any>(options: UseSimulationOptions<Params, State>): UseSimulationResult<Params, State> {
  const {
    model,
    params: initialParams,
    autoInit = true,
    paramChangeBehavior = 'init',
    simulationMode = 'slider',
    realtimeStateMutator,
    profiler,
  } = options;

  const [params, setParamsState] = useState<Params>(initialParams);
  const [state, setState] = useState<State | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCatchingUp, setIsCatchingUp] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const engineRef = useRef<SimulationEngine<Params, State> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);
  const currentIndexRef = useRef(0);
  const stateRef = useRef<State | null>(null);
  const realtimeStateMutatorRef = useRef<typeof realtimeStateMutator>(realtimeStateMutator);
  const profilerRef = useRef<SimulationProfilerCollector | null>(profiler ?? null);

  // State history: stores all computed states for time-travel
  const stateHistoryRef = useRef<State[]>([]);
  // Target time for seeking (when catching up)
  const seekTargetRef = useRef<number | null>(null);

  const cloneStateForDisplay = useCallback((sourceState: State): State => {
    const currentProfiler = profilerRef.current;
    if (!currentProfiler) return cloneState(sourceState);

    const start = nowMs();
    const cloned = cloneState(sourceState);
    currentProfiler.recordTiming('clone', nowMs() - start);
    return cloned;
  }, []);

  const runEngineStep = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const currentProfiler = profilerRef.current;
    if (!currentProfiler) {
      engine.step();
      return;
    }

    const start = nowMs();
    withActiveSimulationProfiler(currentProfiler, () => {
      engine.step();
    });
    currentProfiler.recordTiming('step', nowMs() - start);
  }, []);

  const recordProfilerSignals = useCallback(() => {
    const currentProfiler = profilerRef.current;
    if (!currentProfiler) return;

    currentProfiler.recordSignal('stateHistoryLength', stateHistoryRef.current.length);

    const visibleState = stateRef.current ?? engineRef.current?.getState() ?? null;
    const cells = (visibleState as any)?.cells;
    if (Array.isArray(cells)) {
      currentProfiler.recordSignal('cellCount', cells.length);
    }
  }, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    realtimeStateMutatorRef.current = realtimeStateMutator;
  }, [realtimeStateMutator]);

  useEffect(() => {
    profilerRef.current = profiler ?? null;
    recordProfilerSignals();
  }, [profiler, recordProfilerSignals]);

  useEffect(() => {
    recordProfilerSignals();
  }, [state, currentIndex, recordProfilerSignals]);

  // Initialize engine and history on first render
  useEffect(() => {
    engineRef.current = new SimulationEngine({ model, params: initialParams, autoInit });
    if (autoInit) {
      const initialState = engineRef.current.getState();
      const cloned = cloneStateForDisplay(initialState);
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
    const cloned = cloneStateForDisplay(initialState);
    stateHistoryRef.current = [cloned];
    setCurrentIndex(0);
    setState(cloned);

    if (paramChangeBehavior === 'step') {
      // Run one step after init
      runEngineStep();
      const s = cloneStateForDisplay(engineRef.current.getState());
      stateHistoryRef.current.push(s);
      setCurrentIndex(1);
      setState(s);
    } else if (paramChangeBehavior === 'run') {
      // Start the simulation running
      setIsRunning(true);
    }
    // 'init' just initializes (already done above)
  }, [model, initialParams, paramChangeBehavior, cloneStateForDisplay, runEngineStep]);

  // Realtime mode continues from the displayed frame, not from the furthest
  // precomputed history frame used by slider mode.
  useEffect(() => {
    if (simulationMode !== 'realtime' || !engineRef.current || !stateRef.current) return;

    const liveState = cloneStateForDisplay(stateRef.current);
    realtimeStateMutatorRef.current?.(liveState);
    engineRef.current.setState(cloneStateForDisplay(liveState));
    stateHistoryRef.current = [cloneStateForDisplay(liveState)];
    setCurrentIndex(0);
    setState(liveState);
  }, [simulationMode, cloneStateForDisplay]);

  // Animation loop - handles both running and catching up
  useEffect(() => {
    const shouldAnimate = isRunning || isCatchingUp;
    if (!shouldAnimate || !engineRef.current) return;

    let lastTime = performance.now();
    let lastFrameTimestamp = lastTime;
    const targetDt = 40; // ~25 fps for normal playback
    const catchUpDt = 0; // No delay when catching up (compute as fast as possible)

    const animate = (currentTime: number) => {
      if (!engineRef.current) return;

      const frameDelta = currentTime - lastFrameTimestamp;
      lastFrameTimestamp = currentTime;
      profilerRef.current?.recordTiming('frame', frameDelta);

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
          runEngineStep();
          const newState = cloneStateForDisplay(engineRef.current.getState());
          stateHistoryRef.current.push(newState);

          // Update display to show progress
          const newIndex = stateHistoryRef.current.length - 1;
          setCurrentIndex(newIndex);
          setState(newState);

        } else if (isRunning && simulationMode === 'realtime') {
          if (!engineRef.current.isComplete()) {
            const mutator = realtimeStateMutatorRef.current;
            const liveState = engineRef.current.getState();
            mutator?.(liveState);
            runEngineStep();
            mutator?.(engineRef.current.getState());

            const newState = cloneStateForDisplay(engineRef.current.getState());
            stateHistoryRef.current = [newState];
            setCurrentIndex(0);
            setState(newState);
          } else {
            setIsRunning(false);
          }
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
            runEngineStep();
            const newState = cloneStateForDisplay(engineRef.current.getState());
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
  }, [isRunning, isCatchingUp, currentIndex, simulationMode, cloneStateForDisplay, runEngineStep]);

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

    if (simulationMode === 'realtime' && engineRef.current) {
      engineRef.current.resetWithParams(params);
      const initialState = cloneStateForDisplay(engineRef.current.getState());
      stateHistoryRef.current = [initialState];
      setCurrentIndex(0);
      setState(initialState);
      return;
    }

    // Just go back to the first frame (don't reinitialize simulation)
    const history = stateHistoryRef.current;
    if (history.length > 0) {
      setCurrentIndex(0);
      setState(history[0]);
    }
  }, [params, simulationMode, cloneStateForDisplay]);

  const step = useCallback(() => {
    if (!engineRef.current) return;

    if (simulationMode === 'realtime') {
      const mutator = realtimeStateMutatorRef.current;
      const liveState = engineRef.current.getState();
      mutator?.(liveState);
      runEngineStep();
      mutator?.(engineRef.current.getState());

      const newState = cloneStateForDisplay(engineRef.current.getState());
      stateHistoryRef.current = [newState];
      setCurrentIndex(0);
      setState(newState);
      return;
    }

    const history = stateHistoryRef.current;
    const nextIndex = currentIndex + 1;

    if (nextIndex < history.length) {
      // State exists in history, just move to it
      setCurrentIndex(nextIndex);
      setState(history[nextIndex]);
    } else if (!engineRef.current.isComplete()) {
      // Need to compute new state
      runEngineStep();
      const newState = cloneStateForDisplay(engineRef.current.getState());
      stateHistoryRef.current.push(newState);
      setCurrentIndex(stateHistoryRef.current.length - 1);
      setState(newState);
    }
  }, [currentIndex, simulationMode, cloneStateForDisplay, runEngineStep]);

  const seekTo = useCallback((targetTime: number) => {
    if (simulationMode === 'realtime') return;

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
  }, [params, simulationMode]);

  const mutateState = useCallback((mutator: (state: State) => void) => {
    if (!engineRef.current) return;

    const baseState = stateRef.current ?? engineRef.current.getState();
    const liveState = cloneStateForDisplay(baseState);
    mutator(liveState);
    realtimeStateMutatorRef.current?.(liveState);

    engineRef.current.setState(cloneStateForDisplay(liveState));

    if (simulationMode === 'realtime') {
      stateHistoryRef.current = [cloneStateForDisplay(liveState)];
      setCurrentIndex(0);
    } else {
      const nextHistory = stateHistoryRef.current.slice(0, currentIndexRef.current + 1);
      nextHistory[currentIndexRef.current] = cloneStateForDisplay(liveState);
      stateHistoryRef.current = nextHistory;
    }

    setState(liveState);
  }, [simulationMode, cloneStateForDisplay]);

  const setParams = useCallback((newParams: Params) => {
    setIsRunning(false);
    setIsCatchingUp(false);
    seekTargetRef.current = null;
    setParamsState(newParams);

    if (engineRef.current) {
      engineRef.current.resetWithParams(newParams);
      const initialState = cloneStateForDisplay(engineRef.current.getState());
      stateHistoryRef.current = [initialState];
      setCurrentIndex(0);
      setState(initialState);
    }
  }, [cloneStateForDisplay]);

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
    mutateState,
    setParams,
    engine: engineRef.current
  };
}
