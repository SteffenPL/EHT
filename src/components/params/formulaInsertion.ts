const NO_IMPLICIT_MULTIPLY_BEFORE_PRESET = new Set(['+', '-', '*', '/', '^', '(', '[', '{', ',']);

export interface FormulaInsertionResult {
  formula: string;
  cursorPosition: number;
}

function clampSelectionIndex(index: number, formulaLength: number): number {
  return Math.max(0, Math.min(index, formulaLength));
}

export function shouldPrefixPresetWithMultiplication(formula: string, insertionIndex: number): boolean {
  const beforeCursor = formula.slice(0, clampSelectionIndex(insertionIndex, formula.length));
  const previousToken = beforeCursor.match(/\S\s*$/)?.[0]?.trim();

  return !!previousToken && !NO_IMPLICIT_MULTIPLY_BEFORE_PRESET.has(previousToken);
}

export function insertFormulaText(
  formula: string,
  text: string,
  selectionStart: number,
  selectionEnd: number,
  options: { implicitMultiply?: boolean } = {}
): FormulaInsertionResult {
  const start = clampSelectionIndex(selectionStart, formula.length);
  const end = clampSelectionIndex(Math.max(selectionStart, selectionEnd), formula.length);
  const prefix = options.implicitMultiply && shouldPrefixPresetWithMultiplication(formula, start) ? '*' : '';
  const insertedText = `${prefix}${text}`;

  return {
    formula: `${formula.slice(0, start)}${insertedText}${formula.slice(end)}`,
    cursorPosition: start + insertedText.length,
  };
}
