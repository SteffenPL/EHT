/**
 * EHT model cell creation and management.
 * Manages cell state creation and initialization.
 */

import { Vector2 } from '@/core/math/vector2';
import { SeededRandom } from '@/core/math/random';
import { evaluate } from 'mathjs';
import type { EHTSimulationState, CellState, CellEventState } from '../types';
import { CellPhase } from '../types';
import type { EHTParams, EHTCellTypeParams, EventDefinition, EHTGeneralParams } from '../params/types';
import { formulaFunctions } from './formula-functions';
import { CellCyclePhase } from '../params/types';
import { analyzeEventDependencies } from '../params/event-dependencies';

/**
 * Evaluate a probability formula string.
 * Returns a number between 0 and 1. Falls back to parsing as plain number.
 */
export function evaluateProbabilityFormula(
  formula: string,
  generalParams?: EHTGeneralParams,
  cellTypeParams?: EHTCellTypeParams,
  constants?: Record<string, number>
): number {
  try {
    const scope: Record<string, unknown> = {
      ...formulaFunctions,
      ...(constants ?? {}),
    };
    if (generalParams) {
      scope.p_div_out = generalParams.p_div_out;
      scope.mu = generalParams.mu;
      scope.h_init = generalParams.h_init;
      scope.w_init = generalParams.w_init;
      scope.t_end = generalParams.t_end;
    }
    if (cellTypeParams) {
      scope.INM = cellTypeParams.INM;
    }
    const result = evaluate(formula, scope);
    return typeof result === 'number' ? result : Number(result);
  } catch {
    // Fallback: try parsing as plain number
    const num = Number(formula);
    return isNaN(num) ? 1 : num;
  }
}

function eventCanParticipate(
  state: CellEventState | undefined
): boolean {
  return state !== undefined && (state.pending_dependency === true || isFinite(state.trigger_time));
}

function createSkippedEventState(event: EventDefinition): CellEventState {
  return {
    event_id: event.id,
    trigger_time: Infinity,
    pending_dependency: false,
    has_fired: false,
    last_fire_time: -Infinity,
    fire_count: 0,
  };
}

function createPendingEventState(event: EventDefinition): CellEventState {
  return {
    event_id: event.id,
    trigger_time: Infinity,
    pending_dependency: true,
    has_fired: false,
    last_fire_time: -Infinity,
    fire_count: 0,
  };
}

function sampleIndependentEventState(
  event: EventDefinition,
  rng: SeededRandom,
  generalParams?: EHTGeneralParams,
  cellTypeParams?: EHTCellTypeParams,
  constants?: Record<string, number>
): CellEventState {
  const prob = evaluateProbabilityFormula(event.probability, generalParams, cellTypeParams, constants);
  const shouldTrigger = rng.random() <= prob;

  if (!shouldTrigger || event.end === -1) {
    return createSkippedEventState(event);
  }

  let triggerTime: number;
  if (event.period !== 0) {
    // Periodic event: trigger_time stores the active-window start.
    triggerTime = event.start;
  } else if (isFinite(event.end)) {
    triggerTime = rng.random(event.start, event.end);
  } else {
    // Infinite end = always applicable from start time
    triggerTime = event.start;
  }

  return {
    event_id: event.id,
    trigger_time: triggerTime,
    pending_dependency: false,
    has_fired: false,
    last_fire_time: -Infinity,
    fire_count: 0,
  };
}

/**
 * Get the effective event list for a cell type by merging default events
 * with per-type events. Default events filtered by skip_default_events.
 * Per-type events with same ID as a default take precedence.
 */
export function getEffectiveEvents(
  general: EHTGeneralParams,
  cellType: EHTCellTypeParams
): EventDefinition[] {
  const defaultEvents = general.default_events ?? [];
  const skipSet = new Set(cellType.skip_default_events ?? []);
  const perTypeEvents = cellType.events_v2 ?? [];

  // Per-type event IDs take precedence over defaults
  const perTypeIds = new Set(perTypeEvents.map(e => e.id));

  // Filter default events: not skipped and not overridden by per-type
  const filteredDefaults = defaultEvents.filter(
    e => !skipSet.has(e.id) && !perTypeIds.has(e.id)
  );

  return [...filteredDefaults, ...perTypeEvents];
}

/** Input for creating a new cell with pre-computed positions */
export interface CreateCellInput {
  basalPoint: Vector2;
  apicalPoint: Vector2;
  nucleusPosition: Vector2;
}

/**
 * Initialize event states for the v1.1.0 event system.
 * Samples trigger times for each event based on probability.
 */
export function initializeEventStates(
  events: EventDefinition[] | undefined,
  rng: SeededRandom,
  generalParams?: EHTGeneralParams,
  cellTypeParams?: EHTCellTypeParams,
  constants?: Record<string, number>
): Record<string, CellEventState> {
  const eventStates: Record<string, CellEventState> = {};

  if (!events || events.length === 0) {
    return eventStates;
  }

  const { orderedEvents, hasErrors } = analyzeEventDependencies(events);
  const eventsToInitialize = hasErrors ? events : orderedEvents;

  for (const event of eventsToInitialize) {
    if (event.prereq) {
      const prereqState = eventStates[event.prereq];
      eventStates[event.id] = eventCanParticipate(prereqState)
        ? createPendingEventState(event)
        : createSkippedEventState(event);
    } else {
      eventStates[event.id] = sampleIndependentEventState(event, rng, generalParams, cellTypeParams, constants);
    }
  }

  return eventStates;
}

/**
 * Copy event states from parent cell for cell division (v1.1.0).
 * Preserves has_fired status and trigger times from parent.
 */
export function copyEventStates(
  parentEventStates: Record<string, CellEventState> | undefined
): Record<string, CellEventState> | undefined {
  if (!parentEventStates) {
    return undefined;
  }

  const copied: Record<string, CellEventState> = {};
  for (const [id, state] of Object.entries(parentEventStates)) {
    copied[id] = { ...state };
  }
  return copied;
}

/**
 * Inherit event states from a parent cell for division or cell cycle reset.
 * Periodic events without dependencies inherit participation, reset firing counters.
 * Dependent events wait for their prerequisite to fire before sampling.
 * Independent one-time events re-sample fresh via probability.
 */
export function inheritEventStates(
  parentStates: Record<string, CellEventState>,
  events: EventDefinition[],
  rng: SeededRandom,
  generalParams?: EHTGeneralParams,
  cellTypeParams?: EHTCellTypeParams,
  constants?: Record<string, number>
): Record<string, CellEventState> {
  const result: Record<string, CellEventState> = {};

  const { orderedEvents, hasErrors } = analyzeEventDependencies(events);
  const eventsToInitialize = hasErrors ? events : orderedEvents;

  for (const event of eventsToInitialize) {
    const parentState = parentStates[event.id];

    if (event.prereq) {
      const prereqState = result[event.prereq] ?? parentStates[event.prereq];
      result[event.id] = eventCanParticipate(prereqState)
        ? createPendingEventState(event)
        : createSkippedEventState(event);
    } else if (event.period !== 0 && parentState) {
      // Periodic: inherit participation decision, reset counters
      result[event.id] = {
        event_id: event.id,
        trigger_time: parentState.trigger_time,
        pending_dependency: false,
        has_fired: false,
        last_fire_time: -Infinity,
        fire_count: 0,
      };
    } else {
      // One-time or new event without parent state: sample fresh
      result[event.id] = sampleIndependentEventState(event, rng, generalParams, cellTypeParams, constants);
    }
  }

  return result;
}

/**
 * Create a new EHT cell state.
 *
 * @param params - Simulation parameters
 * @param state - Current simulation state (for time reference)
 * @param rng - Seeded random number generator
 * @param input - Pre-computed positions (basal, apical, nucleus)
 * @param cellType - Cell type parameters
 * @param typeKey - Key in cell_types map (used as typeIndex)
 * @param parent - Parent cell (for cell division)
 * @returns New cell state
 */
export function createCell(
  params: EHTParams,
  state: EHTSimulationState,
  rng: SeededRandom,
  input: CreateCellInput,
  cellType: EHTCellTypeParams,
  typeKey: string,
  parent?: CellState
): CellState {
  const { basalPoint, apicalPoint, nucleusPosition } = input;
  const h = params.general.h_init;

  // Determine lifespan
  const maxAge = rng.random(cellType.lifespan_start, cellType.lifespan_end);

  // Generate unique ID
  const id = state.cells.length > 0
    ? Math.max(...state.cells.map(c => c.id)) + 1
    : 0;

  // Check if using v1.1.0+ event system (including default events)
  const effectiveEvents = getEffectiveEvents(params.general, cellType);
  const useV2Events = effectiveEvents.length > 0;

  if (parent === undefined) {
    // New cell (not from division)
    const birthTime = state.t - rng.random(0, maxAge);

    // Initialize v1.1.0+ event states if available (using effective events)
    const event_states = useV2Events
      ? initializeEventStates(effectiveEvents, rng, params.general, cellType, params.constants)
      : undefined;

    return {
      id,
      typeIndex: typeKey,
      pos: nucleusPosition.toObject(),
      A: apicalPoint.toObject(),
      B: basalPoint.toObject(),
      R_soft: cellType.R_soft,
      R_hard: cellType.R_hard,
      eta_A: h / 2,
      eta_B: h / 2,
      has_A: true,
      has_B: true,
      apical_cytos_strain: cellType.apical_cytos_strain_init ?? 0,
      basal_cytos_strain: cellType.basal_cytos_strain_init ?? 0,
      phase: CellPhase.G1,
      birth_time: birthTime,
      division_time: birthTime + maxAge,
      is_running: false,
      running_mode: cellType.running_mode,
      has_inm: rng.random() <= cellType.INM,
      stiffness_apical_apical: cellType.stiffness_apical_apical,
      stiffness_straightness: cellType.stiffness_straightness,
      stiffness_nuclei_apical: cellType.stiffness_nuclei_apical,
      stiffness_nuclei_basal: cellType.stiffness_nuclei_basal,
      k_apical_junction: cellType.k_apical_junction,
      // v1.1.0 event system
      event_states,
      has_reached_G2: false,
      has_reached_mitosis: false,
    };
  } else {
    // Cell from division - inherit properties from parent
    return {
      id,
      typeIndex: typeKey,
      pos: nucleusPosition.toObject(),
      A: apicalPoint.toObject(),
      B: basalPoint.toObject(),
      R_soft: cellType.R_soft,
      R_hard: cellType.R_hard,
      eta_A: parent.eta_A,
      eta_B: parent.eta_B,
      has_A: parent.has_A,
      has_B: parent.has_B,
      apical_cytos_strain: cellType.apical_cytos_strain_init ?? 0,
      basal_cytos_strain: cellType.basal_cytos_strain_init ?? 0,
      phase: CellPhase.G1,
      birth_time: state.t,
      division_time: state.t + maxAge,
      is_running: parent.is_running,
      running_mode: parent.running_mode,
      has_inm: parent.has_inm,
      stiffness_apical_apical: cellType.stiffness_apical_apical,
      stiffness_straightness: parent.stiffness_straightness,
      stiffness_nuclei_apical: parent.stiffness_nuclei_apical,
      stiffness_nuclei_basal: parent.stiffness_nuclei_basal,
      k_apical_junction: cellType.k_apical_junction,
      // v1.1.0 event system - inherit periodic participation, re-sample one-time
      event_states: useV2Events
        ? inheritEventStates(parent.event_states!, effectiveEvents, rng, params.general, cellType, params.constants)
        : copyEventStates(parent.event_states),
      has_reached_G2: false,
      has_reached_mitosis: false,
    };
  }
}

/**
 * Get the cell type parameters for a cell.
 */
export function getCellType(
  params: EHTParams,
  cell: CellState
): EHTCellTypeParams {
  return params.cell_types[cell.typeIndex] || params.cell_types.control;
}

/**
 * Update cell phase based on time.
 * Also tracks phase transitions for v1.1.0 cell_cycle_phase requirements.
 */
export function updateCellPhase(
  cell: CellState,
  cellType: EHTCellTypeParams,
  t: number
): void {
  const divTime = cell.division_time;
  const g2Start = divTime - cellType.dur_G2 - cellType.dur_mitosis;
  const mitosisStart = divTime - cellType.dur_mitosis;

  const previousPhase = cell.phase;

  if (t < g2Start) {
    cell.phase = CellPhase.G1;
  } else if (t < mitosisStart) {
    cell.phase = CellPhase.G2;
  } else if (t < divTime) {
    cell.phase = CellPhase.Mitosis;
  } else {
    cell.phase = CellPhase.Division;
  }

  // Track phase transitions for v1.1.0 event system
  if (cell.phase === CellPhase.G2 && previousPhase !== CellPhase.G2) {
    cell.has_reached_G2 = true;
  }
  if (cell.phase === CellPhase.Mitosis && previousPhase !== CellPhase.Mitosis) {
    cell.has_reached_mitosis = true;
  }
}

/**
 * Check if a cell satisfies a cell cycle phase requirement.
 */
export function satisfiesCellCyclePhase(
  cell: CellState,
  requiredPhase: CellCyclePhase
): boolean {
  switch (requiredPhase) {
    case CellCyclePhase.Any:
      return true;
    case CellCyclePhase.Birth:
      return true; // Birth is always satisfied
    case CellCyclePhase.G1:
      return true; // G1 is satisfied after birth
    case CellCyclePhase.G2:
      return cell.has_reached_G2 === true;
    case CellCyclePhase.Mitosis:
      return cell.has_reached_mitosis === true;
    case CellCyclePhase.Division:
      return cell.phase === CellPhase.Division;
    default:
      return true;
  }
}
