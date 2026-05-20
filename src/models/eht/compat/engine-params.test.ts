import { describe, expect, it } from 'vitest';
import { DEFAULT_EHT_PARAMS, LEGACY_DEFAULT_EHT_PARAMS } from '../params/defaults';
import { toEHTEngineParams } from './engine-params';

describe('toEHTEngineParams', () => {
  it('converts v2 public micron params to legacy engine values', () => {
    const engineParams = toEHTEngineParams(DEFAULT_EHT_PARAMS);

    expect(engineParams).not.toBe(DEFAULT_EHT_PARAMS);
    expect(engineParams.general.perimeter).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.general.perimeter);
    expect(engineParams.general.w_init).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.general.w_init);
    expect(engineParams.general.h_init).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.general.h_init);
    expect(engineParams.cell_types.control.R_soft).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.cell_types.control.R_soft);
    expect(engineParams.cell_types.control.R_hard).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.cell_types.control.R_hard);
    expect(engineParams.cell_types.control.diffusion).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.cell_types.control.diffusion);
    expect(engineParams.cell_types.control.stiffness_repulsion).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.cell_types.control.stiffness_repulsion);
  });

  it('leaves pre-v2 params in engine units', () => {
    const legacy = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    const engineParams = toEHTEngineParams(legacy);

    expect(engineParams).toEqual(legacy);
    expect(engineParams).not.toBe(legacy);
  });
});
