import { evaluate } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { FORMULA_PRESETS } from './formula-presets';
import { formulaFunctions } from '../simulation/formula-functions';

describe('FORMULA_PRESETS', () => {
  it('includes a sine wave preset that oscillates between min and max values', () => {
    const preset = FORMULA_PRESETS.find(p => p.name === 'Sine Wave');

    expect(preset).toBeDefined();
    const formula = preset!.generate([10, 1, 2]);

    expect(evaluate(formula, { t: 0, ...formulaFunctions })).toBeCloseTo(1);
    expect(evaluate(formula, { t: 5, ...formulaFunctions })).toBeCloseTo(2);
    expect(evaluate(formula, { t: 10, ...formulaFunctions })).toBeCloseTo(1);
  });
});
