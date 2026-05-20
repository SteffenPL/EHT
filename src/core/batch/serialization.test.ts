import { describe, expect, it } from 'vitest';
import { parseSimulationConfigToml, toSimulationConfigToml } from '@/core/params/toml';
import { DEFAULT_EHT_PARAMS } from '@/models/eht/params/defaults';

describe('batch config TOML unit migration', () => {
  it('migrates legacy length ranges to public microns', () => {
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
path = "cell_types.control.stiffness_repulsion"
min = 1
max = 2
steps = 2
`);

    expect(config.params.metadata.version).toBe('2.0.0');
    expect(config.parameterRanges[0]).toMatchObject({ min: 50, max: 100 });
    expect(config.parameterRanges[1]).toMatchObject({ min: 1, max: 2 });
  });

  it('serializes v2 public values without converting them to engine units', () => {
    const toml = toSimulationConfigToml({
      params: DEFAULT_EHT_PARAMS,
      parameterRanges: [
        { path: 'general.perimeter', min: 100, max: 200, steps: 2 },
      ],
      timeSamples: { start: 0, end: 12, step: 12 },
      seedsPerConfig: 1,
    });

    expect(toml).toContain('version = "2.0.0"');
    expect(toml).toContain('perimeter = 525');
    expect(toml).toContain('min = 100');
    expect(toml).toContain('max = 200');
  });
});
