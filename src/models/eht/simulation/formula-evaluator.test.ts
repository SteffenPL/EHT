import { beforeEach, describe, expect, it } from 'vitest';
import { CircularGeometry } from '@/core/math/basal-geometry';
import { Vector2 } from '@/core/math/vector2';
import {
  clearFormulaEvaluationCache,
  evaluateCompiledFormula,
  getFormulaEvaluationCacheSize,
} from './formula-evaluator';
import { evaluateExternalForceAtPosition } from './external-force-formula';

describe('formula evaluator cache', () => {
  beforeEach(() => {
    clearFormulaEvaluationCache();
  });

  it('reuses compiled formulas while evaluating against fresh scopes', () => {
    expect(evaluateCompiledFormula('init_value + t', { init_value: 2, t: 1 })).toBe(3);
    expect(getFormulaEvaluationCacheSize()).toBe(1);

    expect(evaluateCompiledFormula('init_value + t', { init_value: 2, t: 5 })).toBe(7);
    expect(getFormulaEvaluationCacheSize()).toBe(1);
  });

  it('caches the effective external force formula across repeated evaluations', () => {
    const basalGeometry = new CircularGeometry(0.06, 0.06);
    const position = new Vector2(5, 0);

    evaluateExternalForceAtPosition({
      formula: 'init_value * (1 + t)',
      initValue: 10,
      position,
      basalGeometry,
      t: 1,
    });
    expect(getFormulaEvaluationCacheSize()).toBe(1);

    evaluateExternalForceAtPosition({
      formula: 'init_value * (1 + t)',
      initValue: 10,
      position,
      basalGeometry,
      t: 2,
    });
    expect(getFormulaEvaluationCacheSize()).toBe(1);
  });
});
