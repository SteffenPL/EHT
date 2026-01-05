/**
 * Batch simulation types.
 */

/** Minimal cell snapshot for batch storage */
export interface CellSnapshotMinimal {
  id: number;
  type: string; // 'control' | 'emt'
  pos_x: number;
  pos_y: number;
  A_x: number;
  A_y: number;
  B_x: number;
  B_y: number;
  has_A: boolean;
  has_B: boolean;
  phase: number;
  age: number;
  apical_neighbors: string; // comma-separated IDs, e.g., "10,12"
  basal_neighbors: string; // comma-separated IDs, e.g., "20,1"
}

/** Single snapshot from a batch run */
export interface BatchSnapshot {
  run_index: number;
  seed: number;
  time_h: number;
  sampled_params: Record<string, number>;
  cells: CellSnapshotMinimal[];
}

/** Parameter range for batch sweeps */
export interface ParameterRange {
  path: string; // e.g., "general.N_emt" or "cell_types.emt.k_A"
  min: number;
  max: number;
  steps: number;
}

/** Time sample configuration */
export interface TimeSampleConfig {
  start: number; // hours
  end: number; // hours
  step: number; // hours
}

/** Batch configuration */
export interface BatchConfig {
  parameter_ranges: ParameterRange[];
  time_samples: TimeSampleConfig;
  seeds_per_config: number;
  sampling_mode: 'grid' | 'random';
  random_sample_count?: number; // only used if sampling_mode is 'random'
}

/** Full batch data (in memory) */
export interface BatchData {
  config: BatchConfig;
  snapshots: BatchSnapshot[];
  completed_runs: number;
  total_runs: number;
}

/** Batch run progress */
export interface BatchProgress {
  current_run: number;
  total_runs: number;
  current_config: Record<string, number>;
  is_running: boolean;
  is_complete: boolean;
}

/** Result of computing statistics */
export interface StatisticsResult {
  columns: string[]; // Column headers
  rows: (string | number)[][]; // Data rows
}

/** Get time sample points from config */
export function getTimeSamples(config: TimeSampleConfig): number[] {
  const samples: number[] = [];
  for (let t = config.start; t <= config.end; t += config.step) {
    samples.push(t);
  }
  return samples;
}

/** Generate parameter configurations from ranges */
export function generateParameterConfigs(
  ranges: ParameterRange[],
  mode: 'grid' | 'random',
  randomCount?: number
): Record<string, number>[] {
  if (ranges.length === 0) {
    return [{}];
  }

  if (mode === 'grid') {
    return generateGridConfigs(ranges);
  } else {
    return generateRandomConfigs(ranges, randomCount ?? 10);
  }
}

function generateGridConfigs(ranges: ParameterRange[]): Record<string, number>[] {
  // Generate values for each range
  const rangeValues: { path: string; values: number[] }[] = ranges.map((r) => {
    const values: number[] = [];
    const stepSize = r.steps > 1 ? (r.max - r.min) / (r.steps - 1) : 0;
    for (let i = 0; i < r.steps; i++) {
      values.push(r.min + i * stepSize);
    }
    return { path: r.path, values };
  });

  // Cartesian product
  const configs: Record<string, number>[] = [];

  function recurse(index: number, current: Record<string, number>) {
    if (index === rangeValues.length) {
      configs.push({ ...current });
      return;
    }

    const { path, values } = rangeValues[index];
    for (const value of values) {
      current[path] = value;
      recurse(index + 1, current);
    }
  }

  recurse(0, {});
  return configs;
}

function generateRandomConfigs(
  ranges: ParameterRange[],
  count: number
): Record<string, number>[] {
  const configs: Record<string, number>[] = [];

  for (let i = 0; i < count; i++) {
    const config: Record<string, number> = {};
    for (const r of ranges) {
      config[r.path] = r.min + Math.random() * (r.max - r.min);
    }
    configs.push(config);
  }

  return configs;
}
