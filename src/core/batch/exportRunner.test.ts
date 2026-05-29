import { describe, expect, it } from 'vitest';
import { parseSimulationConfigToml, parseToml } from '@/core/params/toml';
import { DEFAULT_EHT_PARAMS } from '@/models/eht/params/defaults';
import type { BatchConfig } from './types';
import { createBatchConfigToml, createRunDiffToml, formatBatchRunDirectory } from './exportRunner';

const batchConfig: BatchConfig = {
  parameter_ranges: [
    { path: 'general.t_end', min: 12, max: 24, steps: 2 },
    { path: 'cell_types.control.diffusion', min: 0.1, max: 0.3, steps: 3 },
  ],
  time_samples: { start: 0, end: 24, step: 12 },
  seeds_per_config: 3,
  sampling_mode: 'grid',
};

describe('formatBatchRunDirectory', () => {
  it('formats run folders from varied parameter values and seed', () => {
    expect(formatBatchRunDirectory(
      {
        'general.dt': 0.25,
        'cell_types.control.R_soft': 12.5,
      },
      43,
      ['general.dt', 'cell_types.control.R_soft']
    )).toBe('run_dt0p25_R_soft12p5_seed43');
  });

  it('uses the batch parameter order instead of object insertion order', () => {
    expect(formatBatchRunDirectory(
      {
        'general.N_emt': 4,
        'general.dt': 0.5,
      },
      9,
      ['general.dt', 'general.N_emt']
    )).toBe('run_dt0p5_N_emt4_seed9');
  });

  it('disambiguates duplicated parameter leaf names with their full paths', () => {
    expect(formatBatchRunDirectory(
      {
        'cell_types.control.R_soft': 10,
        'cell_types.emt.R_soft': 20,
      },
      5,
      ['cell_types.control.R_soft', 'cell_types.emt.R_soft']
    )).toBe('run_cell_types_control_R_soft10_cell_types_emt_R_soft20_seed5');
  });

  it('keeps no-parameter batch runs seed-addressable', () => {
    expect(formatBatchRunDirectory({}, 101, [])).toBe('run_seed101');
  });

  it('sanitizes decimal, negative, and exponential numeric values', () => {
    expect(formatBatchRunDirectory(
      {
        'general.dt': 1e-7,
        'events.force': -0.25,
      },
      -3,
      ['general.dt', 'events.force']
    )).toBe('run_dt1em7_forcem0p25_seedm3');
  });
});

describe('batch export TOML files', () => {
  it('writes the global config as a full simulation config with batch settings', () => {
    const toml = createBatchConfigToml(DEFAULT_EHT_PARAMS, batchConfig);
    const parsed = parseSimulationConfigToml(toml);
    const raw = parseToml(toml);

    expect(parsed.params.general.t_end).toBe(DEFAULT_EHT_PARAMS.general.t_end);
    expect(parsed.params.cell_types.control.diffusion).toBe(DEFAULT_EHT_PARAMS.cell_types.control.diffusion);
    expect(parsed.parameterRanges).toEqual(batchConfig.parameter_ranges);
    expect(parsed.timeSamples).toEqual(batchConfig.time_samples);
    expect(parsed.seedsPerConfig).toBe(batchConfig.seeds_per_config);
    expect(raw.sampling_mode).toBe('grid');
  });

  it('preserves random sampling batch settings when present', () => {
    const toml = createBatchConfigToml(DEFAULT_EHT_PARAMS, {
      ...batchConfig,
      sampling_mode: 'random',
      random_sample_count: 7,
    });
    const raw = parseToml(toml);

    expect(raw.sampling_mode).toBe('random');
    expect(raw.random_sample_count).toBe(7);
  });

  it('writes each run config as the same full config with run-specific parameter values', () => {
    const runParams = structuredClone(DEFAULT_EHT_PARAMS);
    runParams.general.t_end = 12;
    runParams.cell_types.control.diffusion = 0.3;
    runParams.general.random_seed = 44;

    const toml = createBatchConfigToml(runParams, batchConfig);
    const parsed = parseSimulationConfigToml(toml);
    const raw = parseToml(toml);

    expect(parsed.params.general.t_end).toBe(12);
    expect(parsed.params.cell_types.control.diffusion).toBe(0.3);
    expect(parsed.params.general.random_seed).toBe(44);
    expect(parsed.parameterRanges).toEqual(batchConfig.parameter_ranges);
    expect(parsed.timeSamples).toEqual(batchConfig.time_samples);
    expect(parsed.seedsPerConfig).toBe(batchConfig.seeds_per_config);
    expect(raw.sampling_mode).toBe('grid');
  });

  it('writes a per-run diff with only sampled parameters and the run seed', () => {
    const toml = createRunDiffToml(
      {
        'general.t_end': 12,
        'cell_types.control.diffusion': 0.3,
      },
      44
    );
    const parsed = parseToml(toml);

    expect(parsed).toEqual({
      general: {
        t_end: 12,
        random_seed: 44,
      },
      cell_types: {
        control: {
          diffusion: 0.3,
        },
      },
    });
    expect(toml).not.toContain('parameter_ranges');
    expect(toml).not.toContain('time_samples');
    expect(toml).not.toContain('seeds_per_config');
  });
});
