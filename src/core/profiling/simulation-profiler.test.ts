import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveSimulationProfiler,
  withActiveSimulationProfiler,
  type SimulationProfilerCollector,
} from './simulation-profiler';

describe('simulation profiler activation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets and clears the active collector around a callback', () => {
    const collector: SimulationProfilerCollector = {
      recordTiming: vi.fn(),
      recordSignal: vi.fn(),
    };

    withActiveSimulationProfiler(collector, () => {
      expect(getActiveSimulationProfiler()).toBe(collector);
    });

    expect(getActiveSimulationProfiler()).toBeNull();
    expect(collector.recordTiming).not.toHaveBeenCalled();
    expect(collector.recordSignal).not.toHaveBeenCalled();
  });

  it('restores nested collectors', () => {
    const outer: SimulationProfilerCollector = {
      recordTiming: vi.fn(),
      recordSignal: vi.fn(),
    };
    const inner: SimulationProfilerCollector = {
      recordTiming: vi.fn(),
      recordSignal: vi.fn(),
    };

    withActiveSimulationProfiler(outer, () => {
      withActiveSimulationProfiler(inner, () => {
        expect(getActiveSimulationProfiler()).toBe(inner);
      });
      expect(getActiveSimulationProfiler()).toBe(outer);
    });

    expect(getActiveSimulationProfiler()).toBeNull();
  });
});
