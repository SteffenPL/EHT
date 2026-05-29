/**
 * EHT model force calculations.
 * Pure functions that compute forces on cells.
 */

import { Vector2 } from '@/core/math/vector2';
import { CellPhase, type EHTSimulationState } from '../types';
import type { EHTParams } from '../params/types';
import { normalizeExternalForces, normalizeExternalForceValues } from '../params/external-forces';
import { evaluateExternalForceAtPosition } from './external-force-formula';

const MIN_RADIUS = 1e-12;

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

/**
 * Calculate basal membrane repulsion forces.
 * Pushes nuclei inward once their soft-radius envelope overlaps the basal curve.
 */
export function calcBasalMembraneRepulsionForces(
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
    const strength = cellType.basal_membrane_repulsion;
    if (strength === 0) continue;

    const position = Vector2.from(ci.pos);
    const projectedPoint = state.basalGeometry.projectPoint(position);
    const normal = state.basalGeometry.getNormal(projectedPoint);
    const delta = normal.x * (position.x - projectedPoint.x)
      + normal.y * (position.y - projectedPoint.y);
    const radius = Math.max(ci.R_soft, MIN_RADIUS);
    const overlap = Math.max(0, radius - delta);
    if (overlap === 0) continue;

    const forceMag = strength * overlap / (radius * radius);
    forces[i].f.x += forceMag * normal.x;
    forces[i].f.y += forceMag * normal.y;
  }
}

/** Cache of formulas that failed to evaluate — only warn once per formula */
const failedFormulas = new Map<string, string>();

/** Get the parsing error for a given external force formula, or undefined if valid. */
export function getExternalForceError(formula: string): string | undefined {
  return failedFormulas.get(formula);
}

interface ExternalForceRow {
  formula: string;
  initValue: number;
  effectiveFormulaKey: string;
}

/**
 * Calculate external forces from user-defined formulas.
 * Each cell type can specify multiple math.js formulas for external forces
 * applied to cell nuclei. Formula results are summed.
 */
export function calcExternalForces(
  state: EHTSimulationState,
  params: EHTParams,
  forces: CellForces[]
): void {
  const cells = state.cells;
  const cellTypes = params.cell_types;
  const fallbackType = cellTypes.control;
  const rowsByCellType = new Map<string, ExternalForceRow[]>();

  const getRowsForCellType = (typeIndex: string, cellType: typeof fallbackType): ExternalForceRow[] => {
    const cachedRows = rowsByCellType.get(typeIndex);
    if (cachedRows) return cachedRows;

    const formulas = normalizeExternalForces(cellType);
    const values = normalizeExternalForceValues(cellType);
    const rowCount = Math.max(formulas.length, values.length);
    const rows: ExternalForceRow[] = [];

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const formula = formulas[rowIndex]?.trim() ?? '';
      if (!formula || formula === '0') continue;

      const initValue = values[rowIndex] ?? 1;
      rows.push({
        formula,
        initValue,
        effectiveFormulaKey: formula,
      });
    }

    rowsByCellType.set(typeIndex, rows);
    return rows;
  };

  for (let i = 0; i < cells.length; i++) {
    const ci = cells[i];
    const cellType = cellTypes[ci.typeIndex] ?? fallbackType;
    const rows = getRowsForCellType(ci.typeIndex, cellType);

    for (const row of rows) {
      // Skip formulas already known to be invalid — use NaN force
      if (failedFormulas.has(row.effectiveFormulaKey)) {
        forces[i].f.x = NaN;
        forces[i].f.y = NaN;
        continue;
      }

      try {
        const { force } = evaluateExternalForceAtPosition({
          formula: row.formula,
          initValue: row.initValue,
          position: Vector2.from(ci.pos),
          basalGeometry: state.basalGeometry,
          t: state.t,
          constants: params.constants,
          cellContext: {
            age: state.t - ci.birth_time,
            R_soft: ci.R_soft,
            R_hard: ci.R_hard,
            G2: ci.phase === CellPhase.G2 ? 1 : 0,
            Mitosis: ci.phase === CellPhase.Mitosis ? 1 : 0,
          },
        });
        forces[i].f.x += force.x;
        forces[i].f.y += force.y;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        failedFormulas.set(row.effectiveFormulaKey, msg);
        console.warn(`[ExternalForce] Invalid formula "${row.formula}": ${msg}`);
        forces[i].f.x = NaN;
        forces[i].f.y = NaN;
      }
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
  calcBasalMembraneRepulsionForces(state, params, forces);
  calcExternalForces(state, params, forces);

  return forces;
}
