import { describe, it, expect } from 'vitest';
import { rebuildGeometryIfNeeded } from './rebuild-geometry';
import type { EHTSimulationState } from '../types';
import type { EHTParams } from '../params/types';
import { createBasalGeometry } from '@/core/math';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import { computeEllipseFromPerimeter } from '../params/geometry';

function makeCell(x: number, y: number) {
  return {
    id: 0,
    typeIndex: 'control',
    pos: { x, y: y + 1 },
    A: { x, y: y + 2 },
    B: { x, y },
    vel: { x: 0, y: 0 },
    age: 0,
    t_birth: 0,
    has_A: true,
    has_B: true,
    has_divided: false,
    running: false,
    apical_constriction: false,
    stiffness_nuclei_apical: 1,
    stiffness_nuclei_basal: 1,
    k_apical_junction: 1,
    event_states: {},
    has_reached_G2: false,
    has_reached_mitosis: false,
  };
}

function makeGeometryState(params: EHTParams): EHTSimulationState {
  const geom = computeEllipseFromPerimeter(
    params.general.perimeter,
    params.general.aspect_ratio
  );
  const basalGeometry = createBasalGeometry(geom.curvature_1, geom.curvature_2, 360);

  // Place a cell on the curve
  const point = basalGeometry.getPointAtArcLength(0);
  const cell = makeCell(point.x, point.y);

  return {
    cells: [cell],
    ap_links: [],
    ba_links: [],
    t: 5,
    step_count: 0,
    basalGeometry,
    geometry: { curvature_1: geom.curvature_1, curvature_2: geom.curvature_2 },
    rngSeed: 'test',
    params: structuredClone(params),
    global_event_states: {},
  };
}

describe('rebuildGeometryIfNeeded', () => {
  it('does nothing when params match current geometry', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);
    const oldPerimeter = state.basalGeometry.perimeter;
    rebuildGeometryIfNeeded(state);
    expect(state.basalGeometry.perimeter).toBe(oldPerimeter);
  });

  it('rebuilds when perimeter changes', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);
    const oldPerimeter = state.basalGeometry.perimeter;

    // Simulate a global event having changed the perimeter
    state.params!.general.perimeter = DEFAULT_EHT_PARAMS.general.perimeter - 20;
    rebuildGeometryIfNeeded(state);

    expect(state.basalGeometry.perimeter).not.toBe(oldPerimeter);
    expect(state.geometry!.curvature_1).not.toBe(
      computeEllipseFromPerimeter(DEFAULT_EHT_PARAMS.general.perimeter, DEFAULT_EHT_PARAMS.general.aspect_ratio).curvature_1
    );
  });

  it('rebuilds when aspect_ratio changes', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);

    state.params!.general.aspect_ratio = 0.5;
    rebuildGeometryIfNeeded(state);

    const expected = computeEllipseFromPerimeter(
      DEFAULT_EHT_PARAMS.general.perimeter, 0.5
    );
    expect(state.geometry!.curvature_1).toBeCloseTo(expected.curvature_1, 6);
    expect(state.geometry!.curvature_2).toBeCloseTo(expected.curvature_2, 6);
  });

  it('re-projects cell basal points onto new curve', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);
    const oldB = { ...state.cells[0].B };

    // Change perimeter significantly
    state.params!.general.perimeter = DEFAULT_EHT_PARAMS.general.perimeter * 0.5;
    rebuildGeometryIfNeeded(state);

    // Basal point should have moved (re-projected onto smaller curve)
    const newB = state.cells[0].B;
    const moved = Math.hypot(newB.x - oldB.x, newB.y - oldB.y);
    expect(moved).toBeGreaterThan(0.01);
  });

  it('does not modify apical or nucleus positions', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);
    const oldA = { ...state.cells[0].A };
    const oldPos = { ...state.cells[0].pos };

    state.params!.general.perimeter = DEFAULT_EHT_PARAMS.general.perimeter * 0.5;
    rebuildGeometryIfNeeded(state);

    expect(state.cells[0].A.x).toBe(oldA.x);
    expect(state.cells[0].A.y).toBe(oldA.y);
    expect(state.cells[0].pos.x).toBe(oldPos.x);
    expect(state.cells[0].pos.y).toBe(oldPos.y);
  });
});
