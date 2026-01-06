/**
 * Web Worker for running simulations in parallel.
 * Each worker runs a single simulation and posts back snapshots.
 */

import { cloneDeep } from 'lodash-es';
import { SimulationEngine } from '../simulation';
import { setNestedValue } from '../params';
import type { SimulationParams, SimulationState, ApicalLink, BasalLink } from '../types';
import type { BatchSnapshot, CellSnapshotMinimal } from './types';

/** Message sent to worker to start a simulation */
export interface WorkerRequest {
  type: 'run';
  baseParams: SimulationParams;
  overrides: Record<string, number>;
  seed: number;
  timeSamples: number[];
  runIndex: number;
}

/** Message sent from worker with results */
export interface WorkerResponse {
  type: 'complete' | 'error';
  runIndex: number;
  snapshots?: BatchSnapshot[];
  error?: string;
}

/**
 * Build neighbor string from links.
 */
function getNeighbors(
  cellIndex: number,
  links: { l: number; r: number }[],
  cells: { id: number }[]
): string {
  const neighborIndices: number[] = [];
  for (const link of links) {
    if (link.l === cellIndex) {
      neighborIndices.push(link.r);
    } else if (link.r === cellIndex) {
      neighborIndices.push(link.l);
    }
  }
  return neighborIndices.map((i) => cells[i]?.id ?? i).join(',');
}

/**
 * Create minimal cell snapshot from full state.
 */
function createCellSnapshot(
  state: SimulationState,
  cellIndex: number,
  apLinks: ApicalLink[],
  baLinks: BasalLink[]
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
    apical_neighbors: getNeighbors(cellIndex, apLinks, state.cells),
    basal_neighbors: getNeighbors(cellIndex, baLinks, state.cells),
  };
}

/**
 * Create batch snapshot from simulation state.
 */
function createBatchSnapshot(
  runIndex: number,
  seed: number,
  timeH: number,
  sampledParams: Record<string, number>,
  state: SimulationState
): BatchSnapshot {
  const cells: CellSnapshotMinimal[] = [];
  for (let i = 0; i < state.cells.length; i++) {
    cells.push(createCellSnapshot(state, i, state.ap_links, state.ba_links));
  }

  return {
    run_index: runIndex,
    seed,
    time_h: timeH,
    sampled_params: sampledParams,
    cells,
  };
}

/**
 * Run a single simulation and collect snapshots.
 */
function runSimulation(request: WorkerRequest): BatchSnapshot[] {
  const { baseParams, overrides, seed, timeSamples, runIndex } = request;

  // Apply parameter overrides (use cloneDeep to preserve Infinity values)
  const params = cloneDeep(baseParams);
  for (const [path, value] of Object.entries(overrides)) {
    setNestedValue(params, path, value);
  }
  params.general.random_seed = seed;

  // Create engine
  const engine = new SimulationEngine({ params });
  engine.init();

  const snapshots: BatchSnapshot[] = [];
  let nextSampleIndex = 0;

  // Check if we should sample at t=0
  if (timeSamples.length > 0 && timeSamples[0] <= 0) {
    const snapshot = createBatchSnapshot(
      runIndex,
      seed,
      0,
      overrides,
      engine.getState() as SimulationState
    );
    snapshots.push(snapshot);
    nextSampleIndex = 1;
  }

  // Run simulation
  while (!engine.isComplete() && nextSampleIndex < timeSamples.length) {
    engine.step();
    const state = engine.getState() as SimulationState;

    // Check if we've reached a sample time
    while (
      nextSampleIndex < timeSamples.length &&
      state.t >= timeSamples[nextSampleIndex]
    ) {
      const snapshot = createBatchSnapshot(
        runIndex,
        seed,
        timeSamples[nextSampleIndex],
        overrides,
        state
      );
      snapshots.push(snapshot);
      nextSampleIndex++;
    }
  }

  return snapshots;
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === 'run') {
    try {
      const snapshots = runSimulation(request);
      const response: WorkerResponse = {
        type: 'complete',
        runIndex: request.runIndex,
        snapshots,
      };
      self.postMessage(response);
    } catch (err) {
      const response: WorkerResponse = {
        type: 'error',
        runIndex: request.runIndex,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(response);
    }
  }
};
