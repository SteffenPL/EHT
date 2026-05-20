import { describe, it, expect } from 'vitest';
import { processGlobalEvents } from './global-events';
import { performTimestep } from './step';
import { initializeEHTSimulation } from './init';
import { createInitialEHTState } from '../types';
import type { EHTParams } from '../params/types';
import { StraightLineGeometry } from '@/core/math/basal-geometry';
import { LEGACY_DEFAULT_EHT_PARAMS } from '../params/defaults';
import { computeEllipseFromPerimeter } from '../params/geometry';
import { SeededRandom } from '@/core/math/random';
import { Vector2 } from '@/core/math/vector2';
import type { EHTSimulationState } from '../types';

function makeTestState(t: number, params?: EHTParams): EHTSimulationState {
  const p = params ?? structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
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
    expect(state.params!.general.perimeter).toBe(LEGACY_DEFAULT_EHT_PARAMS.general.perimeter);
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
    expect(state.params!.general.perimeter).toBe(LEGACY_DEFAULT_EHT_PARAMS.general.perimeter);
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

  it('provides init_value variable when present on event', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'with_init',
      start: 0,
      end: 100,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'init_value * 0.5 + t',
      init_value: 200,
    }];
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(200 * 0.5 + 5);
  });
});

describe('integration: geometry change during simulation', () => {
  it('shrinks perimeter mid-simulation via global event', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    params.general.global_events = [{
      id: 'shrink_at_t2',
      start: 1.5,
      end: 2.5,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'old_value * 0.8',
    }];

    // Initialize
    const state = createInitialEHTState();
    const rng = new SeededRandom('test');
    initializeEHTSimulation(params, state, rng);

    const originalPerimeter = state.params!.general.perimeter;
    const originalGeom = computeEllipseFromPerimeter(
      originalPerimeter, params.general.aspect_ratio
    );

    // Step before event window — perimeter unchanged
    state.t = 1.0;
    performTimestep(state, params, new SeededRandom('step_1'));
    expect(state.params!.general.perimeter).toBe(originalPerimeter);
    expect(state.geometry!.curvature_1).toBeCloseTo(originalGeom.curvature_1, 6);

    // Step into event window — event fires
    state.t = 2.0;
    performTimestep(state, params, new SeededRandom('step_2'));

    // Perimeter should have changed
    expect(state.params!.general.perimeter).toBeCloseTo(originalPerimeter * 0.8);

    // Geometry should have been rebuilt with new curvatures
    const expectedGeom = computeEllipseFromPerimeter(
      originalPerimeter * 0.8, params.general.aspect_ratio
    );
    expect(state.geometry!.curvature_1).toBeCloseTo(expectedGeom.curvature_1, 6);

    // All basal points should be on the new curve
    for (const cell of state.cells) {
      const B = new Vector2(cell.B.x, cell.B.y);
      const projected = state.basalGeometry.projectPoint(B);
      expect(cell.B.x).toBeCloseTo(projected.x, 4);
      expect(cell.B.y).toBeCloseTo(projected.y, 4);
    }
  });
});
