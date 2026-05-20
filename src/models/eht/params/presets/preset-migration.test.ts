import { describe, expect, it } from 'vitest';
import { DEFAULT_EHT_PARAMS, EHT_PRESETS } from '../defaults';
import { EHT_PARAM_FORMAT_VERSION } from '../unit-conversion';

describe('EHT preset v2 migration', () => {
  it('loads every bundled preset as v2 public micron params', () => {
    expect(EHT_PRESETS.length).toBeGreaterThan(0);

    for (const preset of EHT_PRESETS) {
      const params = preset.create();
      expect(params.metadata.version, preset.key).toBe(EHT_PARAM_FORMAT_VERSION);
      expect(params.metadata.unit_system, preset.key).toBe('microns');
      expect(params.general.perimeter, preset.key).toBeGreaterThan(0);
      for (const [typeName, cellType] of Object.entries(params.cell_types)) {
        expect(cellType.R_soft, `${preset.key}:${typeName}:R_soft`).toBeGreaterThan(0);
        expect(cellType.R_hard, `${preset.key}:${typeName}:R_hard`).toBeGreaterThan(0);
      }
    }
  });

  it('preserves Eric preset public perimeters promised by their group labels', () => {
    const ericPresets = EHT_PRESETS.filter((preset) => preset.group.startsWith('eric/'));
    expect(ericPresets.length).toBeGreaterThan(0);

    for (const preset of ericPresets) {
      const promised = preset.group.match(/\((\d+)\s*µ?m\)/)?.[1];
      if (!promised) continue;

      const params = preset.create();
      expect(params.general.perimeter, preset.key).toBe(Number(promised));
    }
  });

  it('uses a heartbeat-driven formula for the oscillating perimeter preset', () => {
    const preset = EHT_PRESETS.find((candidate) => candidate.label === 'Oscillating Perimeter');
    expect(preset).toBeDefined();

    const params = preset!.create();
    const emt = params.cell_types.emt;

    expect(preset!.key).toBe('oscillating_perimeter');
    expect(params.general.perimeter).toBe(DEFAULT_EHT_PARAMS.general.perimeter);
    expect(params.general.t_end).toBe(DEFAULT_EHT_PARAMS.general.t_end);
    expect(params.general.full_circle).toBe(DEFAULT_EHT_PARAMS.general.full_circle);
    expect(emt.R_soft).toBe(DEFAULT_EHT_PARAMS.cell_types.emt.R_soft);
    expect(params.constants.heartbeat).toBe(10);
    expect(params.general.formulas.perimeter).toBe('sinwave(t, period=heartbeat, from=init_value * 0.95, to=init_value * 1.05)');
    expect(emt.formulas.R_soft).toBeUndefined();
    expect(
      emt.events_v2?.some(
        (event) => event.type === 'parameter_change'
          && event.target_parameter === 'R_soft'
          && event.id === 'oscillate_r_soft'
      )
    ).toBe(false);
  });
});
