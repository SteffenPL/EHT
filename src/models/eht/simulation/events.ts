/**
 * EHT model EMT events handling.
 * Processes time-based events like losing apical/basal adhesion.
 *
 * Supports both:
 * - Legacy v1.0.0 event system (EMTEventTimes)
 * - New v1.1.0 event system (events_v2 array)
 */

import { Vector2 } from '@/core/math/vector2';
import { SeededRandom } from '@/core/math/random';
import { evaluate } from 'mathjs';
import type { EHTSimulationState, ApicalLink, BasalLink, CellState, CellEventState } from '../types';
import type { EHTParams, EHTCellTypeParams, EventDefinition, ParameterChangeEvent, SpecialEvent, SpecialEventName } from '../params/types';
import { createCell, getCellType, getEffectiveEvents, initializeEventStates, satisfiesCellCyclePhase, type CreateCellInput } from './cell';
import { divideSingleCell } from './division';

/**
 * Process apical adhesion loss event.
 * Removes apical links and reduces stiffness.
 */
export function processLoseApicalAdhesion(
  state: EHTSimulationState,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  cell.has_A = false;
  cell.stiffness_nuclei_apical *= 0.1;

  // Find and remove apical links involving this cell
  const inds: number[] = [];
  let newCon: ApicalLink = { l: 0, r: 0, rl: 0.0 };

  for (let e = 0; e < state.ap_links.length; e++) {
    const con = state.ap_links[e];
    if (con.l === cellIndex) {
      inds.push(e);
      newCon.r = con.r;
    }
    if (con.r === cellIndex) {
      inds.push(e);
      newCon.l = con.l;
    }
  }

  if (inds.length === 1) {
    // Cell at boundary - just remove the link
    state.ap_links.splice(inds[0], 1);
  } else if (inds.length === 2) {
    // Cell in middle - connect neighbors
    inds.sort((a, b) => b - a); // Sort descending for safe removal

    state.ap_links.splice(inds[0], 1);
    state.ap_links.splice(inds[1], 1);

    // Calculate new rest length
    const cellL = state.cells[newCon.l];
    const cellR = state.cells[newCon.r];
    newCon.rl = Vector2.from(cellL.A).dist(Vector2.from(cellR.A));

    state.ap_links.push(newCon);
  }
}

/**
 * Process basal adhesion loss event.
 * Removes basal links.
 */
export function processLoseBasalAdhesion(
  state: EHTSimulationState,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  cell.has_B = false;
  cell.stiffness_nuclei_basal *= 0.1;

  // Find and remove basal links involving this cell
  const inds: number[] = [];
  let newCon: BasalLink = { l: 0, r: 0 };

  for (let e = 0; e < state.ba_links.length; e++) {
    const con = state.ba_links[e];
    if (con.l === cellIndex) {
      inds.push(e);
      newCon.r = con.r;
    }
    if (con.r === cellIndex) {
      inds.push(e);
      newCon.l = con.l;
    }
  }

  if (inds.length === 1) {
    state.ba_links.splice(inds[0], 1);
  } else if (inds.length === 2) {
    inds.sort((a, b) => b - a);
    state.ba_links.splice(inds[0], 1);
    state.ba_links.splice(inds[1], 1);
    state.ba_links.push(newCon);
  }
}

/**
 * Process straightness loss event.
 */
export function processLoseStraightness(
  state: EHTSimulationState,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  cell.stiffness_straightness = 1.0;
}

/**
 * Process start running event.
 */
export function processStartRunning(
  state: EHTSimulationState,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  cell.running_mode = 3;
}

/**
 * Process apical constriction event for a specific cell type.
 * Cuts apical links between constricting cells and other cell types.
 * Connects neighboring non-constricting cells across constricting clusters.
 *
 * This should be called once when time_AC is reached for cells of a specific type.
 * It processes all cells of that type at once to handle the graph restructuring.
 *
 * Algorithm:
 * 1. Identify the cell type undergoing constriction
 * 2. Remove all links between constricting cells and other cell types
 * 3. Connect neighboring non-constricting cells across gaps
 * 4. Initialize new links with rest length = current distance
 */
export function processApicalConstriction(
  state: EHTSimulationState,
  cellIndex: number
): void {
  const constrictionCell = state.cells[cellIndex];
  const constrictingType = constrictionCell.typeIndex;

  // Step 1: Identify and remove all links between constricting type and other types
  const linksToRemove: number[] = [];

  for (let i = 0; i < state.ap_links.length; i++) {
    const link = state.ap_links[i];
    const cellL = state.cells[link.l];
    const cellR = state.cells[link.r];

    const lIsConstricting = cellL.typeIndex === constrictingType;
    const rIsConstricting = cellR.typeIndex === constrictingType;

    // Remove link if exactly one cell is of the constricting type (mixed link)
    if (lIsConstricting !== rIsConstricting) {
      linksToRemove.push(i);
    }
  }

  // Step 2: Build adjacency information before removal
  // Map each cell to its left and right neighbors
  const rightNeighbor = new Map<number, number>();
  const leftNeighbor = new Map<number, number>();

  for (const link of state.ap_links) {
    rightNeighbor.set(link.l, link.r);
    leftNeighbor.set(link.r, link.l);
  }

  // Step 3: Remove the mixed links (in reverse order to maintain indices)
  linksToRemove.sort((a, b) => b - a);
  for (const idx of linksToRemove) {
    state.ap_links.splice(idx, 1);
  }

  // Step 4: Rebuild adjacency after removal
  const newRightNeighbor = new Map<number, number>();

  for (const link of state.ap_links) {
    newRightNeighbor.set(link.l, link.r);
  }

  // Step 5: Find non-constricting cells that need to be reconnected
  const newLinks: ApicalLink[] = [];

  for (let cellIdx = 0; cellIdx < state.cells.length; cellIdx++) {
    const cell = state.cells[cellIdx];
    if (cell.typeIndex === constrictingType) continue;

    // Check if this cell had a right neighbor but lost it
    const hadRightNeighbor = rightNeighbor.has(cellIdx);
    const hasRightNeighbor = newRightNeighbor.has(cellIdx);

    if (hadRightNeighbor && !hasRightNeighbor) {
      // This non-constricting cell lost its right neighbor
      // Find the next non-constricting cell to the right
      let nextCellIdx = rightNeighbor.get(cellIdx)!;

      // Skip over constricting cells
      while (nextCellIdx < state.cells.length && state.cells[nextCellIdx].typeIndex === constrictingType) {
        const nextRight = rightNeighbor.get(nextCellIdx);
        if (nextRight === undefined) break;
        nextCellIdx = nextRight;
      }

      // Connect if we found a non-constricting cell
      if (nextCellIdx < state.cells.length && state.cells[nextCellIdx].typeIndex !== constrictingType) {
        const cellL = state.cells[cellIdx];
        const cellR = state.cells[nextCellIdx];
        const restLength = Vector2.from(cellL.A).dist(Vector2.from(cellR.A));

        newLinks.push({
          l: cellIdx,
          r: nextCellIdx,
          rl: restLength,
        });
      }
    }
  }

  // Step 6: Add the new links
  state.ap_links.push(...newLinks);
}

/**
 * Update running state for a cell.
 * Checks that the basal point is at distance > 2 in the opposite normal direction.
 */
export function updateRunningState(
  cell: CellState,
  state: EHTSimulationState
): void {
  if (cell.has_B) {
    cell.is_running = false;
    return;
  }

  // Project cell.B onto basal curve
  const B = Vector2.from(cell.B);
  const projB = state.basalGeometry.projectPoint(B);

  // Get normal at projected point (points away from curve)
  const normal = state.basalGeometry.getNormal(projB);

  // Compute signed distance in normal direction: (B - projB) · normal
  const displacement = B.sub(projB);
  const signedDistance = displacement.dot(normal);

  // Check if distance in opposite normal direction is > 2 (i.e., signedDistance < -2)
  const isFarEnough = signedDistance < -2.0;

  // Additional running mode checks
  const modeCheck = cell.running_mode >= 3 ||
    (signedDistance > 0.0 && cell.running_mode >= 1);

  cell.is_running = isFarEnough && modeCheck;
}

/**
 * Process all EMT events for the current timestep.
 */
export function processEMTEvents(
  state: EHTSimulationState,
  _params: EHTParams,
  dt: number
): void {
  const t = state.t;

  // Track which cell types have triggered apical constriction
  const constrictedTypes = new Set<string>();

  for (let i = 0; i < state.cells.length; i++) {
    const cell = state.cells[i];

    // Lose apical adhesion
    if (t <= cell.time_A && t + dt > cell.time_A) {
      processLoseApicalAdhesion(state, i);
    }

    // Lose basal adhesion
    if (t <= cell.time_B && t + dt > cell.time_B) {
      console.log("Event B")
      processLoseBasalAdhesion(state, i);
    }

    // Lose straightness
    if (t <= cell.time_S && t + dt > cell.time_S) {
      processLoseStraightness(state, i);
    }

    // Apical constriction - collect types that trigger
    if (t <= cell.time_AC && t + dt > cell.time_AC) {
      constrictedTypes.add(cell.typeIndex);
    }

    // Start running
    const shouldStartRunning =
      (cell.time_P > cell.time_B && t <= cell.time_P && t + dt > cell.time_P) ||
      (cell.time_P <= cell.time_B && t <= cell.time_B && t + dt > cell.time_B);

    if (shouldStartRunning) {
      processStartRunning(state, i);
    }

    // Update running state
    updateRunningState(cell, state);
  }

  // Process apical constriction once per cell type
  for (const typeIndex of constrictedTypes) {
    // Find first cell of this type and process constriction for all cells of that type
    const cellIdx = state.cells.findIndex(c => c.typeIndex === typeIndex);
    if (cellIdx !== -1) {
      console.log(`Event AC for type ${typeIndex}`);
      processApicalConstriction(state, cellIdx);
    }
  }
}

// =============================================================================
// New v1.1.0 Event System
// =============================================================================

/**
 * Special event handler registry.
 * Maps special event names to their handler functions.
 */
const specialEventHandlers: Record<SpecialEventName, (state: EHTSimulationState, cellIndex: number) => void> = {
  'lose_apical_adhesion': processLoseApicalAdhesionOnly,
  'lose_basal_adhesion': processLoseBasalAdhesionOnly,
  'apical_constriction': processApicalConstriction,
  'start_running': processStartRunning,
  'cell_division': () => {}, // Handled as deferred event in processV2Events
  'cell_cycle_reset': () => {}, // Handled as deferred event in processV2Events
};

/**
 * Process apical adhesion loss (structural changes only, no stiffness change).
 * For v1.1.0 event system - stiffness changes are handled by separate parameter events.
 */
export function processLoseApicalAdhesionOnly(
  state: EHTSimulationState,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  cell.has_A = false;

  // Find and remove apical links involving this cell
  const inds: number[] = [];
  let newCon: ApicalLink = { l: 0, r: 0, rl: 0.0 };

  for (let e = 0; e < state.ap_links.length; e++) {
    const con = state.ap_links[e];
    if (con.l === cellIndex) {
      inds.push(e);
      newCon.r = con.r;
    }
    if (con.r === cellIndex) {
      inds.push(e);
      newCon.l = con.l;
    }
  }

  if (inds.length === 1) {
    // Cell at boundary - just remove the link
    state.ap_links.splice(inds[0], 1);
  } else if (inds.length === 2) {
    // Cell in middle - connect neighbors
    inds.sort((a, b) => b - a); // Sort descending for safe removal

    state.ap_links.splice(inds[0], 1);
    state.ap_links.splice(inds[1], 1);

    // Calculate new rest length
    const cellL = state.cells[newCon.l];
    const cellR = state.cells[newCon.r];
    newCon.rl = Vector2.from(cellL.A).dist(Vector2.from(cellR.A));

    state.ap_links.push(newCon);
  }
}

/**
 * Process basal adhesion loss (structural changes only, no stiffness change).
 * For v1.1.0 event system - stiffness changes are handled by separate parameter events.
 */
export function processLoseBasalAdhesionOnly(
  state: EHTSimulationState,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  cell.has_B = false;

  // Find and remove basal links involving this cell
  const inds: number[] = [];
  let newCon: BasalLink = { l: 0, r: 0 };

  for (let e = 0; e < state.ba_links.length; e++) {
    const con = state.ba_links[e];
    if (con.l === cellIndex) {
      inds.push(e);
      newCon.r = con.r;
    }
    if (con.r === cellIndex) {
      inds.push(e);
      newCon.l = con.l;
    }
  }

  if (inds.length === 1) {
    state.ba_links.splice(inds[0], 1);
  } else if (inds.length === 2) {
    inds.sort((a, b) => b - a);
    state.ba_links.splice(inds[0], 1);
    state.ba_links.splice(inds[1], 1);
    state.ba_links.push(newCon);
  }
}

/**
 * Evaluate a math.js formula for a parameter change event.
 * Scope includes old_value, t, dt, period, and general params like p_div_out.
 */
function evaluateFormula(
  formula: string,
  oldValue: number,
  t: number,
  dt: number,
  period: number,
  generalParams?: import('../params/types').EHTGeneralParams
): number {
  try {
    const scope: Record<string, number> = {
      old_value: oldValue,
      t,
      dt,
      period: period || 1, // Avoid division by zero
    };

    // Expose general params in formula scope
    if (generalParams) {
      scope.p_div_out = generalParams.p_div_out;
      scope.mu = generalParams.mu;
      scope.h_init = generalParams.h_init;
      scope.w_init = generalParams.w_init;
      scope.t_end = generalParams.t_end;
    }

    return evaluate(formula, scope);
  } catch (error) {
    console.error(`[Events] Failed to evaluate formula "${formula}":`, error);
    return oldValue; // Return unchanged value on error
  }
}

/**
 * Get a cell parameter value by path.
 */
function getCellParameter(cell: CellState, path: string): number | undefined {
  switch (path) {
    case 'stiffness_nuclei_apical':
      return cell.stiffness_nuclei_apical;
    case 'stiffness_nuclei_basal':
      return cell.stiffness_nuclei_basal;
    case 'stiffness_straightness':
      return cell.stiffness_straightness;
    case 'stiffness_apical_apical':
      return cell.stiffness_apical_apical;
    case 'R_soft':
      return cell.R_soft;
    case 'R_hard':
      return cell.R_hard;
    case 'eta_A':
      return cell.eta_A;
    case 'eta_B':
      return cell.eta_B;
    case 'running_mode':
      return cell.running_mode;
    case 'apical_cytos_strain':
      return cell.apical_cytos_strain;
    case 'basal_cytos_strain':
      return cell.basal_cytos_strain;
    default:
      console.warn(`[Events] Unknown cell parameter: ${path}`);
      return undefined;
  }
}

/**
 * Set a cell parameter value by path.
 */
function setCellParameter(cell: CellState, path: string, value: number): void {
  switch (path) {
    case 'stiffness_nuclei_apical':
      cell.stiffness_nuclei_apical = value;
      break;
    case 'stiffness_nuclei_basal':
      cell.stiffness_nuclei_basal = value;
      break;
    case 'stiffness_straightness':
      cell.stiffness_straightness = value;
      break;
    case 'stiffness_apical_apical':
      cell.stiffness_apical_apical = value;
      break;
    case 'R_soft':
      cell.R_soft = value;
      break;
    case 'R_hard':
      cell.R_hard = value;
      break;
    case 'eta_A':
      cell.eta_A = value;
      break;
    case 'eta_B':
      cell.eta_B = value;
      break;
    case 'running_mode':
      cell.running_mode = value;
      break;
    case 'apical_cytos_strain':
      cell.apical_cytos_strain = value;
      break;
    case 'basal_cytos_strain':
      cell.basal_cytos_strain = value;
      break;
    default:
      console.warn(`[Events] Unknown cell parameter: ${path}`);
  }
}

/**
 * Check if an event's prerequisites are satisfied for a cell.
 */
function prereqSatisfied(
  eventDef: EventDefinition,
  cell: CellState
): boolean {
  // No prereq required
  if (!eventDef.prereq) {
    return true;
  }

  // Check if prereq event has fired for this cell
  const prereqState = cell.event_states?.[eventDef.prereq];
  return prereqState?.has_fired === true;
}

/**
 * Check if an event should fire for a cell at the current time.
 */
function shouldEventFire(
  eventState: CellEventState,
  eventDef: EventDefinition,
  cell: CellState,
  t: number,
  dt: number
): boolean {
  // Check cell cycle phase requirement
  if (!satisfiesCellCyclePhase(cell, eventDef.cell_cycle_phase)) {
    return false;
  }

  // Check prerequisites
  if (!prereqSatisfied(eventDef, cell)) {
    return false;
  }

  // Check if event was skipped (trigger_time is Infinity)
  if (!isFinite(eventState.trigger_time)) {
    return false;
  }

  // One-time event
  if (eventDef.period === 0) {
    // Fire if we just crossed the trigger time
    return !eventState.has_fired && t <= eventState.trigger_time && t + dt > eventState.trigger_time;
  }

  // Periodic event
  // Fire at trigger_time, then every period after that
  if (t + dt < eventState.trigger_time) {
    return false;
  }

  // Calculate time since trigger
  const timeSinceLastFire = t - eventState.last_fire_time;

  // First fire
  if (!eventState.has_fired && t <= eventState.trigger_time && t + dt > eventState.trigger_time) {
    return true;
  }

  // Subsequent fires
  if (eventState.has_fired && timeSinceLastFire >= eventDef.period) {
    return true;
  }

  return false;
}

/**
 * Process a parameter change event for a cell.
 */
function processParameterChangeEvent(
  event: ParameterChangeEvent,
  eventState: CellEventState,
  cell: CellState,
  t: number,
  dt: number,
  generalParams?: import('../params/types').EHTGeneralParams
): void {
  const oldValue = getCellParameter(cell, event.target_parameter);
  if (oldValue === undefined) {
    return;
  }

  const newValue = evaluateFormula(event.formula, oldValue, t, dt, event.period, generalParams);
  setCellParameter(cell, event.target_parameter, newValue);

  // Update event state
  eventState.has_fired = true;
  eventState.last_fire_time = t;
  eventState.fire_count++;
}

/**
 * Process a special event for a cell.
 */
function processSpecialEvent(
  event: SpecialEvent,
  state: EHTSimulationState,
  cellIndex: number
): void {
  const handler = specialEventHandlers[event.special_name];
  if (handler) {
    handler(state, cellIndex);
  } else {
    console.warn(`[Events] Unknown special event: ${event.special_name}`);
  }
}

/**
 * Process all v1.1.0 events for the current timestep.
 */
export function processV2Events(
  state: EHTSimulationState,
  params: EHTParams,
  dt: number,
  rng: SeededRandom
): void {
  const t = state.t;

  // Track deferred events (processed after main loop)
  const constrictedTypes = new Set<string>();
  const cellsToReset: number[] = [];
  const cellsToDivide: number[] = [];

  for (let i = 0; i < state.cells.length; i++) {
    const cell = state.cells[i];
    const cellType = params.cell_types[cell.typeIndex] as EHTCellTypeParams;

    // Get effective events (merged default + per-type)
    const effectiveEvents = getEffectiveEvents(params.general, cellType);

    // Skip if no events
    if (effectiveEvents.length === 0 || !cell.event_states) {
      continue;
    }

    for (const eventDef of effectiveEvents) {
      const eventState = cell.event_states[eventDef.id];
      if (!eventState) {
        continue;
      }

      if (shouldEventFire(eventState, eventDef, cell, t, dt)) {
        if (eventDef.type === 'parameter_change') {
          processParameterChangeEvent(eventDef, eventState, cell, t, dt, params.general);
        } else if (eventDef.type === 'special') {
          // Deferred events: collect indices and process after main loop
          if (eventDef.special_name === 'apical_constriction') {
            constrictedTypes.add(cell.typeIndex);
            eventState.has_fired = true;
            eventState.last_fire_time = t;
            eventState.fire_count++;
          } else if (eventDef.special_name === 'cell_cycle_reset') {
            cellsToReset.push(i);
            eventState.has_fired = true;
            eventState.last_fire_time = t;
            eventState.fire_count++;
          } else if (eventDef.special_name === 'cell_division') {
            cellsToDivide.push(i);
            eventState.has_fired = true;
            eventState.last_fire_time = t;
            eventState.fire_count++;
          } else {
            processSpecialEvent(eventDef, state, i);
            eventState.has_fired = true;
            eventState.last_fire_time = t;
            eventState.fire_count++;
          }
        }
      }
    }

    // Update running state
    updateRunningState(cell, state);
  }

  // Process cell cycle resets first (in-place, no new cells)
  for (const cellIndex of cellsToReset) {
    processCellCycleReset(state, params, rng, cellIndex);
  }

  // Process cell divisions (may add new cells)
  for (const cellIndex of cellsToDivide) {
    divideSingleCell(state, params, rng, cellIndex);
  }

  // Process apical constriction once per cell type
  for (const typeIndex of constrictedTypes) {
    const cellIdx = state.cells.findIndex(c => c.typeIndex === typeIndex);
    if (cellIdx !== -1) {
      processApicalConstriction(state, cellIdx);
    }
  }
}

/**
 * Process a cell cycle reset event.
 * Resets the cell's cycle without dividing — creates a fresh cell in-place,
 * preserving the cell's ID, and re-initializes event states.
 */
function processCellCycleReset(
  state: EHTSimulationState,
  params: EHTParams,
  rng: SeededRandom,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  const cellType = getCellType(params, cell);

  const cellInput: CreateCellInput = {
    basalPoint: Vector2.from(cell.B),
    apicalPoint: Vector2.from(cell.A),
    nucleusPosition: Vector2.from(cell.pos),
  };

  const newCell = createCell(
    params,
    state,
    rng,
    cellInput,
    cellType,
    cell.typeIndex,
    cell
  );

  // Preserve the cell's ID
  newCell.id = cell.id;

  // Re-initialize event states (fresh cycle) using effective events
  const effectiveEvents = getEffectiveEvents(params.general, cellType);
  newCell.event_states = initializeEventStates(effectiveEvents, rng);
  newCell.has_reached_G2 = false;
  newCell.has_reached_mitosis = false;

  state.cells[cellIndex] = newCell;
}

/**
 * Process all EMT events for the current timestep.
 * Automatically detects whether to use legacy v1.0.0 or new v1.1.0 system.
 */
export function processAllEvents(
  state: EHTSimulationState,
  params: EHTParams,
  dt: number,
  rng: SeededRandom
): void {
  // Check if any cell type uses v1.1.0+ events (including default events)
  let hasV2Events = (params.general.default_events ?? []).length > 0;
  if (!hasV2Events) {
    for (const cellType of Object.values(params.cell_types)) {
      if ((cellType as EHTCellTypeParams).events_v2 !== undefined &&
          (cellType as EHTCellTypeParams).events_v2!.length > 0) {
        hasV2Events = true;
        break;
      }
    }
  }

  if (hasV2Events) {
    // Use new v1.1.0 event system
    processV2Events(state, params, dt, rng);
  } else {
    // Use legacy v1.0.0 event system
    processEMTEvents(state, params, dt);
  }
}
