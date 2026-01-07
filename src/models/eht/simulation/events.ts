/**
 * EHT model EMT events handling.
 * Processes time-based events like losing apical/basal adhesion.
 */

import { Vector2 } from '@/core/math/vector2';
import type { SimulationState, ApicalLink, BasalLink, CellState } from '@/core/types/state';
import type { EHTParams } from '../params/types';

/**
 * Process apical adhesion loss event.
 * Removes apical links and reduces stiffness.
 */
export function processLoseApicalAdhesion(
  state: SimulationState,
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
  state: SimulationState,
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
  state: SimulationState,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  cell.stiffness_straightness = 1.0;
}

/**
 * Process start running event.
 */
export function processStartRunning(
  state: SimulationState,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  cell.running_mode = 3;
}

/**
 * Update running state for a cell.
 */
export function updateRunningState(cell: CellState): void {
  cell.is_running = !cell.has_B &&
    cell.B.y > -2.0 &&
    (cell.running_mode >= 3 || (cell.B.y < 0.0 && cell.running_mode >= 1));
}

/**
 * Process all EMT events for the current timestep.
 */
export function processEMTEvents(
  state: SimulationState,
  _params: EHTParams,
  dt: number
): void {
  const t = state.t;

  for (let i = 0; i < state.cells.length; i++) {
    const cell = state.cells[i];

    // Lose apical adhesion
    if (t <= cell.time_A && t + dt > cell.time_A) {
      processLoseApicalAdhesion(state, i);
    }

    // Lose basal adhesion
    if (t <= cell.time_B && t + dt > cell.time_B) {
      processLoseBasalAdhesion(state, i);
    }

    // Lose straightness
    if (t <= cell.time_S && t + dt > cell.time_S) {
      processLoseStraightness(state, i);
    }

    // Start running
    const shouldStartRunning =
      (cell.time_P > cell.time_B && t <= cell.time_P && t + dt > cell.time_P) ||
      (cell.time_P <= cell.time_B && t <= cell.time_B && t + dt > cell.time_B);

    if (shouldStartRunning) {
      processStartRunning(state, i);
    }

    // Update running state
    updateRunningState(cell);
  }
}
