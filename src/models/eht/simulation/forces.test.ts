import { describe, it, expect, vi } from 'vitest';
import { calcExternalForces, zeroForces, CellForces } from './forces';
import { evaluateExternalForceAtPosition } from './external-force-formula';
import { createDefaultEHTParams } from '../params/defaults';
import { StraightLineGeometry, CircularGeometry, EllipticalGeometry } from '@/core/math/basal-geometry';
import { Vector2 } from '@/core/math/vector2';
import type { EHTSimulationState, CellState } from '../types';
import { CellPhase } from '../types';

/** Create a minimal cell state at given position */
function makeCell(x: number, y: number, typeIndex: string): CellState {
  return {
    id: 0,
    typeIndex,
    pos: { x, y },
    A: { x, y: y + 2 },
    B: { x, y: y - 2 },
    R_hard: 0.4,
    R_soft: 1.2,
    eta_A: 1,
    eta_B: 1,
    has_A: true,
    has_B: true,
    apical_cytos_strain: 0,
    basal_cytos_strain: 0,
    phase: CellPhase.G1,
    birth_time: 0,
    division_time: 10,
    is_running: false,
    running_mode: 0,
    has_inm: false,
    stiffness_apical_apical: 2,
    stiffness_straightness: 5,
    stiffness_nuclei_apical: 3,
    stiffness_nuclei_basal: 2,
    k_apical_junction: 5,
    event_states: {},
    has_reached_G2: false,
    has_reached_mitosis: false,
  };
}

/** Create minimal state with given cells and geometry */
function makeState(cells: CellState[], geometry: 'line' | 'circle' = 'circle'): EHTSimulationState {
  const basalGeometry = geometry === 'line'
    ? new StraightLineGeometry()
    : new CircularGeometry(0.06, 0.06);

  return {
    cells,
    ap_links: [],
    ba_links: [],
    t: 1.0,
    step_count: 0,
    basalGeometry,
    geometry: { curvature_1: 0.06, curvature_2: 0.06 },
    rngSeed: 'test',
    global_event_states: {},
  };
}

describe('calcExternalForces', () => {
  it('applies no force when external_force is "0"', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '0';

    const cell = makeCell(0, -10, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    expect(forces[0].f.x).toBe(0);
    expect(forces[0].f.y).toBe(0);
  });

  it('applies auto-wrapped scalar formula as convergent tangential force', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '10';

    // Cell at alpha = pi/2 (right side of circle, center at origin)
    const cell = makeCell(5, 0, 'control'); // x=5, y=0 → alpha=pi/2
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // Cell at right side: geometry N=(-1,0), T=(0,-1)
    // Auto-wrap: -(10)*sign(pi/2)*T = -10*(0,-1) = (0, 10)
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(10, 5);
  });

  it('uses vector formula as-is when T or N present', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '5 * N';

    // Cell directly below center: alpha=0, N=(0,1) pointing into tissue
    const cell = makeCell(0, -5, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // At alpha=0: N=(-sin(0), cos(0)) = (0, 1), so 5*N = (0, 5)
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(5, 5);
  });

  it('produces zero force at alpha=0 with auto-wrapped scalar (sign(0)=0)', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '10';

    // Cell directly below center: alpha=0
    const cell = makeCell(0, -5, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // sign(0)=0, so force is zero
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(0, 5);
  });

  it('handles invalid formula gracefully (NaN force + warning)', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = 'invalid_func()';

    const cell = makeCell(0, 0, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    calcExternalForces(state, params, forces);

    expect(forces[0].f.x).toBeNaN();
    expect(forces[0].f.y).toBeNaN();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('handles r=0 (cell at geometry center) with vector formula', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '5 * N';

    // Cell exactly at geometry center (origin): r=0, alpha=atan2(0,0)=0
    const cell = makeCell(0, 0, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // At r=0: projection is degenerate (zero vector), N and T are NaN
    // resultToVector2 returns zero for NaN matrix results
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(0, 5);
  });

  it('converges from negative alpha (left side) toward bottom', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '10';

    // Cell at alpha = -pi/2 (left side): x=-5, y=0
    const cell = makeCell(-5, 0, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // Cell at left side: geometry N=(1,0), T=(0,1)
    // Auto-wrap: -(10)*sign(-pi/2)*T = -(10)*(-1)*(0,1) = (0, 10)
    // Both sides converge upward toward top of circle
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(10, 5);
  });

  it('exposes time variable t in formula scope', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = 't * N';

    const cell = makeCell(0, -5, 'control');
    const state = makeState([cell]);
    state.t = 3.0;
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // At alpha=0: N=(0,1), t=3, so force = 3*(0,1) = (0,3)
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(3, 5);
  });

  it('matches the shared evaluator on elliptical geometry', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '5 * T + 3 * N + t * matrix([0.25, -0.5])';

    const cell = makeCell(12, -8, 'control');
    const state = makeState([cell]);
    state.basalGeometry = new EllipticalGeometry(1 / 70, 1 / 42, 360);
    state.geometry = { curvature_1: 1 / 70, curvature_2: 1 / 42 };
    state.t = 2;
    const forces: CellForces[] = [zeroForces()];

    const expected = evaluateExternalForceAtPosition({
      formula: params.cell_types.control.external_force,
      position: Vector2.from(cell.pos),
      basalGeometry: state.basalGeometry,
      t: state.t,
      constants: params.constants,
    }).force;

    calcExternalForces(state, params, forces);

    expect(forces[0].f.x).toBeCloseTo(expected.x, 5);
    expect(forces[0].f.y).toBeCloseTo(expected.y, 5);
  });
});
