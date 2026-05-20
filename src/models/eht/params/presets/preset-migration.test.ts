import { describe, expect, it } from 'vitest';
import { EHT_PRESETS } from '../defaults';
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
});
