import { useCallback, useEffect, useRef, useState } from 'react';
import {
  nowMs,
  type SimulationProfilerCollector,
  type SimulationProfilerSignalKey,
  type SimulationProfilerTimingKey,
} from '@/core/profiling/simulation-profiler';

export interface SimulationProfilerSnapshot {
  frameMs?: number;
  stepMs?: number;
  forcesMs?: number;
  formulaMs?: number;
  constraintsMs?: number;
  renderMs?: number;
  cloneMs?: number;
  cellCount?: number;
  stateHistoryLength?: number;
  formulaCacheSize?: number;
  updatedAtMs?: number;
}

export interface UseSimulationProfilerResult {
  collector: SimulationProfilerCollector | null;
  snapshot: SimulationProfilerSnapshot | null;
  recordRenderTiming?: (durationMs: number) => void;
}

type TimingBuckets = Record<SimulationProfilerTimingKey, number[]>;

const MAX_SAMPLES_PER_METRIC = 45;
const PUBLISH_INTERVAL_MS = 150;

const TIMING_FIELDS: Record<
  SimulationProfilerTimingKey,
  keyof SimulationProfilerSnapshot
> = {
  frame: 'frameMs',
  step: 'stepMs',
  forces: 'forcesMs',
  formula: 'formulaMs',
  constraints: 'constraintsMs',
  render: 'renderMs',
  clone: 'cloneMs',
};

const SIGNAL_FIELDS: Record<
  SimulationProfilerSignalKey,
  keyof SimulationProfilerSnapshot
> = {
  cellCount: 'cellCount',
  stateHistoryLength: 'stateHistoryLength',
  formulaCacheSize: 'formulaCacheSize',
};

function createTimingBuckets(): TimingBuckets {
  return {
    frame: [],
    step: [],
    forces: [],
    formula: [],
    constraints: [],
    render: [],
    clone: [],
  };
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function useSimulationProfiler(enabled: boolean): UseSimulationProfilerResult {
  const [snapshot, setSnapshot] = useState<SimulationProfilerSnapshot | null>(null);
  const enabledRef = useRef(enabled);
  const timingsRef = useRef<TimingBuckets>(createTimingBuckets());
  const signalsRef = useRef<Partial<SimulationProfilerSnapshot>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPublishAtRef = useRef(0);

  const publishSnapshot = useCallback(() => {
    timeoutRef.current = null;
    if (!enabledRef.current) return;

    const nextSnapshot: SimulationProfilerSnapshot = {
      ...signalsRef.current,
      updatedAtMs: nowMs(),
    };

    for (const [key, field] of Object.entries(TIMING_FIELDS) as Array<[
      SimulationProfilerTimingKey,
      keyof SimulationProfilerSnapshot,
    ]>) {
      const averagedValue = average(timingsRef.current[key]);
      if (averagedValue !== undefined) {
        nextSnapshot[field] = averagedValue;
      }
    }

    lastPublishAtRef.current = nextSnapshot.updatedAtMs ?? nowMs();
    setSnapshot(nextSnapshot);
  }, []);

  const schedulePublish = useCallback(() => {
    if (!enabledRef.current || timeoutRef.current !== null) return;

    const elapsedSincePublish = nowMs() - lastPublishAtRef.current;
    const delay = Math.max(0, PUBLISH_INTERVAL_MS - elapsedSincePublish);
    timeoutRef.current = setTimeout(publishSnapshot, delay);
  }, [publishSnapshot]);

  const collectorRef = useRef<SimulationProfilerCollector | null>(null);
  if (collectorRef.current === null) {
    collectorRef.current = {
      recordTiming: (key, durationMs) => {
        if (!enabledRef.current || !Number.isFinite(durationMs) || durationMs < 0) {
          return;
        }

        const values = timingsRef.current[key];
        values.push(durationMs);
        if (values.length > MAX_SAMPLES_PER_METRIC) {
          values.shift();
        }
        schedulePublish();
      },
      recordSignal: (key, value) => {
        if (!enabledRef.current || !Number.isFinite(value)) return;

        const field = SIGNAL_FIELDS[key];
        signalsRef.current[field] = value;
        schedulePublish();
      },
    };
  }

  const recordRenderTiming = useCallback((durationMs: number) => {
    collectorRef.current?.recordTiming('render', durationMs);
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timingsRef.current = createTimingBuckets();
    signalsRef.current = {};
    lastPublishAtRef.current = nowMs();
    setSnapshot(enabled ? { updatedAtMs: lastPublishAtRef.current } : null);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled]);

  return {
    collector: enabled ? collectorRef.current : null,
    snapshot: enabled ? snapshot : null,
    recordRenderTiming: enabled ? recordRenderTiming : undefined,
  };
}
