/**
 * Unified snapshot creation for simulations.
 * Creates BatchSnapshot format which includes neighbor information.
 * Used by both single simulation runs and batch runs.
 */

import type { SimulationState, ApicalLink, BasalLink, CellState } from './types/state';
import type { BatchSnapshot, CellSnapshotMinimal } from './batch/types';

/**
 * Options for creating a snapshot.
 */
export interface SnapshotOptions {
  /** Run index for batch runs (default: 0 for single runs) */
  runIndex?: number;
  /** Random seed used for the simulation */
  seed: number;
  /** Parameter overrides used in batch runs (default: empty) */
  sampledParams?: Record<string, number>;
}

/**
 * Get neighbor cell IDs from link array.
 * Returns comma-separated string of neighbor IDs.
 */
function getNeighborIds(
  cellIndex: number,
  links: (ApicalLink | BasalLink)[],
  cells: CellState[]
): string {
  const neighborIndices: number[] = [];

  for (const link of links) {
    if (link.l === cellIndex) {
      neighborIndices.push(link.r);
    } else if (link.r === cellIndex) {
      neighborIndices.push(link.l);
    }
  }

  // Convert indices to cell IDs
  return neighborIndices.map((i) => cells[i]?.id ?? i).join(',');
}

/**
 * Create a minimal cell snapshot from simulation state.
 */
function createCellSnapshot(
  state: SimulationState,
  cellIndex: number
): CellSnapshotMinimal {
  const cell = state.cells[cellIndex];

  return {
    id: cell.id,
    type: cell.typeIndex,
    pos_x: cell.pos.x,
    pos_y: cell.pos.y,
    A_x: cell.A.x,
    A_y: cell.A.y,
    B_x: cell.B.x,
    B_y: cell.B.y,
    has_A: cell.has_A,
    has_B: cell.has_B,
    phase: cell.phase,
    age: state.t - cell.birth_time,
    apical_neighbors: getNeighborIds(cellIndex, state.ap_links, state.cells),
    basal_neighbors: getNeighborIds(cellIndex, state.ba_links, state.cells),
  };
}

/**
 * Create a snapshot from simulation state.
 *
 * This is the unified snapshot creation function used by both
 * single simulation runs and batch parameter sweeps.
 *
 * @param state - Current simulation state
 * @param options - Snapshot options (run index, seed, sampled params)
 * @returns BatchSnapshot with all cell data and neighbor information
 */
export function createSnapshot(
  state: SimulationState,
  options: SnapshotOptions
): BatchSnapshot {
  const { runIndex = 0, seed, sampledParams = {} } = options;

  const cells: CellSnapshotMinimal[] = [];
  for (let i = 0; i < state.cells.length; i++) {
    cells.push(createCellSnapshot(state, i));
  }

  return {
    run_index: runIndex,
    seed,
    time_h: state.t,
    sampled_params: sampledParams,
    cells,
  };
}
