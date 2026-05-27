import { describe, expect, it } from 'vitest';
import {
  composeFormulaWithInitValue,
  formulaTermLabel,
  parseFormulaInitMode,
  summarizeFormulaWithInitValue,
} from './formulaInitMode';

describe('formula init mode helpers', () => {
  it('defaults blank formulas to init_value multiplication', () => {
    expect(parseFormulaInitMode('')).toEqual({ mode: 'multiply', expression: '1' });
  });

  it('parses common init_value prefixes', () => {
    expect(parseFormulaInitMode('init_value + 0.2 * sin(t)')).toEqual({
      mode: 'add',
      expression: '0.2 * sin(t)',
    });
    expect(parseFormulaInitMode('init_value * (triangle(t, period=10, min=1, max=2))')).toEqual({
      mode: 'multiply',
      expression: 'triangle(t, period=10, min=1, max=2)',
    });
  });

  it('keeps complete formulas in ignore mode', () => {
    expect(parseFormulaInitMode('sinwave(t, from=init_value, to=init_value * 1.1)')).toEqual({
      mode: 'ignore',
      expression: 'sinwave(t, from=init_value, to=init_value * 1.1)',
    });
  });

  it('composes the effective formula', () => {
    expect(composeFormulaWithInitValue('ignore', '42')).toBe('42');
    expect(composeFormulaWithInitValue('add', 'sin(t)')).toBe('init_value + (sin(t))');
    expect(composeFormulaWithInitValue('multiply', '1 + 0.1 * sin(t)')).toBe('init_value * (1 + 0.1 * sin(t))');
  });

  it('summarizes active formulas for compact parameter cells', () => {
    expect(summarizeFormulaWithInitValue('init_value * (1 + t)', 12.345678)).toBe('12.3457 * (1 + t)');
    expect(summarizeFormulaWithInitValue('old_value - 1', 12)).toBe('/ old_value - 1');
  });

  it('labels formulas by the first three characters of the formula term', () => {
    expect(formulaTermLabel('init_value * (triangle(t, period=10, min=1, max=2))')).toBe('tri');
    expect(formulaTermLabel('old_value - 1')).toBe('old');
    expect(formulaTermLabel('(sin(t))')).toBe('sin');
  });
});
