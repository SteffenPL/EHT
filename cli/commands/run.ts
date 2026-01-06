/**
 * CLI command for running a single simulation.
 */

import * as fs from 'fs';
import { SimulationEngine } from '../../src/core/simulation/engine';
import { createDefaultParams } from '../../src/core/params/defaults';
import { parseTomlWithDefaults } from '../../src/core/params/toml';
import { setNestedValue } from '../../src/core/params/merge';
import { createSnapshot } from '../../src/core/snapshot';
import type { SimulationParams, SimulationState } from '../../src/core/types';
import type { BatchSnapshot } from '../../src/core/batch/types';
import { parseArgs, generateTimeSamples } from '../utils/args';
import { snapshotsToCSV, writeOutput, formatProgress } from '../utils/output';

/**
 * Run a single simulation from the CLI.
 */
export async function runCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  // Load base parameters
  let params: SimulationParams;
  if (parsed.config) {
    const tomlContent = fs.readFileSync(parsed.config, 'utf-8');
    params = parseTomlWithDefaults(tomlContent);
    console.error(`Loaded config from: ${parsed.config}`);
  } else {
    params = createDefaultParams();
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
  const engine = new SimulationEngine({ params });
  engine.init();

  // Collect snapshots
  const snapshots: BatchSnapshot[] = [];
  let nextSampleIndex = 0;
  let lastProgressTime = -1;

  const seed = params.general.random_seed;
  const endTime = params.general.t_end;

  // Check if we should sample at t=0
  if (timeSamples.length > 0 && timeSamples[0] <= 0) {
    const snapshot = createSnapshot(engine.getState() as SimulationState, {
      runIndex: 0,
      seed,
      sampledParams: {},
    });
    snapshots.push(snapshot);
    nextSampleIndex = 1;
  }

  // Run simulation with progress reporting
  while (!engine.isComplete() && nextSampleIndex < timeSamples.length) {
    engine.step();
    const state = engine.getState() as SimulationState;

    // Progress reporting every 1.0h
    const currentHour = Math.floor(state.t);
    if (currentHour > lastProgressTime) {
      lastProgressTime = currentHour;
      console.error(formatProgress(state.t, endTime));
    }

    // Check if we've reached a sample time
    while (
      nextSampleIndex < timeSamples.length &&
      state.t >= timeSamples[nextSampleIndex]
    ) {
      const snapshot = createSnapshot(state, {
        runIndex: 0,
        seed,
        sampledParams: {},
      });
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
