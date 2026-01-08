/**
 * CLI command for running a single simulation.
 */


import * as fs from 'fs';
import { SimulationEngine } from '../../src/core/simulation/engine';

import { parseTomlWithDefaults } from '../../src/core/params/toml';
import { setNestedValue } from '../../src/core/params/merge';
// import { createSnapshot } from '../../src/core/snapshot';
import type { BaseSimulationState as SimulationState } from '../../src/core/types';
import type { BatchSnapshot } from '../../src/core/batch/types';
import { parseArgs, generateTimeSamples } from '../utils/args';
import { snapshotsToCSV, writeOutput, formatProgress } from '../utils/output';

import { EHTModel } from '../../src/models/eht';
import { DEFAULT_EHT_PARAMS } from '../../src/models/eht/params/defaults';
import type { EHTParams } from '../../src/models/eht/params/types';

/**
 * Run a single simulation from the CLI.
 */
export async function runCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  // Load base parameters
  let params: EHTParams;
  if (parsed.config) {
    const tomlContent = fs.readFileSync(parsed.config, 'utf-8');
    params = parseTomlWithDefaults(tomlContent); // This returns any, cast to EHTParams
    console.error(`Loaded config from: ${parsed.config}`);
  } else {
    // legacy defaults? or generic?
    // Use EHT Defaults
    params = { ...DEFAULT_EHT_PARAMS };
    console.error('Using default parameters');
  }

  // Apply parameter overrides
  for (const [path, value] of Object.entries(parsed.params)) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setNestedValue(params, path, numValue);
      console.error(`Override: ${path} = ${numValue}`);
    } else {
      console.error(`Warning: Invalid numeric value for ${path}: ${value}`);
    }
  }

  // Apply seed override
  if (parsed.seed !== undefined) {
    params.general.random_seed = parsed.seed;
    console.error(`Seed: ${parsed.seed}`);
  }

  // Generate time samples
  const times = parsed.times ?? { start: 0, end: params.general.t_end, step: 12 };
  const timeSamples = generateTimeSamples(times.start, times.end, times.step);
  console.error(`Time samples: ${timeSamples.join(', ')}h`);

  // Create and initialize simulation engine
  // Explicitly use EHT Model for CLI default
  const engine = new SimulationEngine({ model: EHTModel, params });
  engine.init();

  // Collect snapshots
  const snapshots: BatchSnapshot[] = [];
  let nextSampleIndex = 0;
  let lastProgressTime = -1;

  const seed = params.general.random_seed;
  const endTime = params.general.t_end;

  // Check if we should sample at t=0
  if (timeSamples.length > 0 && timeSamples[0] <= 0) {
    const rows = EHTModel.getSnapshot(engine.getState() as any);
    const snapshot: BatchSnapshot = {
      run_index: 0,
      seed,
      time_h: 0,
      sampled_params: {},
      data: rows
    };
    snapshots.push(snapshot);
    nextSampleIndex = 1;
  }

  // Run simulation with progress reporting
  while (!engine.isComplete() && nextSampleIndex < timeSamples.length) {
    engine.step();
    // Generic engine state is unknown type properly, cast to any for t access unless using generic
    const state = engine.getState() as any;
    const t = state.t ?? 0;

    // Progress reporting every 1.0h
    const currentHour = Math.floor(t);
    if (currentHour > lastProgressTime) {
      lastProgressTime = currentHour;
      console.error(formatProgress(t, endTime));
    }

    // Check if we've reached a sample time
    while (
      nextSampleIndex < timeSamples.length &&
      t >= timeSamples[nextSampleIndex]
    ) {
      const rows = EHTModel.getSnapshot(state);
      const snapshot: BatchSnapshot = {
        run_index: 0,
        seed,
        time_h: timeSamples[nextSampleIndex],
        sampled_params: {},
        data: rows
      };
      snapshots.push(snapshot);
      nextSampleIndex++;
    }
  }

  // Continue running to completion if we've collected all samples but simulation isn't done
  while (!engine.isComplete()) {
    engine.step();
    const state = engine.getState() as SimulationState;

    // Progress reporting every 1.0h
    const currentHour = Math.floor(state.t);
    if (currentHour > lastProgressTime) {
      lastProgressTime = currentHour;
      console.error(formatProgress(state.t, endTime));
    }
  }

  console.error(`Simulation complete. Collected ${snapshots.length} snapshots.`);

  // Output CSV
  const csv = snapshotsToCSV(snapshots);
  writeOutput(csv, parsed.output);
}
