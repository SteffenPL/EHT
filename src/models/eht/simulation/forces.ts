/**
 * EHT model force calculations.
 * Pure functions that compute forces on cells.
 */

import { Vector2 } from '@/core/math/vector2';
import type { EHTSimulationState } from '../types';
import type { EHTParams } from '../params/types';
import { evaluateExternalForceAtPosition } from './external-force-formula';

/** Mutable 2D force vector used in hot simulation loops. */
export interface ForceVector {
  x: number;
  y: number;
}

/** Force accumulator for a cell */
export interface CellForces {
  f: ForceVector;   // Force on nucleus
  fA: ForceVector;  // Force on apical point
  fB: ForceVector;  // Force on basal point
}

/** Create zero forces */
export function zeroForces(): CellForces {
  return {
    f: { x: 0, y: 0 },
    fA: { x: 0, y: 0 },
    fB: { x: 0, y: 0 },
  };
}

function resetForces(forces: CellForces[], n: number): CellForces[] {
  for (let i = 0; i < n; i++) {
    let force = forces[i];
    if (!force) {
      force = zeroForces();
      forces[i] = force;
    } else {
      force.f.x = 0;
      force.f.y = 0;
      force.fA.x = 0;
      force.fA.y = 0;
      force.fB.x = 0;
      force.fB.y = 0;
    }
  }

  forces.length = n;
  return forces;
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
  const cellTypes = params.cell_types;
  const fallbackType = cellTypes.control;

  for (let i = 0; i < n; i++) {
    const ci = cells[i];
    const ciType = cellTypes[ci.typeIndex] ?? fallbackType;
    const ciX = ci.pos.x;
    const ciY = ci.pos.y;

    for (let j = 0; j < i; j++) {
      const cj = cells[j];
      const Rij = ci.R_soft + cj.R_soft;
      const minDist = Rij / 20;
      const dx = cj.pos.x - ciX;
      const dy = cj.pos.y - ciY;
      const dSq = dx * dx + dy * dy;

      if (dSq < Rij * Rij && dSq > minDist * minDist) {
        const cjType = cellTypes[cj.typeIndex] ?? fallbackType;
        const d = Math.sqrt(dSq);
        const sr = ciType.stiffness_repulsion + cjType.stiffness_repulsion;
        const forceMag = -sr * (Rij - d) / (d * Rij * Rij);
        const fx = dx * forceMag;
        const fy = dy * forceMag;

        forces[i].f.x += fx;
        forces[i].f.y += fy;
        forces[j].f.x -= fx;
        forces[j].f.y -= fy;
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
    const ax = ci.pos.x - ci.A.x;
    const ay = ci.pos.y - ci.A.y;
    const alSq = ax * ax + ay * ay;

    if (alSq > 0) {
      const al = Math.sqrt(alSq);
      const radius = useHardRadius ? ci.R_hard : ci.R_soft;
      const rl = ci.eta_A + radius;
      const stiffness = ci.stiffness_nuclei_apical;
      const forceMag = 2 * stiffness * (al - rl) / (al * rl * rl);
      const fx = ax * forceMag;
      const fy = ay * forceMag;

      forces[i].f.x -= fx;
      forces[i].f.y -= fy;
      forces[i].fA.x += fx;
      forces[i].fA.y += fy;
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
    const bx = ci.pos.x - ci.B.x;
    const by = ci.pos.y - ci.B.y;
    const blSq = bx * bx + by * by;

    if (blSq > 0) {
      const bl = Math.sqrt(blSq);
      const radius = useHardRadius ? ci.R_hard : ci.R_soft;
      const rl = ci.eta_B + radius;
      const stiffness = ci.stiffness_nuclei_basal;
      const forceMag = 2 * stiffness * (bl - rl) / (bl * rl * rl);
      const fx = bx * forceMag;
      const fy = by * forceMag;

      forces[i].f.x -= fx;
      forces[i].f.y -= fy;
      forces[i].fB.x += fx;
      forces[i].fB.y += fy;
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
    const ax = ci.pos.x - ci.A.x;
    const ay = ci.pos.y - ci.A.y;
    const bx = ci.pos.x - ci.B.x;
    const by = ci.pos.y - ci.B.y;
    const alSq = ax * ax + ay * ay;
    const blSq = bx * bx + by * by;
    const ax_bx = ax * bx + ay * by;

    if (ax_bx !== 0.0 && alSq > 0 && blSq > 0) {
      const al = Math.sqrt(alSq);
      const bl = Math.sqrt(blSq);
      const f = ci.stiffness_straightness / (al * bl);

      // Derivative with respect to A
      const dRx = (-bx + ax * (ax_bx / alSq)) * f;
      const dRy = (-by + ay * (ax_bx / alSq)) * f;
      // Derivative with respect to B
      const dSx = (-ax + bx * (ax_bx / blSq)) * f;
      const dSy = (-ay + by * (ax_bx / blSq)) * f;

      forces[i].fA.x -= dRx;
      forces[i].fA.y -= dRy;
      forces[i].f.x += dRx + dSx;
      forces[i].f.y += dRy + dSy;
      forces[i].fB.x -= dSx;
      forces[i].fB.y -= dSy;
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
    const dx = ci.A.x - cj.A.x;
    const dy = ci.A.y - cj.A.y;
    const dSq = dx * dx + dy * dy;

    if (dSq > 1e-12) {
      const d = Math.sqrt(dSq);
      const stiffAvg = 0.5 * (ci.stiffness_apical_apical + cj.stiffness_apical_apical);
      const forceMag = 0.25 * stiffAvg * (d - link.rl) / d;
      const fx = dx * forceMag;
      const fy = dy * forceMag;

      forces[link.l].fA.x -= fx;
      forces[link.l].fA.y -= fy;
      forces[link.r].fA.x += fx;
      forces[link.r].fA.y += fy;
    }
  }
}

/** Cache of formulas that failed to evaluate — only warn once per formula */
const failedFormulas = new Map<string, string>();

/** Get the parsing error for a given external_force formula, or undefined if valid. */
export function getExternalForceError(formula: string): string | undefined {
  return failedFormulas.get(formula);
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
  const cellTypes = params.cell_types;
  const fallbackType = cellTypes.control;

  for (let i = 0; i < cells.length; i++) {
    const ci = cells[i];
    const cellType = cellTypes[ci.typeIndex] ?? fallbackType;
    const formula = cellType.external_force;

    // Skip if no external force
    if (!formula || formula === '0') continue;

    // Skip formulas already known to be invalid — use NaN force
    if (failedFormulas.has(formula)) {
      forces[i].f.x = NaN;
      forces[i].f.y = NaN;
      continue;
    }

    try {
      const { force } = evaluateExternalForceAtPosition({
        formula,
        position: Vector2.from(ci.pos),
        basalGeometry: state.basalGeometry,
        t: state.t,
        constants: params.constants,
      });
      forces[i].f.x += force.x;
      forces[i].f.y += force.y;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      failedFormulas.set(formula, msg);
      console.warn(`[ExternalForce] Invalid formula "${formula}": ${msg}`);
      forces[i].f.x = NaN;
      forces[i].f.y = NaN;
    }
  }
}

/**
 * Calculate all forces for the current state.
 */
export function calcAllForces(
  state: EHTSimulationState,
  params: EHTParams,
  reusableForces: CellForces[] = []
): CellForces[] {
  const forces = resetForces(reusableForces, state.cells.length);

  calcRepulsionForces(state, params, forces);
  calcApicalNucleiForces(state, params, forces);
  calcBasalNucleiForces(state, params, forces);
  calcStraightnessForces(state, params, forces);
  calcApicalJunctionForces(state, params, forces);
  calcExternalForces(state, params, forces);

  return forces;
}
