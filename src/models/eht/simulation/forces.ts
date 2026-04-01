/**
 * EHT model force calculations.
 * Pure functions that compute forces on cells.
 */

import { Vector2 } from '@/core/math/vector2';
import { evaluate, matrix } from 'mathjs';
import type { EHTSimulationState } from '../types';
import type { EHTParams } from '../params/types';
import { getCellType } from './cell';

/** Force accumulator for a cell */
export interface CellForces {
  f: Vector2;   // Force on nucleus
  fA: Vector2;  // Force on apical point
  fB: Vector2;  // Force on basal point
}

/** Create zero forces */
export function zeroForces(): CellForces {
  return {
    f: Vector2.zero(),
    fA: Vector2.zero(),
    fB: Vector2.zero(),
  };
}

/**
 * Calculate cell-cell repulsion forces.
 * Soft repulsion between overlapping cells.
 */
export function calcRepulsionForces(
  state: EHTSimulationState,
  params: EHTParams,
  forces: CellForces[]
): void {
  const cells = state.cells;
  const n = cells.length;

  for (let i = 0; i < n; i++) {
    const ci = cells[i];
    const ciType = getCellType(params, ci);
    const ciPos = Vector2.from(ci.pos);

    for (let j = 0; j < i; j++) {
      const cj = cells[j];

      const cjType = getCellType(params, cj);
      const cjPos = Vector2.from(cj.pos);

      const xixj = cjPos.sub(ciPos);
      const d = xixj.mag();
      const Rij = ci.R_soft + cj.R_soft;
      const sr = ciType.stiffness_repulsion + cjType.stiffness_repulsion;

      if (d < Rij && d > Rij / 20) {
        const forceMag = -sr * (Rij - d) / (d * Rij * Rij);
        const force = xixj.scale(forceMag);

        forces[i].f = forces[i].f.add(force);
        forces[j].f = forces[j].f.sub(force);
      }
    }
  }
}

/**
 * Calculate apical-nuclei spring forces.
 */
export function calcApicalNucleiForces(
  state: EHTSimulationState,
  params: EHTParams,
  forces: CellForces[]
): void {
  const cells = state.cells;
  const useHardRadius = params.general.hard_sphere_nuclei;

  for (let i = 0; i < cells.length; i++) {
    const ci = cells[i];

    const pos = Vector2.from(ci.pos);
    const A = Vector2.from(ci.A);

    const ax = pos.sub(A);
    const al = ax.mag();

    if (al > 0) {
      const radius = useHardRadius ? ci.R_hard : ci.R_soft;
      const rl = ci.eta_A + radius;
      const stiffness = ci.stiffness_nuclei_apical;
      const forceMag = 2 * stiffness * (al - rl) / (al * rl * rl);
      const force = ax.scale(forceMag);

      forces[i].f = forces[i].f.sub(force);
      forces[i].fA = forces[i].fA.add(force);
    }
  }
}

/**
 * Calculate basal-nuclei spring forces.
 */
export function calcBasalNucleiForces(
  state: EHTSimulationState,
  params: EHTParams,
  forces: CellForces[]
): void {
  const cells = state.cells;
  const useHardRadius = params.general.hard_sphere_nuclei;

  for (let i = 0; i < cells.length; i++) {
    const ci = cells[i];

    const pos = Vector2.from(ci.pos);
    const B = Vector2.from(ci.B);

    const bx = pos.sub(B);
    const bl = bx.mag();

    if (bl > 0) {
      const radius = useHardRadius ? ci.R_hard : ci.R_soft;
      const rl = ci.eta_B + radius;
      const stiffness = ci.stiffness_nuclei_basal;
      const forceMag = 2 * stiffness * (bl - rl) / (bl * rl * rl);
      const force = bx.scale(forceMag);

      forces[i].f = forces[i].f.sub(force);
      forces[i].fB = forces[i].fB.add(force);
    }
  }
}

/**
 * Calculate straightness constraint forces.
 * Penalizes deviation from straight apical-nuclei-basal alignment.
 */
export function calcStraightnessForces(
  state: EHTSimulationState,
  _params: EHTParams,
  forces: CellForces[]
): void {
  const cells = state.cells;

  for (let i = 0; i < cells.length; i++) {
    const ci = cells[i];

    const pos = Vector2.from(ci.pos);
    const A = Vector2.from(ci.A);
    const B = Vector2.from(ci.B);

    const ax = pos.sub(A);
    const bx = pos.sub(B);
    const al = ax.mag();
    const bl = bx.mag();

    const ax_bx = ax.dot(bx);

    if (ax_bx !== 0.0 && al > 0 && bl > 0) {
      const f = ci.stiffness_straightness / (al * bl);

      // Derivative with respect to A
      const dR = bx.scale(-1).add(ax.scale(ax_bx / (al * al))).scale(f);
      // Derivative with respect to B
      const dS = ax.scale(-1).add(bx.scale(ax_bx / (bl * bl))).scale(f);

      forces[i].fA = forces[i].fA.sub(dR);
      forces[i].f = forces[i].f.add(dR);
      forces[i].f = forces[i].f.add(dS);
      forces[i].fB = forces[i].fB.sub(dS);
    }
  }
}

/**
 * Calculate apical junction forces between connected cells.
 */
export function calcApicalJunctionForces(
  state: EHTSimulationState,
  _params: EHTParams,
  forces: CellForces[]
): void {
  const cells = state.cells;
  const apLinks = state.ap_links;

  for (const link of apLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

    const Ai = Vector2.from(ci.A);
    const Aj = Vector2.from(cj.A);

    const aiaj = Ai.sub(Aj);
    const d = aiaj.mag();

    if (d > 1e-6) {
      const stiffAvg = 0.5 * (ci.stiffness_apical_apical + cj.stiffness_apical_apical);
      const force = aiaj.scale(0.25 * stiffAvg * (d - link.rl) / d);

      forces[link.l].fA = forces[link.l].fA.sub(force);
      forces[link.r].fA = forces[link.r].fA.add(force);
    }
  }
}

/** Regex to detect vector variables T or N in formula */
const VECTOR_VAR_REGEX = /\bT\b|\bN\b/;

/** Cache of formulas that failed to evaluate — only warn once per formula */
const failedFormulas = new Map<string, string>();

/**
 * Build the scope for external force formula evaluation.
 * Kept as a named function for easy extension with additional variables.
 */
function buildExternalForceScope(
  x: number,
  y: number,
  alpha: number,
  r: number,
  t: number
): Record<string, unknown> {
  const T = matrix([Math.cos(alpha), Math.sin(alpha)]);
  const N = matrix([Math.sin(alpha), -Math.cos(alpha)]);
  return { x, y, alpha, r, t, T, N };
}

/**
 * Convert a math.js evaluation result to a Vector2 force.
 * Handles matrix results (extract [x,y]) and unexpected types (return zero).
 */
function resultToVector2(result: unknown): Vector2 {
  if (result != null && typeof result === 'object' && 'toArray' in result) {
    const arr = (result as { toArray: () => number[] }).toArray() as number[];
    if (arr.length >= 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
      return new Vector2(arr[0], arr[1]);
    }
  }
  return Vector2.zero();
}

/**
 * Calculate external forces from user-defined formulas.
 * Each cell type can specify a math.js formula for an external force
 * applied to cell nuclei.
 */
export function calcExternalForces(
  state: EHTSimulationState,
  params: EHTParams,
  forces: CellForces[]
): void {
  const cells = state.cells;
  const center = state.basalGeometry.center;

  for (let i = 0; i < cells.length; i++) {
    const ci = cells[i];
    const cellType = getCellType(params, ci);
    const formula = cellType.external_force;

    // Skip if no external force
    if (!formula || formula === '0') continue;

    // Compute position relative to geometry center
    const x = ci.pos.x - center.x;
    const y = ci.pos.y - center.y;

    // Polar coordinates: alpha=0 at bottom, +pi/2 at right, ±pi at top
    const alpha = Math.atan2(x, -y);
    const r = Math.sqrt(x * x + y * y);

    // Build scope
    const scope = buildExternalForceScope(x, y, alpha, r, state.t);

    // Determine effective formula: auto-wrap scalars
    const effectiveFormula = VECTOR_VAR_REGEX.test(formula)
      ? formula
      : `-(${formula}) * sign(alpha) * T`;

    try {
      const result = evaluate(effectiveFormula, scope);
      const force = resultToVector2(result);
      forces[i].f = forces[i].f.add(force);
    } catch (error) {
      console.warn(`[ExternalForce] Failed to evaluate formula "${formula}":`, error);
    }
  }
}

/**
 * Calculate all forces for the current state.
 */
export function calcAllForces(
  state: EHTSimulationState,
  params: EHTParams
): CellForces[] {
  const forces: CellForces[] = state.cells.map(() => zeroForces());

  calcRepulsionForces(state, params, forces);
  calcApicalNucleiForces(state, params, forces);
  calcBasalNucleiForces(state, params, forces);
  calcStraightnessForces(state, params, forces);
  calcApicalJunctionForces(state, params, forces);
  calcExternalForces(state, params, forces);

  return forces;
}
