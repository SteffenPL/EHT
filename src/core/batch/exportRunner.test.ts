import { describe, expect, it } from 'vitest';
import { formatBatchRunDirectory } from './exportRunner';

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
