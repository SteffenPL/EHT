/**
 * Batch simulation runner.
 * Runs multiple simulations and collects snapshots at specified times.
 * Supports both sequential and parallel (Web Worker) execution.
 */

import { cloneDeep } from 'lodash-es';
import { SimulationEngine } from '../simulation';
import { setNestedValue } from '../params';
import type { SimulationParams, SimulationState, ApicalLink, BasalLink } from '../types';
import type {
  BatchConfig,
  BatchSnapshot,
  BatchData,
  BatchProgress,
  CellSnapshotMinimal,
  ParameterRange,
} from './types';
import { generateParameterConfigs, getTimeSamples } from './types';
import { WorkerPool } from './workerPool';

export interface BatchRunnerCallbacks {
  onProgress?: (progress: BatchProgress) => void;
  onSnapshot?: (snapshot: BatchSnapshot) => void;
  onComplete?: (data: BatchData) => void;
}

export interface BatchRunnerOptions {
  /** Use Web Workers for parallel execution. Default: true if supported. */
  parallel?: boolean;
  /** Number of workers for parallel execution. Default: navigator.hardwareConcurrency. */
  workerCount?: number;
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
 * Run a single simulation and collect snapshots at specified times.
 */
function runSingleSimulation(
  baseParams: SimulationParams,
  overrides: Record<string, number>,
  seed: number,
  timeSamples: number[],
  runIndex: number,
  callbacks?: BatchRunnerCallbacks
): BatchSnapshot[] {
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
    const snapshot = createBatchSnapshot(runIndex, seed, 0, overrides, engine.getState() as SimulationState);
    snapshots.push(snapshot);
    callbacks?.onSnapshot?.(snapshot);
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
      callbacks?.onSnapshot?.(snapshot);
      nextSampleIndex++;
    }
  }

  return snapshots;
}

/**
 * Yield control to the browser to allow UI updates.
 */
function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Run batch simulations sequentially (single-threaded).
 */
async function runBatchSequential(
  baseParams: SimulationParams,
  config: BatchConfig,
  callbacks?: BatchRunnerCallbacks
): Promise<BatchData> {
  const paramConfigs = generateParameterConfigs(
    config.parameter_ranges,
    config.sampling_mode,
    config.random_sample_count
  );
  const timeSamples = getTimeSamples(config.time_samples);

  const totalRuns = paramConfigs.length * config.seeds_per_config;
  const allSnapshots: BatchSnapshot[] = [];

  let runIndex = 0;

  for (const paramConfig of paramConfigs) {
    for (let seedOffset = 0; seedOffset < config.seeds_per_config; seedOffset++) {
      const seed = baseParams.general.random_seed + seedOffset;

      // Report progress
      callbacks?.onProgress?.({
        current_run: runIndex,
        total_runs: totalRuns,
        current_config: paramConfig,
        is_running: true,
        is_complete: false,
      });

      // Yield to allow UI to update
      await yieldToUI();

      // Run simulation
      const snapshots = runSingleSimulation(
        baseParams,
        paramConfig,
        seed,
        timeSamples,
        runIndex,
        callbacks
      );

      allSnapshots.push(...snapshots);
      runIndex++;
    }
  }

  const batchData: BatchData = {
    config,
    snapshots: allSnapshots,
    completed_runs: totalRuns,
    total_runs: totalRuns,
  };

  callbacks?.onProgress?.({
    current_run: totalRuns,
    total_runs: totalRuns,
    current_config: {},
    is_running: false,
    is_complete: true,
  });

  callbacks?.onComplete?.(batchData);

  return batchData;
}

/**
 * Run batch simulations in parallel using Web Workers.
 */
async function runBatchParallel(
  baseParams: SimulationParams,
  config: BatchConfig,
  callbacks?: BatchRunnerCallbacks,
  workerCount?: number
): Promise<BatchData> {
  const paramConfigs = generateParameterConfigs(
    config.parameter_ranges,
    config.sampling_mode,
    config.random_sample_count
  );
  const timeSamples = getTimeSamples(config.time_samples);

  const totalRuns = paramConfigs.length * config.seeds_per_config;
  const allSnapshots: BatchSnapshot[] = [];
  let completedRuns = 0;

  // Create worker pool
  const pool = new WorkerPool(workerCount);
  pool.init();

  try {
    // Build list of all tasks
    const tasks: Array<{
      paramConfig: Record<string, number>;
      seed: number;
      runIndex: number;
    }> = [];

    let runIndex = 0;
    for (const paramConfig of paramConfigs) {
      for (let seedOffset = 0; seedOffset < config.seeds_per_config; seedOffset++) {
        const seed = baseParams.general.random_seed + seedOffset;
        tasks.push({ paramConfig, seed, runIndex });
        runIndex++;
      }
    }

    // Report initial progress
    callbacks?.onProgress?.({
      current_run: 0,
      total_runs: totalRuns,
      current_config: {},
      is_running: true,
      is_complete: false,
    });

    // Submit all tasks and collect results
    const promises = tasks.map(async (task) => {
      const snapshots = await pool.submit(
        baseParams,
        task.paramConfig,
        task.seed,
        timeSamples,
        task.runIndex
      );

      // Report progress after each completion
      completedRuns++;
      callbacks?.onProgress?.({
        current_run: completedRuns,
        total_runs: totalRuns,
        current_config: task.paramConfig,
        is_running: true,
        is_complete: false,
      });

      // Notify about snapshots
      for (const snapshot of snapshots) {
        callbacks?.onSnapshot?.(snapshot);
      }

      return snapshots;
    });

    // Wait for all to complete
    const results = await Promise.all(promises);

    // Collect all snapshots
    for (const snapshots of results) {
      allSnapshots.push(...snapshots);
    }

    // Sort snapshots by run_index and time_h for consistent ordering
    allSnapshots.sort((a, b) => {
      if (a.run_index !== b.run_index) return a.run_index - b.run_index;
      return a.time_h - b.time_h;
    });
  } finally {
    // Clean up workers
    pool.terminate();
  }

  const batchData: BatchData = {
    config,
    snapshots: allSnapshots,
    completed_runs: totalRuns,
    total_runs: totalRuns,
  };

  callbacks?.onProgress?.({
    current_run: totalRuns,
    total_runs: totalRuns,
    current_config: {},
    is_running: false,
    is_complete: true,
  });

  callbacks?.onComplete?.(batchData);

  return batchData;
}

/**
 * Run batch simulations.
 * Uses Web Workers for parallel execution if available, falls back to sequential.
 */
export async function runBatch(
  baseParams: SimulationParams,
  config: BatchConfig,
  callbacks?: BatchRunnerCallbacks,
  options?: BatchRunnerOptions
): Promise<BatchData> {
  const useParallel = options?.parallel ?? WorkerPool.isSupported();

  if (useParallel && WorkerPool.isSupported()) {
    return runBatchParallel(baseParams, config, callbacks, options?.workerCount);
  } else {
    return runBatchSequential(baseParams, config, callbacks);
  }
}

/**
 * Compute total number of runs for a config.
 */
export function computeTotalRuns(ranges: ParameterRange[], seedsPerConfig: number): number {
  const paramConfigs = generateParameterConfigs(ranges, 'grid');
  return paramConfigs.length * seedsPerConfig;
}
