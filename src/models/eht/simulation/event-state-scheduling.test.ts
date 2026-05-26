import { describe, expect, it } from 'vitest';
import { StraightLineGeometry } from '@/core/math/basal-geometry';
import { SeededRandom } from '@/core/math/random';
import { LEGACY_DEFAULT_EHT_PARAMS } from '../params/defaults';
import { CellCyclePhase, type EHTParams, type EventDefinition } from '../params/types';
import { CellPhase, type CellState, type EHTSimulationState } from '../types';
import { initializeEventStates } from './cell';
import { processV2Events } from './events';

function makeEvent(id: string, overrides: Partial<EventDefinition> = {}): EventDefinition {
  return {
    id,
    type: 'parameter_change',
    start: 0,
    end: 10,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    target_parameter: 'R_soft',
    formula: 'old_value',
    ...overrides,
  } as EventDefinition;
}

function makeParams(events: EventDefinition[]): EHTParams {
  const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
  params.general.default_events = [];
  params.cell_types.control.events_v2 = events;
  params.cell_types.control.N_init = 1;
  return params;
}

function makeCell(eventStates: CellState['event_states']): CellState {
  return {
    id: 1,
    typeIndex: 'control',
    pos: { x: 0, y: 0 },
    A: { x: 0, y: 1 },
    B: { x: 0, y: -1 },
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
    division_time: 20,
    is_running: false,
    running_mode: 0,
    has_inm: false,
    time_A: Infinity,
    time_B: Infinity,
    time_S: Infinity,
    time_P: Infinity,
    time_AC: Infinity,
    stiffness_apical_apical: 1,
    stiffness_straightness: 1,
    stiffness_nuclei_apical: 1,
    stiffness_nuclei_basal: 1,
    k_apical_junction: 1,
    event_states: eventStates,
    has_reached_G2: false,
    has_reached_mitosis: false,
  };
}

function makeState(params: EHTParams, cell: CellState, t: number): EHTSimulationState {
  return {
    cells: [cell],
    ap_links: [],
    ba_links: [],
    t,
    step_count: 0,
    basalGeometry: new StraightLineGeometry(),
    rngSeed: 'test',
    params,
    global_event_states: {},
  };
}

describe('dependent event state scheduling', () => {
  it('marks dependent events pending when the prerequisite can participate', () => {
    const events = [
      makeEvent('downstream', { prereq: 'upstream' }),
      makeEvent('upstream', { start: 6, end: 12 }),
    ];

    const states = initializeEventStates(events, new SeededRandom('participating'));

    expect(states.upstream.trigger_time).toBeGreaterThanOrEqual(6);
    expect(states.upstream.trigger_time).toBeLessThanOrEqual(12);
    expect(states.downstream.pending_dependency).toBe(true);
    expect(states.downstream.trigger_time).toBe(Infinity);
  });

  it('skips dependent events when the prerequisite is skipped', () => {
    const events = [
      makeEvent('upstream', { probability: '0' }),
      makeEvent('downstream', { prereq: 'upstream', probability: '1' }),
    ];

    const states = initializeEventStates(events, new SeededRandom('skipped'));

    expect(states.upstream.trigger_time).toBe(Infinity);
    expect(states.downstream.pending_dependency).toBe(false);
    expect(states.downstream.trigger_time).toBe(Infinity);
  });

  it('stores independent periodic trigger_time as the active-window start', () => {
    const states = initializeEventStates([
      makeEvent('periodic', { start: 4, end: 10, period: 1 }),
    ], new SeededRandom('periodic'));

    expect(states.periodic.trigger_time).toBe(4);
    expect(states.periodic.pending_dependency).toBe(false);
  });

  it('samples a one-shot dependent event after the prerequisite fires', () => {
    const events = [
      makeEvent('downstream', {
        prereq: 'upstream',
        start: 0,
        end: 8,
        target_parameter: 'R_hard',
        formula: '3',
      }),
      makeEvent('upstream', {
        start: 8,
        end: 8,
        target_parameter: 'R_soft',
        formula: '2',
      }),
    ];
    const params = makeParams(events);
    const eventStates = initializeEventStates(events, new SeededRandom('chain'));
    const cell = makeCell(eventStates);
    const state = makeState(params, cell, 8);

    processV2Events(state, params, 0.1, new SeededRandom('step'));

    expect(cell.R_soft).toBe(2);
    expect(cell.R_hard).toBe(3);
    expect(cell.event_states?.upstream.has_fired).toBe(true);
    expect(cell.event_states?.downstream.has_fired).toBe(true);
    expect(cell.event_states?.downstream.trigger_time).toBe(8);
  });

  it('starts dependent periodic events after the prerequisite fires', () => {
    const events = [
      makeEvent('upstream', {
        start: 2,
        end: 2,
        target_parameter: 'R_soft',
        formula: '2',
      }),
      makeEvent('downstream_periodic', {
        prereq: 'upstream',
        end: 10,
        period: 1,
        target_parameter: 'R_hard',
        formula: 'old_value + 1',
      }),
    ];
    const params = makeParams(events);
    const cell = makeCell(initializeEventStates(events, new SeededRandom('periodic-chain')));
    const state = makeState(params, cell, 2);

    processV2Events(state, params, 0.1, new SeededRandom('step-1'));
    expect(cell.R_hard).toBe(2);
    expect(cell.event_states?.downstream_periodic.trigger_time).toBe(2);

    state.t = 2.5;
    processV2Events(state, params, 0.1, new SeededRandom('step-2'));
    expect(cell.R_hard).toBe(2);

    state.t = 3.1;
    processV2Events(state, params, 0.1, new SeededRandom('step-3'));
    expect(cell.R_hard).toBe(3);
  });

  it('uses the prerequisite fire time for phase-gated chains', () => {
    const events = [
      makeEvent('upstream', {
        start: 0,
        end: 0,
        cell_cycle_phase: CellCyclePhase.G2,
        target_parameter: 'R_soft',
        formula: '2',
      }),
      makeEvent('downstream', {
        prereq: 'upstream',
        end: 5,
        target_parameter: 'R_hard',
        formula: '3',
      }),
    ];
    const params = makeParams(events);
    const cell = makeCell(initializeEventStates(events, new SeededRandom('phase-chain')));
    const state = makeState(params, cell, 5);

    processV2Events(state, params, 0.1, new SeededRandom('before-g2'));
    expect(cell.R_hard).toBe(1);

    cell.phase = CellPhase.G2;
    cell.has_reached_G2 = true;
    processV2Events(state, params, 0.1, new SeededRandom('at-g2'));

    expect(cell.R_soft).toBe(2);
    expect(cell.R_hard).toBe(3);
    expect(cell.event_states?.downstream.trigger_time).toBe(5);
  });
});
