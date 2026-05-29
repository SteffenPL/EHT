export type SimulationProfilerTimingKey =
  | 'frame'
  | 'step'
  | 'forces'
  | 'formula'
  | 'constraints'
  | 'render'
  | 'clone';

export type SimulationProfilerSignalKey =
  | 'cellCount'
  | 'stateHistoryLength'
  | 'formulaCacheSize';

export interface SimulationProfilerCollector {
  recordTiming: (key: SimulationProfilerTimingKey, durationMs: number) => void;
  recordSignal: (key: SimulationProfilerSignalKey, value: number) => void;
}

let activeCollector: SimulationProfilerCollector | null = null;

export function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function getActiveSimulationProfiler(): SimulationProfilerCollector | null {
  return activeCollector;
}

export function withActiveSimulationProfiler<T>(
  collector: SimulationProfilerCollector | null | undefined,
  callback: () => T
): T {
  const previousCollector = activeCollector;
  activeCollector = collector ?? null;

  try {
    return callback();
  } finally {
    activeCollector = previousCollector;
  }
}
