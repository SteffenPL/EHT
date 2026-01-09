/**
 * CLI command for running batch simulations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SimulationEngine } from '../../src/core/simulation/engine';
import { parseSimulationConfigToml } from '../../src/core/params/toml';
import { createDefaultSimulationConfig } from '../../src/core/params/config';
import { setNestedValue } from '../../src/core/params/merge';
import { generateParameterConfigs, getTimeSamples } from '../../src/core/batch/types';
import type { BatchSnapshot } from '../../src/core/batch/types';
import { parseArgs } from '../utils/args';
import { snapshotsToCSV, writeOutput, formatProgress } from '../utils/output';
import { cloneDeep } from 'lodash-es';

import { EHTModel } from '../../src/models/eht';
import { computeEHTStatistics } from '../../src/models/eht/statistics';
import type { EHTParams } from '../../src/models/eht/params/types';

/**
 * Compute statistics from batch snapshots.
 */
function computeStatisticsFromSnapshots(
  snapshots: BatchSnapshot[],
  baseParams: EHTParams
): { columns: string[]; rows: (string | number)[][] } {
  // Get parameter paths
  const paramPaths = new Set<string>();
  for (const s of snapshots) {
    for (const path of Object.keys(s.sampled_params)) {
      paramPaths.add(path);
    }
  }
  const sortedPaths = Array.from(paramPaths).sort();

  // Extract cell groups and base stat names from statistics
  const cellGroups = new Set<string>();
  const baseStatNames = new Set<string>();

  // Get all statistics from the model
  const allStatIds = (EHTModel.statistics || []).map(s => s.id);
  for (const statId of allStatIds) {
    const lastUnderscoreIdx = statId.lastIndexOf('_');
    if (lastUnderscoreIdx > 0) {
      const baseName = statId.substring(0, lastUnderscoreIdx);
      const group = statId.substring(lastUnderscoreIdx + 1);
      baseStatNames.add(baseName);
      cellGroups.add(group);
    }
  }

  const sortedGroups = Array.from(cellGroups).sort();
  const sortedBaseStats = Array.from(baseStatNames).sort();

  // Build columns
  const columns = [
    ...sortedPaths,
    'run_index',
    'seed',
    'time_h',
    'cell_group',
    ...sortedBaseStats,
  ];

  // Build rows - one row per (snapshot, cell_group)
  const rows: (string | number)[][] = [];
  for (const snapshot of snapshots) {
    // Apply sampled parameter overrides
    const snapshotParams = cloneDeep(baseParams);
    for (const [path, value] of Object.entries(snapshot.sampled_params)) {
      setNestedValue(snapshotParams, path, value);
    }

    const state = EHTModel.loadSnapshot(snapshot.data, snapshotParams);

    // Use computeEHTStatistics directly with params to get per-group statistics
    const allStats = computeEHTStatistics(state, snapshotParams);

    // Create one row per cell group
    for (const group of sortedGroups) {
      const row: (string | number)[] = [
        ...sortedPaths.map((p) => snapshot.sampled_params[p] ?? ''),
        snapshot.run_index,
        snapshot.seed,
        snapshot.time_h,
        group,
        ...sortedBaseStats.map((baseName) => {
          const fullStatId = `${baseName}_${group}`;
          return allStats[fullStatId] ?? 0;
        }),
      ];
      rows.push(row);
    }
  }

  return { columns, rows };
}

/**
 * Convert statistics to CSV format.
 */
function statisticsToCSV(columns: string[], rows: (string | number)[][]): string {
  const lines: string[] = [];
  lines.push(columns.join(','));
  for (const row of rows) {
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

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
      // Seed increments globally across all runs (not reset per config)
      const seed = params.general.random_seed + runIndex;

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

  // Output snapshots CSV
  const csv = snapshotsToCSV(allSnapshots);
  writeOutput(csv, parsed.output);

  // Compute and save statistics if requested or if output file is specified
  if (parsed.stats || parsed.output) {
    console.error('\nComputing statistics...');
    const { columns, rows } = computeStatisticsFromSnapshots(allSnapshots, params);
    const statsCSV = statisticsToCSV(columns, rows);

    // Determine output filename for statistics
    let statsOutput: string | undefined;
    if (parsed.output) {
      const outputPath = parsed.output;
      const dir = path.dirname(outputPath);
      const ext = path.extname(outputPath);
      const base = path.basename(outputPath, ext);
      statsOutput = path.join(dir, `${base}_statistics${ext}`);
    }

    writeOutput(statsCSV, statsOutput);
    console.error(`Statistics saved${statsOutput ? ` to: ${statsOutput}` : ''}`);
    console.error(`  ${rows.length} rows, ${columns.length} columns`);
  }
}
