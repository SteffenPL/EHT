import type { BasalGeometry } from '@/core/math/basal-geometry';
import { Vector2 } from '@/core/math/vector2';
import { evaluate, matrix } from 'mathjs';
import { formulaFunctions } from './formula-functions';

/** Regex to detect vector variables T or N in formula */
export const VECTOR_VAR_REGEX = /\bT\b|\bN\b/;

export interface ExternalForceEvaluationInput {
  formula: string;
  position: Vector2;
  basalGeometry: BasalGeometry;
  t: number;
  constants?: Record<string, number>;
}

export interface ExternalForceEvaluation {
  force: Vector2;
  effectiveFormula: string;
  isScalarFormula: boolean;
  scope: Record<string, unknown>;
  alpha: number;
  r: number;
  delta: number;
  projectedPoint: Vector2;
  normal: Vector2;
  tangent: Vector2;
}

export function getExternalForceEffectiveFormula(formula: string): {
  effectiveFormula: string;
  isScalarFormula: boolean;
} {
  const isScalarFormula = !VECTOR_VAR_REGEX.test(formula);
  return {
    effectiveFormula: isScalarFormula ? `-(${formula}) * sign(alpha) * T` : formula,
    isScalarFormula,
  };
}

/**
 * Build the scope for external force formula evaluation.
 * This is shared by simulation and formula previews.
 */
export function buildExternalForceScope(
  position: Vector2,
  basalGeometry: BasalGeometry,
  t: number,
  constants?: Record<string, number>
): Omit<ExternalForceEvaluation, 'force' | 'effectiveFormula' | 'isScalarFormula'> {
  const center = basalGeometry.center;
  const x = position.x - center.x;
  const y = position.y - center.y;
  const alpha = Math.atan2(x, -y);
  const r = Math.sqrt(x * x + y * y);
  const projectedPoint = basalGeometry.projectPoint(position);
  const normal = basalGeometry.getNormal(projectedPoint);
  const delta = normal.x * (position.x - projectedPoint.x) + normal.y * (position.y - projectedPoint.y);
  const tangent = new Vector2(-normal.y, normal.x);
  const scope: Record<string, unknown> = {
    x,
    y,
    alpha,
    r,
    t,
    T: matrix([tangent.x, tangent.y]),
    N: matrix([normal.x, normal.y]),
    delta,
    ...formulaFunctions,
    ...(constants ?? {}),
  };

  return {
    scope,
    alpha,
    r,
    delta,
    projectedPoint,
    normal,
    tangent,
  };
}

/**
 * Convert a math.js evaluation result to a Vector2 force.
 * Handles matrix results and unexpected scalar/object results.
 */
export function externalForceResultToVector2(result: unknown): Vector2 {
  if (result != null && typeof result === 'object' && 'toArray' in result) {
    const arr = (result as { toArray: () => number[] }).toArray() as number[];
    if (arr.length >= 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
      return new Vector2(arr[0], arr[1]);
    }
  }
  return Vector2.zero();
}

export function evaluateExternalForceAtPosition({
  formula,
  position,
  basalGeometry,
  t,
  constants,
}: ExternalForceEvaluationInput): ExternalForceEvaluation {
  const spatial = buildExternalForceScope(position, basalGeometry, t, constants);
  const { effectiveFormula, isScalarFormula } = getExternalForceEffectiveFormula(formula);
  const result = evaluate(effectiveFormula, spatial.scope);

  return {
    ...spatial,
    force: externalForceResultToVector2(result),
    effectiveFormula,
    isScalarFormula,
  };
}
