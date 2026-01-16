/**
 * EHT model EMT events handling.
 * Processes time-based events like losing apical/basal adhesion.
 */

import { Vector2 } from '@/core/math/vector2';
import type { EHTSimulationState, ApicalLink, BasalLink, CellState } from '../types';
import type { EHTParams } from '../params/types';

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
