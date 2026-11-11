/**
 * Lockstep multi-simulation runner for comparison views.
 *
 * Runs one SimulationEngine per scenario on a shared physical-time timeline.
 * Each engine advances with its own dt and t_end; displayed states are the
 * latest states at or before the shared timeline time.
 *
 * This intentionally mirrors a slice of useSimulation's slider/catch-up
 * logic (single rAF loop, cloned history per frame, seek with catch-up)
 * but orchestrates N engines on a shared playback clock and harvests
 * per-step statistics and timestamps for each scenario.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { SimulationEngine, cloneSimulationState } from '@/core/simulation';
import { EHTModel } from '@/models/eht';
import { computeEHTStatistics } from '@/models/eht/statistics';
import type { EHTParams } from '@/models/eht/params/types';
import type { EHTSimulationState } from '@/models/eht/types';
import type { ComparisonScenario } from './scenarios';

export interface LockstepScenarioDefinition {
  scenario: ComparisonScenario;
  params: EHTParams;
}

export interface UseLockstepSimulationsResult {
  /** Currently displayed frame index (shared across scenarios). */
  frameIndex: number;
  /** Simulation time at the current frame [hours]. */
  time: number;
  /** Number of frames computed so far (0 = initial frame only). */
  computedFrames: number;
  /** Total frames needed to reach t_end. */
  totalFrames: number;
  /** Shared playback resolution, equal to the smallest scenario timestep. */
  dt: number;
  /** Playback end time, equal to the largest scenario end time [hours]. */
  tEnd: number;
  isRunning: boolean;
  isCatchingUp: boolean;
  isComplete: boolean;
  /** Display state per scenario id at the current frame. */
  states: Record<string, EHTSimulationState | null>;
  /** Per-step statistics per scenario id (index aligns with scenarioTimes). */
  stats: Record<string, Array<Record<string, number>>>;
  /** Actual state/statistic times per scenario [hours]. */
  scenarioTimes: Record<string, number[]>;
  start: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
  /** Seek to a frame (computes missing frames if needed). */
  seekToFrame: (frame: number) => void;
  /** Seek to a simulation time [hours]. */
  seekToTime: (time: number) => void;
}

function computeStatsOf(state: EHTSimulationState): Record<string, number> {
  // state.params holds the engine-unit params captured at init
  return computeEHTStatistics(state, state.params ?? undefined);
}

export function useLockstepSimulations(
  definitions: LockstepScenarioDefinition[]
): UseLockstepSimulationsResult {
  const dt = definitions.length
    ? Math.min(...definitions.map((def) => def.params.general.dt))
    : 1;
  const tEnd = definitions.length
    ? Math.max(...definitions.map((def) => def.params.general.t_end))
    : 0;
  const totalFrames = Math.max(0, Math.ceil(tEnd / dt - 1e-9));

  const enginesRef = useRef<SimulationEngine<EHTParams, EHTSimulationState>[]>([]);
  const historiesRef = useRef<Record<string, EHTSimulationState[]>>({});
  const statsRef = useRef<Record<string, Array<Record<string, number>>>>({});
  const timesRef = useRef<Record<string, number[]>>({});
  const animationFrameRef = useRef<number | null>(null);
  const seekTargetRef = useRef<number | null>(null);
  const frameIndexRef = useRef(0);
  const computedFramesRef = useRef(0);

  const [frameIndex, setFrameIndex] = useState(0);
  const [computedFrames, setComputedFrames] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCatchingUp, setIsCatchingUp] = useState(false);
  const [displayStates, setDisplayStates] = useState<Record<string, EHTSimulationState | null>>({});

  const stateAtTime = useCallback((id: string, targetTime: number) => {
    const history = historiesRef.current[id] ?? [];
    const times = timesRef.current[id] ?? [];
    let low = 0;
    let high = times.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (times[mid] <= targetTime + 1e-9) low = mid + 1;
      else high = mid;
    }
    return history[Math.max(0, low - 1)] ?? null;
  }, []);

  const computeFrame = useCallback(() => {
    const targetTime = Math.min((computedFramesRef.current + 1) * dt, tEnd);
    for (let i = 0; i < definitions.length; i++) {
      const engine = enginesRef.current[i];
      if (!engine) continue;
      const def = definitions[i];
      const id = def.scenario.id;
      const scenarioEnd = def.params.general.t_end;
      while (!engine.isComplete() && engine.getState().t < scenarioEnd && (
        engine.getState().t + def.params.general.dt <= targetTime + 1e-9 ||
        targetTime >= scenarioEnd
      )) {
        engine.step();
        const cloned = cloneSimulationState(engine.getState());
        historiesRef.current[id].push(cloned);
        statsRef.current[id].push(computeStatsOf(cloned));
        timesRef.current[id].push(cloned.t);
      }
    }
    computedFramesRef.current += 1;
    setComputedFrames(computedFramesRef.current);
  }, [definitions, dt, tEnd]);

  const showFrame = useCallback((index: number) => {
    const states: Record<string, EHTSimulationState | null> = {};
    for (const def of definitions) {
      states[def.scenario.id] = stateAtTime(def.scenario.id, Math.min(index * dt, tEnd));
    }
    frameIndexRef.current = index;
    setFrameIndex(index);
    setDisplayStates(states);
  }, [definitions, stateAtTime, dt, tEnd]);

  const allComplete = useCallback(() => computedFramesRef.current >= totalFrames, [totalFrames]);

  // (Re)initialize all engines and reset the shared timeline
  const initialize = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    enginesRef.current = definitions.map((def) =>
      // Never record per-step snapshots: this runner keeps its own history
      new SimulationEngine({ model: EHTModel, params: def.params, snapshotInterval: Number.POSITIVE_INFINITY })
    );

    const histories: Record<string, EHTSimulationState[]> = {};
    const stats: Record<string, Array<Record<string, number>>> = {};
    const times: Record<string, number[]> = {};
    const states: Record<string, EHTSimulationState | null> = {};

    definitions.forEach((def, i) => {
      const initial = cloneSimulationState(enginesRef.current[i].getState());
      histories[def.scenario.id] = [initial];
      stats[def.scenario.id] = [computeStatsOf(initial)];
      times[def.scenario.id] = [initial.t];
      states[def.scenario.id] = initial;
    });

    historiesRef.current = histories;
    statsRef.current = stats;
    timesRef.current = times;

    computedFramesRef.current = 0;
    frameIndexRef.current = 0;
    seekTargetRef.current = null;
    setFrameIndex(0);
    setComputedFrames(0);
    setIsRunning(false);
    setIsCatchingUp(false);
    setDisplayStates(states);
  }, [definitions]);

  useEffect(() => {
    initialize();
    // Re-run only when the scenario definitions change
  }, [initialize]);

  // Animation loop: normal playback (~25 fps) plus fast catch-up for seeks
  useEffect(() => {
    if (!isRunning && !isCatchingUp) return;

    let lastTime = performance.now();
    const targetDt = 40;
    const catchUpDt = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastTime;
      const frameTime = isCatchingUp ? catchUpDt : targetDt;

      if (elapsed >= frameTime) {
        lastTime = currentTime;

        if (isCatchingUp && seekTargetRef.current !== null) {
          const target = seekTargetRef.current;
          if (computedFramesRef.current >= target || allComplete()) {
            seekTargetRef.current = null;
            setIsCatchingUp(false);
            showFrame(Math.min(target, computedFramesRef.current));
            return;
          }
          computeFrame();
          showFrame(computedFramesRef.current);
        } else if (isRunning) {
          if (frameIndexRef.current < computedFramesRef.current) {
            // Frame already computed: play through history
            showFrame(frameIndexRef.current + 1);
          } else if (!allComplete()) {
            computeFrame();
            showFrame(computedFramesRef.current);
          } else {
            setIsRunning(false);
            return;
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
  }, [isRunning, isCatchingUp, computeFrame, showFrame, allComplete]);

  const start = useCallback(() => {
    if (frameIndexRef.current >= totalFrames) return;
    setIsCatchingUp(false);
    seekTargetRef.current = null;
    setIsRunning(true);
  }, [totalFrames]);

  const pause = useCallback(() => {
    setIsRunning(false);
    setIsCatchingUp(false);
    seekTargetRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsCatchingUp(false);
    seekTargetRef.current = null;
    showFrame(0);
  }, [showFrame]);

  const step = useCallback(() => {
    setIsRunning(false);
    setIsCatchingUp(false);
    seekTargetRef.current = null;

    if (frameIndexRef.current < computedFramesRef.current) {
      showFrame(frameIndexRef.current + 1);
    } else if (!allComplete()) {
      computeFrame();
      showFrame(computedFramesRef.current);
    }
  }, [showFrame, computeFrame, allComplete]);

  const seekToFrame = useCallback((frame: number) => {
    const target = Math.max(0, Math.min(Math.round(frame), totalFrames));

    if (target <= computedFramesRef.current) {
      setIsRunning(false);
      setIsCatchingUp(false);
      seekTargetRef.current = null;
      showFrame(target);
      return;
    }

    // Beyond computed history: catch up as fast as possible
    setIsRunning(false);
    seekTargetRef.current = target;
    setIsCatchingUp(true);
  }, [totalFrames, showFrame]);

  const seekToTime = useCallback((time: number) => {
    seekToFrame(time / dt);
  }, [seekToFrame, dt]);

  const time = Math.min(frameIndex * dt, tEnd);

  return {
    frameIndex,
    time,
    computedFrames,
    totalFrames,
    dt,
    tEnd,
    isRunning,
    isCatchingUp,
    isComplete: computedFrames >= totalFrames,
    states: displayStates,
    stats: statsRef.current,
    scenarioTimes: timesRef.current,
    start,
    pause,
    step,
    reset,
    seekToFrame,
    seekToTime,
  };
}
