import type { EHTCellTypeParams, EHTGeneralParams, EHTParams } from '../params/types';
import {
  isGeneralLengthField,
  isRuntimeCellLengthTarget,
  isV2OrLater,
  scaleFormulaScopeValue,
} from '../params/unit-conversion';
import { formulaFunctions } from '../simulation/formula-functions';
import { evaluateCompiledFormula } from '../simulation/formula-evaluator';

export interface FormulaCellContext {
  alpha: number;
  r: number;
  delta: number;
}

interface EvaluateFormulaOptions {
  formula: string;
  targetParameter: string;
  oldValue: number;
  t: number;
  dt: number;
  params: EHTParams;
  period?: number;
  birthTime?: number;
  initValue?: number;
  cellContext?: FormulaCellContext;
  generalParams?: EHTGeneralParams;
  cellTypeParams?: EHTCellTypeParams;
}

export function isLengthFormulaTarget(targetParameter: string): boolean {
  if (targetParameter.startsWith('general.')) {
    return isGeneralLengthField(targetParameter.slice('general.'.length));
  }

  return isRuntimeCellLengthTarget(targetParameter);
}

function toPublicScopeValue(value: unknown, isLengthLike: boolean, usePublicScope: boolean): unknown {
  return usePublicScope
    ? scaleFormulaScopeValue(value, isLengthLike, 'legacy-to-microns')
    : value;
}

function fromPublicResult(value: unknown, usePublicScope: boolean): unknown {
  return usePublicScope
    ? scaleFormulaScopeValue(value, true, 'microns-to-legacy')
    : value;
}

export function evaluateUnitAwareFormula(options: EvaluateFormulaOptions): number {
  const {
    formula,
    targetParameter,
    oldValue,
    t,
    dt,
    params,
    period,
    birthTime,
    initValue,
    cellContext,
    generalParams = params.general,
    cellTypeParams,
  } = options;

  const usePublicLengthScope = isV2OrLater(params.metadata?.version)
    && isLengthFormulaTarget(targetParameter);

  const scope: Record<string, unknown> = {
    old_value: toPublicScopeValue(oldValue, true, usePublicLengthScope),
    t,
    dt,
    ...formulaFunctions,
    ...(params.constants ?? {}),
  };

  if (period !== undefined) {
    scope.period = period;
  }

  if (birthTime !== undefined) {
    scope.age = t - birthTime;
  }

  if (initValue !== undefined) {
    scope.init_value = toPublicScopeValue(initValue, true, usePublicLengthScope);
  }

  if (cellContext) {
    scope.alpha = cellContext.alpha;
    scope.r = toPublicScopeValue(cellContext.r, true, usePublicLengthScope);
    scope.delta = toPublicScopeValue(cellContext.delta, true, usePublicLengthScope);
  }

  if (generalParams) {
    scope.p_div_out = generalParams.p_div_out;
    scope.mu = generalParams.mu;
    scope.h_init = toPublicScopeValue(generalParams.h_init, true, usePublicLengthScope);
    scope.w_init = toPublicScopeValue(generalParams.w_init, true, usePublicLengthScope);
    scope.t_end = generalParams.t_end;
  }

  if (cellTypeParams) {
    scope.R_hard_div = toPublicScopeValue(cellTypeParams.R_hard_div, true, usePublicLengthScope);
    scope.stiffness_apical_apical_div = cellTypeParams.stiffness_apical_apical_div;
    scope.INM = cellTypeParams.INM;
  }

  const result = evaluateCompiledFormula(formula, scope);
  const engineValue = fromPublicResult(result, usePublicLengthScope);
  return typeof engineValue === 'number' ? engineValue : Number(engineValue);
}
