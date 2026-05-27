export type FormulaInitMode = 'ignore' | 'add' | 'multiply';

export interface ParsedFormulaInitMode {
  mode: FormulaInitMode;
  expression: string;
}

const INIT_VALUE_PATTERN = 'init_value';

function hasBalancedOuterParens(value: string): boolean {
  if (!value.startsWith('(') || !value.endsWith(')')) return false;

  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth === 0 && i < value.length - 1) return false;
    if (depth < 0) return false;
  }

  return depth === 0;
}

function stripOuterParens(value: string): string {
  let next = value.trim();
  while (hasBalancedOuterParens(next)) {
    next = next.slice(1, -1).trim();
  }
  return next;
}

export function parseFormulaInitMode(formula: string): ParsedFormulaInitMode {
  const trimmed = formula.trim();
  if (!trimmed || trimmed === INIT_VALUE_PATTERN) {
    return { mode: 'multiply', expression: '1' };
  }

  const initPrefix = new RegExp(`^${INIT_VALUE_PATTERN}\\s*([+*])\\s*(.+)$`);
  const match = trimmed.match(initPrefix);
  if (!match) {
    return { mode: 'ignore', expression: trimmed };
  }

  return {
    mode: match[1] === '+' ? 'add' : 'multiply',
    expression: stripOuterParens(match[2]),
  };
}

export function composeFormulaWithInitValue(mode: FormulaInitMode, expression: string): string {
  const trimmed = expression.trim();

  if (mode === 'ignore') return trimmed;
  if (mode === 'add') return `init_value + (${trimmed || '0'})`;
  return `init_value * (${trimmed || '1'})`;
}

export function formulaModeSymbol(mode: FormulaInitMode): string {
  if (mode === 'add') return '+';
  if (mode === 'multiply') return '*';
  return '/';
}

export function formatFormulaInitialValue(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return Number.isInteger(value) ? String(value) : Number(value.toPrecision(6)).toString();
}

export function summarizeFormulaWithInitValue(formula: string, initialValue: number): string {
  const parsed = parseFormulaInitMode(formula);
  const symbol = formulaModeSymbol(parsed.mode);
  const expression = parsed.expression.trim();

  if (parsed.mode === 'ignore') {
    return `${symbol} ${expression}`;
  }

  return `${formatFormulaInitialValue(initialValue)} ${symbol} (${expression})`;
}

export function formulaTermLabel(formula: string, maxLength = 3): string {
  const expression = stripOuterParens(parseFormulaInitMode(formula).expression).trim();
  if (!expression) return '';
  return expression.slice(0, maxLength);
}
