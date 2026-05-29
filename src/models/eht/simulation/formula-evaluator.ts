import { compile, type EvalFunction } from 'mathjs';
import {
  getActiveSimulationProfiler,
  nowMs,
} from '@/core/profiling/simulation-profiler';

const formulaCache = new Map<string, EvalFunction>();

export function clearFormulaEvaluationCache(): void {
  formulaCache.clear();
}

export function getFormulaEvaluationCacheSize(): number {
  return formulaCache.size;
}

export function evaluateCompiledFormula(formula: string, scope: Record<string, unknown>): unknown {
  const profiler = getActiveSimulationProfiler();
  if (profiler) {
    const start = nowMs();
    try {
      let compiled = formulaCache.get(formula);
      if (!compiled) {
        compiled = compile(formula);
        formulaCache.set(formula, compiled);
      }
      return compiled.evaluate(scope);
    } finally {
      profiler.recordTiming('formula', nowMs() - start);
      profiler.recordSignal('formulaCacheSize', formulaCache.size);
    }
  }

  let compiled = formulaCache.get(formula);
  if (!compiled) {
    compiled = compile(formula);
    formulaCache.set(formula, compiled);
  }
  return compiled.evaluate(scope);
}
