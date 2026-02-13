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
import { CellCyclePhase } from '../params/types';

/**
 * Evaluate a probability formula string.
 * Returns a number between 0 and 1. Falls back to parsing as plain number.
 */
function evaluateProbabilityFormula(
  formula: string,
  generalParams?: EHTGeneralParams,
  cellTypeParams?: EHTCellTypeParams
): number {
  try {
    const scope: Record<string, number> = {};
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
  cellTypeParams?: EHTCellTypeParams
): Record<string, CellEventState> {
  const eventStates: Record<string, CellEventState> = {};

  if (!events || events.length === 0) {
    return eventStates;
  }

  for (const event of events) {
    // Determine if this event should be skipped based on probability formula
    const prob = evaluateProbabilityFormula(event.probability, generalParams, cellTypeParams);
    const shouldTrigger = rng.random() <= prob;

    // Sample trigger time within [start, end] range
    let triggerTime: number;
    if (shouldTrigger && isFinite(event.start) && isFinite(event.end)) {
      triggerTime = rng.random(event.start, event.end);
    } else {
      // Event is skipped or has invalid range
      triggerTime = Infinity;
    }

    eventStates[event.id] = {
      event_id: event.id,
      trigger_time: triggerTime,
      has_fired: false,
      last_fire_time: -Infinity,
      fire_count: 0,
    };
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

    // Sample EMT event times (legacy v1.0.0 system)
    let time_A = rng.random(cellType.events.time_A_start, cellType.events.time_A_end);
    let time_B = rng.random(cellType.events.time_B_start, cellType.events.time_B_end);
    let time_S = rng.random(cellType.events.time_S_start, cellType.events.time_S_end);
    let time_AC = rng.random(cellType.events.time_AC_start, cellType.events.time_AC_end);
    const time_P = rng.random() <= cellType.run
      ? time_B
      : Infinity;

    // Heterogeneous EMT behavior (legacy)
    if (cellType.hetero && !useV2Events) {
      if (rng.random() > 0.7) time_A = Infinity;
      if (rng.random() > 0.7) time_B = Infinity;
      if (rng.random() > 0.7) time_S = Infinity;
      if (rng.random() > 0.7) time_AC = Infinity;
    }

    // Initialize v1.1.0+ event states if available (using effective events)
    const event_states = useV2Events
      ? initializeEventStates(effectiveEvents, rng, params.general, cellType)
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
      time_A,
      time_B,
      time_S,
      time_P,
      time_AC,
      stiffness_apical_apical: cellType.stiffness_apical_apical,
      stiffness_straightness: cellType.stiffness_straightness,
      stiffness_nuclei_apical: cellType.stiffness_nuclei_apical,
      stiffness_nuclei_basal: cellType.stiffness_nuclei_basal,
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
      time_A: parent.time_A,
      time_B: parent.time_B,
      time_S: parent.time_S,
      time_P: parent.time_P,
      time_AC: parent.time_AC,
      stiffness_apical_apical: cellType.stiffness_apical_apical,
      stiffness_straightness: parent.stiffness_straightness,
      stiffness_nuclei_apical: parent.stiffness_nuclei_apical,
      stiffness_nuclei_basal: parent.stiffness_nuclei_basal,
      // v1.1.0 event system - re-initialize for fresh cell cycle
      event_states: useV2Events
        ? initializeEventStates(effectiveEvents, rng, params.general, cellType)
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
