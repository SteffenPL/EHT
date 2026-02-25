import { describe, it, expect } from 'vitest';
import { parseNumericText, formatNumericValue } from '../numericParse';

describe('parseNumericText', () => {
  it('parses regular numbers', () => {
    expect(parseNumericText('3.14')).toBe(3.14);
    expect(parseNumericText('-2.5')).toBe(-2.5);
    expect(parseNumericText('0')).toBe(0);
    expect(parseNumericText('42')).toBe(42);
  });

  it('parses infinity', () => {
    expect(parseNumericText('inf')).toBe(Infinity);
    expect(parseNumericText('Inf')).toBe(Infinity);
    expect(parseNumericText('infinity')).toBe(Infinity);
    expect(parseNumericText('-inf')).toBe(-Infinity);
    expect(parseNumericText('-Inf')).toBe(-Infinity);
    expect(parseNumericText('-infinity')).toBe(-Infinity);
  });

  it('parses scientific notation', () => {
    expect(parseNumericText('1e3')).toBe(1000);
    expect(parseNumericText('2.5e-1')).toBe(0.25);
  });

  it('returns null for invalid input', () => {
    expect(parseNumericText('')).toBeNull();
    expect(parseNumericText('abc')).toBeNull();
    expect(parseNumericText('--2')).toBeNull();
    expect(parseNumericText('1.2.3')).toBeNull();
  });

  it('handles whitespace', () => {
    expect(parseNumericText('  3.14  ')).toBe(3.14);
    expect(parseNumericText('  inf  ')).toBe(Infinity);
  });
});

describe('formatNumericValue', () => {
  it('formats infinity', () => {
    expect(formatNumericValue(Infinity)).toBe('inf');
    expect(formatNumericValue(-Infinity)).toBe('-inf');
  });

  it('formats regular numbers', () => {
    expect(formatNumericValue(0)).toBe('0');
    expect(formatNumericValue(3.14)).toBe('3.14');
    expect(formatNumericValue(-2.5)).toBe('-2.5');
  });
});
