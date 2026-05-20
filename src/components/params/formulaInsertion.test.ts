import { describe, expect, it } from 'vitest';
import { insertFormulaText, shouldPrefixPresetWithMultiplication } from './formulaInsertion';

describe('formula preset insertion', () => {
  it('prefixes preset text with multiplication after an existing value', () => {
    const result = insertFormulaText('old_value', 'triangle(t, period=10, min=1, max=2)', 9, 9, {
      implicitMultiply: true,
    });

    expect(result.formula).toBe('old_value*triangle(t, period=10, min=1, max=2)');
    expect(result.cursorPosition).toBe(result.formula.length);
  });

  it('does not prefix preset text after arithmetic operators', () => {
    for (const operator of ['+', '-', '*', '/']) {
      expect(
        insertFormulaText(`old_value ${operator} `, 'triangle(t, period=10, min=1, max=2)', 12, 12, {
          implicitMultiply: true,
        }).formula
      ).toBe(`old_value ${operator} triangle(t, period=10, min=1, max=2)`);
    }
  });

  it('uses the last non-whitespace token before the cursor', () => {
    expect(shouldPrefixPresetWithMultiplication('2   ', 4)).toBe(true);
    expect(shouldPrefixPresetWithMultiplication('2 +   ', 6)).toBe(false);
  });

  it('leaves ordinary insertions unchanged', () => {
    expect(insertFormulaText('old_value', 't', 9, 9).formula).toBe('old_valuet');
  });
});
