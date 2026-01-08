/**
 * CLI command for running batch simulations.
 */

import * as fs from 'fs';
import { SimulationEngine } from '../../src/core/simulation/engine';
import { parseSimulationConfigToml } from '../../src/core/params/toml';
import { createDefaultSimulationConfig } from '../../src/core/params/config';
import { setNestedValue } from '../../src/core/params/merge';
// import { createSnapshot } from '../../src/core/snapshot';
import { generateParameterConfigs, getTimeSamples } from '../../src/core/batch/types';
// import type { SimulationParams, SimulationState } from '../../src/core/types';
import type { BatchSnapshot } from '../../src/core/batch/types';
import { parseArgs } from '../utils/args';
import { snapshotsToCSV, writeOutput, formatProgress } from '../utils/output';
import { cloneDeep } from 'lodash-es';

import { EHTModel } from '../../src/models/eht';
import type { EHTParams } from '../../src/models/eht/params/types';

/**
 * Run a single simulation and collect snapshots at specified times.
 */
function runSingleSimulation(
  baseParams: EHTParams,
  overrides: Record<string, number>,
  seed: number,
  timeSamples: number[],
  runIndex: number,
  totalRuns: number,
  endTime: number
): BatchSnapshot[] {
  // Apply parameter overrides
  const params = cloneDeep(baseParams);
  for (const [path, value] of Object.entries(overrides)) {
    setNestedValue(params, path, value);
  }
  params.general.random_seed = seed;

  // Create engine
  const engine = new SimulationEngine({ model: EHTModel, params });
  engine.init();

  const snapshots: BatchSnapshot[] = [];
  let nextSampleIndex = 0;
  let lastProgressTime = -1;

  // Check if we should sample at t=0
  if (timeSamples.length > 0 && timeSamples[0] <= 0) {
    const rows = EHTModel.getSnapshot(engine.getState() as any);
    const snapshot: BatchSnapshot = {
      run_index: runIndex,
      seed,
      time_h: 0,
      sampled_params: overrides,
      data: rows
    };
    snapshots.push(snapshot);
    nextSampleIndex = 1;
  }

  // Run simulation
  while (!engine.isComplete() && nextSampleIndex < timeSamples.length) {
    engine.step();
    const state = engine.getState() as any;
    const t = state.t ?? 0;

    // Progress reporting every 1.0h
    const currentHour = Math.floor(t);
    if (currentHour > lastProgressTime) {
      lastProgressTime = currentHour;
      console.error(formatProgress(t, endTime, runIndex, totalRuns));
    }

    // Check if we've reached a sample time
    while (
      nextSampleIndex < timeSamples.length &&
      t >= timeSamples[nextSampleIndex]
    ) {
      const rows = EHTModel.getSnapshot(state);
      const snapshot: BatchSnapshot = {
        run_index: runIndex,
        seed,
        time_h: timeSamples[nextSampleIndex],
        sampled_params: overrides,
        data: rows
      };
      snapshots.push(snapshot);
      nextSampleIndex++;
    }
  }

  return snapshots;
}

/**
 * Run batch simulations from the CLI.
 */
export async function batchCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  // Load configuration
  let config;
  if (parsed.config) {
    const tomlContent = fs.readFileSync(parsed.config, 'utf-8');
    config = parseSimulationConfigToml(tomlContent);
    console.error(`Loaded config from: ${parsed.config}`);
  } else {
    config = createDefaultSimulationConfig();
    console.error('Using default configuration');
  }

  const { params, parameterRanges, timeSamples, seedsPerConfig } = config;

  // Generate parameter configurations
  const paramConfigs = generateParameterConfigs(parameterRanges, 'grid');
  const timeSampleArray = getTimeSamples(timeSamples);
  const totalRuns = paramConfigs.length * seedsPerConfig;

  console.error(`Parameter ranges: ${parameterRanges.length}`);
  console.error(`Parameter configurations: ${paramConfigs.length}`);
  console.error(`Seeds per config: ${seedsPerConfig}`);
  console.error(`Total runs: ${totalRuns}`);
  console.error(`Time samples: ${timeSampleArray.join(', ')}h`);

  // Collect all snapshots
  const allSnapshots: BatchSnapshot[] = [];
  let runIndex = 0;

  for (const paramConfig of paramConfigs) {
    for (let seedOffset = 0; seedOffset < seedsPerConfig; seedOffset++) {
      const seed = params.general.random_seed + seedOffset;

      console.error(`\nStarting run ${runIndex + 1}/${totalRuns} (seed=${seed})`);
      if (Object.keys(paramConfig).length > 0) {
        console.error(`  Params: ${JSON.stringify(paramConfig)}`);
      }

      const snapshots = runSingleSimulation(
        params,
        paramConfig,
        seed,
        timeSampleArray,
        runIndex,
        totalRuns,
        params.general.t_end
      );

      allSnapshots.push(...snapshots);
      runIndex++;
    }
  }

  console.error(`\nBatch complete. Collected ${allSnapshots.length} snapshots from ${totalRuns} runs.`);

  // Output CSV
  const csv = snapshotsToCSV(allSnapshots);
  writeOutput(csv, parsed.output);
}
