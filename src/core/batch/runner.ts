/**
 * Batch simulation runner.
 * Runs multiple simulations and collects snapshots at specified times.
 * Supports both sequential and parallel (Web Worker) execution.
 */

import { cloneDeep } from 'lodash-es';
import { SimulationEngine } from '../simulation/engine';
import { setNestedValue } from '../params';
import { modelRegistry } from '../registry';
import type { ModelDefinition, BaseSimulationParams } from '../registry';
import type {
  BatchConfig,
  BatchSnapshot,
  BatchData,
  BatchProgress,
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
  /** Model name to use. If not specified, uses the model from params.metadata.model */
  modelName?: string;
}

/**
 * Run a single simulation and collect snapshots at specified times.
 */
function runSingleSimulation(
  model: ModelDefinition<BaseSimulationParams>,
  baseParams: BaseSimulationParams,
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
  const engine = new SimulationEngine({ model, params });
  engine.init();

  const snapshots: BatchSnapshot[] = [];
  let nextSampleIndex = 0;

  // Check if we should sample at t=0
  if (timeSamples.length > 0 && timeSamples[0] <= 0) {
    const rows = model.getSnapshot(engine.getState());
    const snapshot: BatchSnapshot = {
      run_index: runIndex,
      seed,
      time_h: 0,
      sampled_params: overrides,
      data: rows
    };
    snapshots.push(snapshot);
    callbacks?.onSnapshot?.(snapshot);
    nextSampleIndex = 1;
  }

  // Run simulation
  while (!engine.isComplete() && nextSampleIndex < timeSamples.length) {
    engine.step();
    const state = engine.getState() as any;
    const t = state.t ?? 0;

    // Check if we've reached a sample time
    while (
      nextSampleIndex < timeSamples.length &&
      t >= timeSamples[nextSampleIndex]
    ) {
      const rows = model.getSnapshot(state);
      const snapshot: BatchSnapshot = {
        run_index: runIndex,
        seed,
        time_h: timeSamples[nextSampleIndex],
        sampled_params: overrides,
        data: rows
      };
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
  model: ModelDefinition<BaseSimulationParams>,
  baseParams: BaseSimulationParams,
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
      // Seed increments globally across all runs (not reset per config)
      const seed = baseParams.general.random_seed + runIndex;

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
        model,
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
  model: ModelDefinition<BaseSimulationParams>,
  baseParams: BaseSimulationParams,
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
        // Seed increments globally across all runs (not reset per config)
        const seed = baseParams.general.random_seed + runIndex;
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
    // Pass the model ID so workers can look it up from their registry
    const promises = tasks.map(async (task) => {
      const snapshots = await pool.submit(
        model.id,
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
  baseParams: BaseSimulationParams,
  config: BatchConfig,
  callbacks?: BatchRunnerCallbacks,
  options?: BatchRunnerOptions
): Promise<BatchData> {
  // Resolve the model from params metadata or explicit option
  const modelName = options?.modelName ?? baseParams.metadata?.model;
  if (!modelName) {
    throw new Error('Model name not specified. Provide options.modelName or ensure params.metadata.model is set.');
  }

  const model = modelRegistry.get(modelName);
  if (!model) {
    throw new Error(`Model "${modelName}" not found in registry.`);
  }

  const useParallel = options?.parallel ?? WorkerPool.isSupported();

  if (useParallel && WorkerPool.isSupported()) {
    return runBatchParallel(model, baseParams, config, callbacks, options?.workerCount);
  } else {
    return runBatchSequential(model, baseParams, config, callbacks);
  }
}

/**
 * Compute total number of runs for a config.
 */
export function computeTotalRuns(ranges: ParameterRange[], seedsPerConfig: number): number {
  const paramConfigs = generateParameterConfigs(ranges, 'grid');
  return paramConfigs.length * seedsPerConfig;
}
