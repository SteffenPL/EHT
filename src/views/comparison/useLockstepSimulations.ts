/**
 * Lockstep multi-simulation runner for comparison views.
 *
 * Runs one SimulationEngine per scenario on a *shared frame timeline*:
 * all scenarios must use the same dt and t_end (validated with a warning),
 * so frame index k shows every scenario at simulation time k * dt.
 *
 * This intentionally mirrors a slice of useSimulation's slider/catch-up
 * logic (single rAF loop, cloned history per frame, seek with catch-up)
 * but orchestrates N engines in lockstep and additionally harvests
 * per-frame statistics for each scenario.
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
  /** Timestep shared by all scenarios [hours]. */
  dt: number;
  /** End time shared by all scenarios [hours]. */
  tEnd: number;
  isRunning: boolean;
  isCatchingUp: boolean;
  isComplete: boolean;
  /** Display state per scenario id at the current frame. */
  states: Record<string, EHTSimulationState | null>;
  /** Per-frame statistics per scenario id (array index = frame index). */
  stats: Record<string, Array<Record<string, number>>>;
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
  const first = definitions[0];
  const dt = first?.params.general.dt ?? 1;
  const tEnd = first?.params.general.t_end ?? 0;
  const totalFrames = Math.max(0, Math.ceil(tEnd / dt - 1e-9));

  // Lockstep frame alignment requires shared timing across scenarios.
  for (const def of definitions) {
    if (def.params.general.dt !== dt || def.params.general.t_end !== tEnd) {
      console.warn(
        '[useLockstepSimulations] all scenarios must share general.dt and general.t_end ' +
          'for lockstep frame alignment'
      );
    }
  }

  const enginesRef = useRef<SimulationEngine<EHTParams, EHTSimulationState>[]>([]);
  const historiesRef = useRef<Record<string, EHTSimulationState[]>>({});
  const statsRef = useRef<Record<string, Array<Record<string, number>>>>({});
  const animationFrameRef = useRef<number | null>(null);
  const seekTargetRef = useRef<number | null>(null);
  const frameIndexRef = useRef(0);
  const computedFramesRef = useRef(0);

  const [frameIndex, setFrameIndex] = useState(0);
  const [computedFrames, setComputedFrames] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCatchingUp, setIsCatchingUp] = useState(false);
  const [displayStates, setDisplayStates] = useState<Record<string, EHTSimulationState | null>>({});

  const computeFrame = useCallback(() => {
    for (let i = 0; i < definitions.length; i++) {
      const engine = enginesRef.current[i];
      if (!engine || engine.isComplete()) continue;

      engine.step();
      const cloned = cloneSimulationState(engine.getState());
      historiesRef.current[definitions[i].scenario.id].push(cloned);
      statsRef.current[definitions[i].scenario.id].push(computeStatsOf(cloned));
    }
    computedFramesRef.current += 1;
    setComputedFrames(computedFramesRef.current);
  }, [definitions]);

  const showFrame = useCallback((index: number) => {
    const states: Record<string, EHTSimulationState | null> = {};
    for (const def of definitions) {
      const history = historiesRef.current[def.scenario.id];
      states[def.scenario.id] = history?.[Math.min(index, history.length - 1)] ?? null;
    }
    frameIndexRef.current = index;
    setFrameIndex(index);
    setDisplayStates(states);
  }, [definitions]);

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
    const states: Record<string, EHTSimulationState | null> = {};

    definitions.forEach((def, i) => {
      const initial = cloneSimulationState(enginesRef.current[i].getState());
      histories[def.scenario.id] = [initial];
      stats[def.scenario.id] = [computeStatsOf(initial)];
      states[def.scenario.id] = initial;
    });

    historiesRef.current = histories;
    statsRef.current = stats;

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

  const firstId = definitions[0]?.scenario.id;
  const time = (firstId && displayStates[firstId]?.t) || frameIndex * dt;

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
    start,
    pause,
    step,
    reset,
    seekToFrame,
    seekToTime,
  };
}
