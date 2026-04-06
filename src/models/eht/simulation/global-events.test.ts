import { describe, it, expect } from 'vitest';
import { processGlobalEvents } from './global-events';
import type { EHTParams } from '../params/types';
import { StraightLineGeometry } from '@/core/math/basal-geometry';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import type { EHTSimulationState } from '../types';

function makeTestState(t: number, params?: EHTParams): EHTSimulationState {
  const p = params ?? structuredClone(DEFAULT_EHT_PARAMS);
  return {
    cells: [],
    ap_links: [],
    ba_links: [],
    t,
    step_count: 0,
    basalGeometry: new StraightLineGeometry(),
    geometry: { curvature_1: 0, curvature_2: 0 },
    rngSeed: 'test',
    params: p,
    global_event_states: {},
  };
}

describe('processGlobalEvents', () => {
  it('does nothing when global_events is empty', () => {
    const state = makeTestState(10);
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(DEFAULT_EHT_PARAMS.general.perimeter);
  });

  it('fires a one-time event within time window', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'shrink',
      start: 4,
      end: 6,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'old_value - 10',
    }];
    const originalPerimeter = state.params!.general.perimeter;
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(originalPerimeter - 10);
    expect(state.global_event_states['shrink'].fire_count).toBe(1);
  });

  it('does not fire a one-time event twice', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'shrink',
      start: 4,
      end: 6,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'old_value - 10',
    }];
    processGlobalEvents(state, 0.1);
    const afterFirst = state.params!.general.perimeter;
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(afterFirst);
  });

  it('does not fire outside time window', () => {
    const state = makeTestState(1);
    state.params!.general.global_events = [{
      id: 'shrink',
      start: 4,
      end: 6,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'old_value - 10',
    }];
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(DEFAULT_EHT_PARAMS.general.perimeter);
  });

  it('fires periodic events respecting period interval', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'gradual_shrink',
      start: 4,
      end: 100,
      period: 1.0,
      target_parameter: 'general.perimeter',
      formula: 'old_value - 1',
    }];
    const original = state.params!.general.perimeter;

    // First call: fires (no previous fire)
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(original - 1);

    // Second call at same time: does not fire (period not elapsed)
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(original - 1);

    // Advance time past period
    state.t = 6.1;
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(original - 2);
  });

  it('provides t and dt variables to formula', () => {
    const state = makeTestState(10);
    state.params!.general.global_events = [{
      id: 'time_based',
      start: 0,
      end: 100,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 't * 2 + dt',
    }];
    processGlobalEvents(state, 0.5);
    expect(state.params!.general.perimeter).toBe(10 * 2 + 0.5);
  });

  it('updates nested parameter via dot-notation', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'change_aspect',
      start: 4,
      end: 6,
      period: 0,
      target_parameter: 'general.aspect_ratio',
      formula: '0.5',
    }];
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.aspect_ratio).toBe(0.5);
  });
});
