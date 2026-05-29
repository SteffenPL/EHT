import { compile, type EvalFunction } from 'mathjs';

const formulaCache = new Map<string, EvalFunction>();

export function clearFormulaEvaluationCache(): void {
  formulaCache.clear();
}

export function getFormulaEvaluationCacheSize(): number {
  return formulaCache.size;
}

export function evaluateCompiledFormula(formula: string, scope: Record<string, unknown>): unknown {
  let compiled = formulaCache.get(formula);
  if (!compiled) {
    compiled = compile(formula);
    formulaCache.set(formula, compiled);
  }
  return compiled.evaluate(scope);
}
