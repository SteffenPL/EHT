import { describe, expect, it } from 'vitest';
import { StraightLineGeometry } from '@/core/math/basal-geometry';
import { SeededRandom } from '@/core/math/random';
import { LEGACY_DEFAULT_EHT_PARAMS } from '../params/defaults';
import { CellCyclePhase, type EHTParams, type EventDefinition } from '../params/types';
import { CellPhase, type CellState, type EHTSimulationState } from '../types';
import { divideSingleCell } from './division';
import { processV2Events } from './events';

function makeCell(overrides: Partial<CellState> = {}): CellState {
  return {
    id: 1,
    typeIndex: 'control',
    pos: { x: 0, y: 1 },
    A: { x: 0, y: 2 },
    B: { x: 0, y: 0 },
    R_soft: 1,
    R_hard: 1,
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

function makeState(params: EHTParams, cell: CellState): EHTSimulationState {
  return {
    cells: [cell],
    ap_links: [],
    ba_links: [],
    t: 0,
    step_count: 0,
    basalGeometry: new StraightLineGeometry(),
    rngSeed: 'adhesion-inheritance',
    params,
    global_event_states: {},
  };
}

function cloneParams(): EHTParams {
  const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
  params.general.default_events = [];
  params.general.p_div_out = 0;
  return params;
}

describe('adhesion inheritance', () => {
  it('does not recreate apical or basal links when a detached cell divides', () => {
    const params = cloneParams();
    const cell = makeCell({
      has_A: false,
      has_B: false,
      running_mode: 3,
      has_inm: true,
      stiffness_straightness: 0.42,
      stiffness_nuclei_apical: 0.1,
      stiffness_nuclei_basal: 0.1,
    });
    const state = makeState(params, cell);

    divideSingleCell(state, params, new SeededRandom('division-detached'), 0);

    expect(state.cells).toHaveLength(2);
    expect(state.cells.every(daughter => daughter.has_A === false)).toBe(true);
    expect(state.cells.every(daughter => daughter.has_B === false)).toBe(true);
    expect(state.cells.every(daughter => daughter.running_mode === 3)).toBe(true);
    expect(state.cells.every(daughter => daughter.has_inm)).toBe(true);
    expect(state.cells.every(daughter => daughter.stiffness_straightness === 0.42)).toBe(true);
    expect(state.ap_links).toHaveLength(0);
    expect(state.ba_links).toHaveLength(0);
  });

  it('keeps daughter links for attached cells', () => {
    const params = cloneParams();
    const state = makeState(params, makeCell());

    divideSingleCell(state, params, new SeededRandom('division-attached'), 0);

    expect(state.cells).toHaveLength(2);
    expect(state.cells.every(daughter => daughter.has_A)).toBe(true);
    expect(state.cells.every(daughter => daughter.has_B)).toBe(true);
    expect(state.ap_links).toHaveLength(1);
    expect(state.ba_links).toHaveLength(1);
  });

  it('preserves lost adhesions when resetting the cell cycle', () => {
    const resetEvent: EventDefinition = {
      id: 'reset',
      type: 'special',
      special_name: 'cell_cycle_reset',
      start: 0,
      end: 0,
      period: 0,
      probability: '1',
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Any,
    };
    const params = cloneParams();
    params.cell_types.control.events_v2 = [resetEvent];

    const cell = makeCell({
      has_A: false,
      has_B: false,
      running_mode: 3,
      has_inm: true,
      stiffness_straightness: 0.42,
      stiffness_nuclei_apical: 0.25,
      stiffness_nuclei_basal: 0.35,
      event_states: {
        reset: {
          event_id: 'reset',
          trigger_time: 0,
          pending_dependency: false,
          has_fired: false,
          last_fire_time: -Infinity,
          fire_count: 0,
        },
      },
    });
    const state = makeState(params, cell);

    processV2Events(state, params, 0.1, new SeededRandom('reset-detached'));

    expect(state.cells).toHaveLength(1);
    expect(state.cells[0].has_A).toBe(false);
    expect(state.cells[0].has_B).toBe(false);
    expect(state.cells[0].running_mode).toBe(3);
    expect(state.cells[0].has_inm).toBe(true);
    expect(state.cells[0].stiffness_straightness).toBe(0.42);
    expect(state.cells[0].stiffness_nuclei_apical).toBe(0.25);
    expect(state.cells[0].stiffness_nuclei_basal).toBe(0.35);
  });

  it('keeps fired adhesion prerequisites after a cycle reset', () => {
    const resetEvent: EventDefinition = {
      id: 'reset',
      type: 'special',
      special_name: 'cell_cycle_reset',
      start: 0,
      end: 0,
      period: 0,
      probability: '1',
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Division,
    };
    const loseApical: EventDefinition = {
      id: 'lose_apical',
      type: 'special',
      special_name: 'lose_apical_adhesion',
      start: 6,
      end: 24,
      period: 0,
      probability: '1',
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Any,
    };
    const loseBasal: EventDefinition = {
      id: 'lose_basal',
      type: 'special',
      special_name: 'lose_basal_adhesion',
      start: 6,
      end: 40,
      period: 0,
      probability: '1',
      prereq: 'lose_apical',
      cell_cycle_phase: CellCyclePhase.Any,
    };
    const params = cloneParams();
    params.cell_types.control.events_v2 = [resetEvent, loseApical, loseBasal];

    const cell = makeCell({
      has_A: false,
      phase: CellPhase.Division,
      event_states: {
        reset: {
          event_id: 'reset',
          trigger_time: 0,
          pending_dependency: false,
          has_fired: false,
          last_fire_time: -Infinity,
          fire_count: 0,
        },
        lose_apical: {
          event_id: 'lose_apical',
          trigger_time: 8,
          pending_dependency: false,
          has_fired: true,
          last_fire_time: 8,
          fire_count: 1,
        },
        lose_basal: {
          event_id: 'lose_basal',
          trigger_time: 14,
          pending_dependency: false,
          has_fired: false,
          last_fire_time: -Infinity,
          fire_count: 0,
        },
      },
    });
    const state = makeState(params, cell);

    processV2Events(state, params, 0.1, new SeededRandom('reset-prereq'));

    expect(state.cells[0].event_states?.lose_apical.has_fired).toBe(true);
    expect(state.cells[0].event_states?.lose_apical.last_fire_time).toBe(8);
    expect(state.cells[0].event_states?.lose_basal.pending_dependency).toBe(false);
    expect(state.cells[0].event_states?.lose_basal.trigger_time).toBe(14);
  });
});
