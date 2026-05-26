import { describe, expect, it } from 'vitest';
import { mergeWithDefaults } from '@/core/params/merge';
import { parseSimulationConfigToml, toToml } from '@/core/params/toml';
import { DEFAULT_EHT_PARAMS, LEGACY_DEFAULT_EHT_PARAMS } from './defaults';
import { EHT_PARAM_FORMAT_VERSION, micronParamsToLegacy } from './unit-conversion';

describe('EHT v2 micron parameter migration', () => {
  it('loads v1.5 length values as v2 public microns', () => {
    const params = mergeWithDefaults({
      metadata: { model: 'EHT', version: '1.5.0' },
      general: {
        perimeter: 20,
        w_init: 10,
        h_init: 4,
      },
      cell_types: {
        control: {
          R_soft: 1,
          R_hard: 0.4,
          R_hard_div: 0.7,
        },
      },
    });

    expect(params.metadata.version).toBe(EHT_PARAM_FORMAT_VERSION);
    expect(params.metadata.unit_system).toBe('microns');
    expect(params.metadata.migrated_from).toBe('1.5.0');
    expect(params.general.perimeter).toBe(100);
    expect(params.general.w_init).toBe(50);
    expect(params.general.h_init).toBe(20);
    expect(params.cell_types.control.R_soft).toBe(5);
    expect(params.cell_types.control.R_hard).toBe(2);
    expect(params.cell_types.control.R_hard_div).toBe(3.5);
  });

  it('does not scale a v2 config again on repeated load/save', () => {
    const toml = toToml(DEFAULT_EHT_PARAMS);
    const reloaded = mergeWithDefaults(DEFAULT_EHT_PARAMS);

    expect(toml).toContain('version = "2.0.0"');
    expect(reloaded.general.perimeter).toBe(DEFAULT_EHT_PARAMS.general.perimeter);
    expect(reloaded.cell_types.control.R_soft).toBe(DEFAULT_EHT_PARAMS.cell_types.control.R_soft);
  });

  it('converts migrated params back to the original legacy engine values', () => {
    const migrated = mergeWithDefaults(LEGACY_DEFAULT_EHT_PARAMS);
    const engine = micronParamsToLegacy(migrated);

    expect(engine.general.perimeter).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.general.perimeter);
    expect(engine.general.w_init).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.general.w_init);
    expect(engine.cell_types.control.R_soft).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.cell_types.control.R_soft);
    expect(engine.cell_types.control.stiffness_repulsion).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.cell_types.control.stiffness_repulsion);
  });

  it('migrates legacy parameter ranges for length paths only', () => {
    const config = parseSimulationConfigToml(`
[metadata]
model = "EHT"
version = "1.5.0"

[general]
perimeter = 20

[[parameter_ranges]]
path = "general.perimeter"
min = 10
max = 20
steps = 2

[[parameter_ranges]]
path = "cell_types.control.R_soft"
min = 1
max = 2
steps = 2

[[parameter_ranges]]
path = "cell_types.control.stiffness_repulsion"
min = 2
max = 4
steps = 2
`);

    expect(config.params.metadata.version).toBe(EHT_PARAM_FORMAT_VERSION);
    expect(config.parameterRanges[0]).toMatchObject({ path: 'general.perimeter', min: 50, max: 100 });
    expect(config.parameterRanges[1]).toMatchObject({ path: 'cell_types.control.R_soft', min: 5, max: 10 });
    expect(config.parameterRanges[2]).toMatchObject({ path: 'cell_types.control.stiffness_repulsion', min: 2, max: 4 });
  });

  it('flags length-target formulas for manual curation during legacy migration', () => {
    const params = mergeWithDefaults({
      metadata: { model: 'EHT', version: '1.5.0' },
      cell_types: {
        control: {
          formulas: {
            R_soft: '1.2 + 0.1 * sin(t)',
          },
        },
      },
    });

    expect(params.metadata.curation_warnings?.join('\n')).toContain('cell_types.control.R_soft');
  });

  it('loads deprecated single external_force as the first external_forces row', () => {
    const params = mergeWithDefaults({
      metadata: { model: 'EHT', version: '2.0.0', unit_system: 'microns' },
      cell_types: {
        control: {
          external_force: '5 * N',
        },
      },
    });

    expect(params.cell_types.control.external_forces).toEqual(['5 * N', '0', '0']);
    expect(params.cell_types.control.external_force).toBeUndefined();
  });

  it('preserves curated Eric micron-profile values', () => {
    const params = mergeWithDefaults({
      metadata: {
        model: 'EHT',
        version: '1.0.0',
        unit_system: 'microns',
      },
      general: {
        perimeter: 200,
      },
      cell_types: {
        control: {
          R_soft: 8,
          R_hard: 5,
        },
      },
    });

    expect(params.metadata.version).toBe(EHT_PARAM_FORMAT_VERSION);
    expect(params.general.perimeter).toBe(200);
    expect(params.cell_types.control.R_soft).toBe(8);
    expect(params.cell_types.control.R_hard).toBe(5);
  });
});
