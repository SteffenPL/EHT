import { describe, expect, it } from 'vitest';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import { toEHTEngineParams } from './engine-params';
import { evaluateUnitAwareFormula } from './formula-units';

describe('evaluateUnitAwareFormula', () => {
  it('evaluates v2 length-target formulas in public microns and returns engine units', () => {
    const engineParams = toEHTEngineParams(DEFAULT_EHT_PARAMS);
    const result = evaluateUnitAwareFormula({
      formula: 'old_value + 5',
      targetParameter: 'R_soft',
      oldValue: engineParams.cell_types.control.R_soft,
      initValue: engineParams.cell_types.control.R_soft,
      t: 0,
      dt: 0,
      params: engineParams,
      cellTypeParams: engineParams.cell_types.control,
    });

    expect(result).toBeCloseTo(engineParams.cell_types.control.R_soft + 1);
  });

  it('scales length-like scope variables for length targets only', () => {
    const engineParams = toEHTEngineParams(DEFAULT_EHT_PARAMS);
    const result = evaluateUnitAwareFormula({
      formula: 'h_init + w_init + R_hard_div',
      targetParameter: 'R_hard',
      oldValue: engineParams.cell_types.control.R_hard,
      t: 0,
      dt: 0,
      params: engineParams,
      cellTypeParams: engineParams.cell_types.control,
    });

    expect(result).toBeCloseTo(
      engineParams.general.h_init
      + engineParams.general.w_init
      + engineParams.cell_types.control.R_hard_div
    );
  });

  it('leaves dimensionless target formulas in engine scope', () => {
    const engineParams = toEHTEngineParams(DEFAULT_EHT_PARAMS);
    const result = evaluateUnitAwareFormula({
      formula: 'h_init',
      targetParameter: 'aspect_ratio',
      oldValue: engineParams.general.aspect_ratio,
      t: 0,
      dt: 0,
      params: engineParams,
    });

    expect(result).toBe(engineParams.general.h_init);
  });
});
