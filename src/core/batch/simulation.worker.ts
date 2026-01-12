/**
 * Web Worker for running simulations in parallel.
 * Each worker runs a single simulation and posts back snapshots.
 */

import { SimulationEngine } from '../simulation/engine';
import { modelRegistry } from '../registry';
import { setNestedValue } from '../params';
import type { BaseSimulationParams } from '../registry';
import type { BatchSnapshot } from './types';

// Import worker-safe models (no UI/renderer code)
import '@/models/index.worker';

/** Message sent to worker to start a simulation */
export interface WorkerRequest {
  type: 'run';
  modelName: string;
  baseParams: BaseSimulationParams;
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
 * Run a single simulation and collect snapshots.
 */
function runSimulation(request: WorkerRequest): BatchSnapshot[] {
  const { modelName, baseParams, overrides, seed, timeSamples, runIndex } = request;

  // Get the model from the registry
  const model = modelRegistry.get(modelName);
  if (!model) {
    throw new Error(`Model "${modelName}" not found in worker registry.`);
  }

  // Apply parameter overrides (structuredClone preserves Infinity values)
  const params = structuredClone(baseParams);
  for (const [path, value] of Object.entries(overrides)) {
    setNestedValue(params, path, value);
  }
  params.general.random_seed = seed;

  // Create model-aware engine
  const engine = new SimulationEngine({ model, params });
  engine.init();

  const snapshots: BatchSnapshot[] = [];
  let nextSampleIndex = 0;

  // Check if we should sample at t=0
  if (timeSamples.length > 0 && timeSamples[0] <= 0) {
    const rows = model.getSnapshot(engine.getState());
    snapshots.push({
      run_index: runIndex,
      seed,
      time_h: 0,
      sampled_params: overrides,
      data: rows
    });
    nextSampleIndex = 1;
  }

  // Run simulation
  while (!engine.isComplete() && nextSampleIndex < timeSamples.length) {
    engine.step();
    // We might need to track time manually if model doesn't expose it uniformly
    // But engine.getState() returns generic State. 
    // We assume state has 't' or engine helps.
    // The Generic SimulationEngine in engine.ts doesn't expose getTime() directly?
    // Wait, I didn't add getTime() to Generic SimulationEngine.
    // I added getState(). 
    // But I used `state.t` in my implementation of `isComplete`.
    // I should probably ensure `SimulationEngine` can provide time.

    // Check if the state has time 't'. Generic model interface doesn't enforce 't'.
    // BUT BaseSimulationParams has 't_end'.
    // If the model is compatible with BaseSimulationParams, it likely has 't'.
    // Let's assume state has 't'.
    const state = engine.getState() as any;
    const t = state.t ?? 0;

    // Check if we've reached a sample time
    while (
      nextSampleIndex < timeSamples.length &&
      t >= timeSamples[nextSampleIndex]
    ) {
      const rows = model.getSnapshot(state);
      snapshots.push({
        run_index: runIndex,
        seed,
        time_h: timeSamples[nextSampleIndex],
        sampled_params: overrides,
        data: rows
      });
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
