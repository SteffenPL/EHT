import { describe, expect, it } from 'vitest';
import { CircularGeometry, StraightLineGeometry } from '@/core/math/basal-geometry';
import { Vector2 } from '@/core/math/vector2';
import { createDefaultEHTParams } from '../params/defaults';
import { CellPhase, type CellState, type EHTSimulationState } from '../types';
import {
  advanceRunningBasalPoint,
  getRunningBasalSignedDistance,
  runningBasalCytoskeletonLength,
  shouldCellRun,
} from './running';

function makeCell(overrides: Partial<CellState> = {}): CellState {
  return {
    id: 1,
    typeIndex: 'control',
    pos: { x: 0, y: 1 },
    A: { x: 0, y: 2 },
    B: { x: 0, y: -3 },
    R_soft: 1,
    R_hard: 1,
    eta_A: 1,
    eta_B: 1,
    has_A: true,
    has_B: false,
    apical_cytos_strain: 0,
    basal_cytos_strain: 0,
    phase: CellPhase.G1,
    birth_time: 0,
    division_time: 10,
    is_running: false,
    running_mode: 1,
    has_inm: false,
    stiffness_apical_apical: 1,
    stiffness_straightness: 1,
    stiffness_nuclei_apical: 1,
    stiffness_nuclei_basal: 1,
    k_apical_junction: 1,
    event_states: {},
    has_reached_G2: false,
    has_reached_mitosis: false,
    ...overrides,
  };
}

function makeState(
  basalGeometry: EHTSimulationState['basalGeometry'] = new StraightLineGeometry()
): EHTSimulationState {
  const params = createDefaultEHTParams();
  params.general.full_circle = true;

  return {
    cells: [],
    ap_links: [],
    ba_links: [],
    t: 0,
    step_count: 0,
    basalGeometry,
    rngSeed: 'running-test',
    params,
    global_event_states: {},
  };
}

describe('running modes', () => {
  it('uses local basal signed distance scaled by R_soft to activate modes 1 and 2 after detachment', () => {
    const state = makeState();

    expect(shouldCellRun(makeCell({ running_mode: 1, B: { x: 0, y: -3 } }), state)).toBe(true);
    expect(shouldCellRun(makeCell({ running_mode: 2, B: { x: 0, y: -3 } }), state)).toBe(true);
    expect(shouldCellRun(makeCell({ running_mode: 1, B: { x: 0, y: -1 } }), state)).toBe(false);
    expect(shouldCellRun(makeCell({ running_mode: 2, B: { x: 0, y: -1 } }), state)).toBe(false);
    expect(shouldCellRun(makeCell({ running_mode: 1, R_soft: 4, B: { x: 0, y: -3 } }), state)).toBe(false);
    expect(shouldCellRun(makeCell({ running_mode: 1, R_soft: 4, B: { x: 0, y: -5 } }), state)).toBe(true);
  });

  it('computes activation distance from curved basal geometry', () => {
    const geometry = new CircularGeometry(0.1, 0.1);
    const state = makeState(geometry);
    const basalPoint = new Vector2(0, geometry.dir * geometry.radius);
    const normal = geometry.getNormal(basalPoint);
    const outsidePoint = basalPoint.add(normal.scale(-3));

    expect(getRunningBasalSignedDistance(state, outsidePoint)).toBeCloseTo(-3, 6);
    expect(shouldCellRun(makeCell({ running_mode: 1, B: outsidePoint.toObject() }), state)).toBe(true);
  });

  it('activates mode 3 immediately after basal detachment', () => {
    const state = makeState();

    expect(shouldCellRun(makeCell({ running_mode: 3, B: { x: 0, y: -1 } }), state)).toBe(true);
    expect(shouldCellRun(makeCell({ running_mode: 3, has_B: true }), state)).toBe(false);
    expect(shouldCellRun(makeCell({ running_mode: 0, B: { x: 0, y: -3 } }), state)).toBe(false);
  });

  it('advances running basal points in Cartesian direction from nucleus to basal point', () => {
    const cell = makeCell({
      pos: { x: 1, y: 2 },
      B: { x: 4, y: 6 },
      running_mode: 3,
      is_running: true,
    });

    advanceRunningBasalPoint(cell, 10);

    expect(cell.B.x).toBeCloseTo(10, 6);
    expect(cell.B.y).toBeCloseTo(14, 6);
  });

  it('computes retained basal cytoskeleton length in Cartesian coordinates', () => {
    const cell = makeCell({
      pos: { x: 1, y: 2 },
      B: { x: 4, y: 6 },
      R_soft: 1,
      running_mode: 2,
    });

    expect(runningBasalCytoskeletonLength(cell)).toBeCloseTo(4, 6);
  });
});
