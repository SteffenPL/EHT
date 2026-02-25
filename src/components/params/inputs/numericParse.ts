/**
 * Pure parsing utilities for numeric text inputs.
 * Handles floats, ints, "inf", "-inf", and scientific notation.
 */

/** Parse a text string into a number, returning null for invalid input. */
export function parseNumericText(text: string): number | null {
  const trimmed = text.trim().toLowerCase();
  if (trimmed === '') return null;
  if (trimmed === 'inf' || trimmed === 'infinity') return Infinity;
  if (trimmed === '-inf' || trimmed === '-infinity') return -Infinity;
  const parsed = Number(trimmed);
  if (isNaN(parsed)) return null;
  return parsed;
}

/** Format a number for display in a text input. */
export function formatNumericValue(value: number): string {
  if (value === Infinity) return 'inf';
  if (value === -Infinity) return '-inf';
  return String(value);
}
