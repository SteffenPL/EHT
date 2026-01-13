/**
 * EHT model constraint projections.
 * Enforces hard constraints like collision, basal ordering, etc.
 */

import { Vector2 } from '@/core/math/vector2';
import type { EHTSimulationState } from '../types';
import type { EHTParams } from '../params/types';
import { getCellType } from './cell';

/**
 * Project hard sphere collision constraints.
 * Prevents cell nuclei from overlapping beyond hard radius.
 */
export function projectHardSphereConstraints(
  state: EHTSimulationState,
  _params: EHTParams
): void {
  const cells = state.cells;
  const n = cells.length;

  for (let i = 0; i < n; i++) {
    const ci = cells[i];

    for (let j = 0; j < i; j++) {
      const cj = cells[j];

      // Quick distance check
      // if (Math.abs(ci.pos.x - cj.pos.x) >= 1.5) continue;

      const Rij = ci.R_hard + cj.R_hard;
      const ciPos = Vector2.from(ci.pos);
      const cjPos = Vector2.from(cj.pos);

      const d = ciPos.dist(cjPos) - Rij;

      if (d < 0.0 && d !== -Rij) {
        const xixj = ciPos.sub(cjPos);
        const correction = xixj.scale(0.5 * d / (d + Rij));

        ci.pos.x -= correction.x;
        ci.pos.y -= correction.y;
        cj.pos.x += correction.x;
        cj.pos.y += correction.y;
      }
    }
  }
}

/**
 * Project basal ordering constraints.
 * Ensures basal points maintain their left-right ordering.
 * Uses local tangent vector at the midpoint to determine ordering.
 *
 * Algorithm:
 * 1. Compute center cij = 0.5 * (bi + bj)
 * 2. Get normal nij at cij from geometry
 * 3. Rotate normal 90° clockwise to get oriented tangent tij
 * 4. Check constraint: (bi - cij) · tij < (bj - cij) · tij
 * 5. If violated, move both points along tij to fix ordering
 */
export function projectBasalOrderingConstraints(
  state: EHTSimulationState,
  _params: EHTParams
): void {
  const cells = state.cells;
  const baLinks = state.ba_links;

  for (const link of baLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

    // Skip if either cell has lost basal adhesion
    if (!ci.has_B || !cj.has_B) continue;

    const Bi = Vector2.from(ci.B);
    const Bj = Vector2.from(cj.B);

    // 1. Compute center point
    const Cij = Bi.add(Bj).scale(0.5);

    // 2. Get normal at center (project center onto curve first for better accuracy)
    const CijProjected = state.basalGeometry.projectPoint(Cij);
    const Nij = state.basalGeometry.getNormal(CijProjected);

    // 3. Rotate normal 90° clockwise to get tangent: (nx, ny) -> (ny, -nx)
    const Tij = new Vector2(Nij.y, -Nij.x);

    // 4. Check constraint: (bi - cij) · tij < (bj - cij) · tij
    const projI = Bi.sub(Cij).dot(Tij);
    const projJ = Bj.sub(Cij).dot(Tij);

    if (projI >= projJ) {
      // 5. Ordering violation - move both points along tangent to fix
      // We want projI < projJ, so we need to move bi in -tij direction
      // and bj in +tij direction
      const overlap = projI - projJ;
      const correction = overlap / 2 + 1e-6; // Small epsilon to ensure strict inequality

      ci.B.x -= correction * Tij.x;
      ci.B.y -= correction * Tij.y;
      cj.B.x += correction * Tij.x;
      cj.B.y += correction * Tij.y;
    }
  }
}

/**
 * Project maximum basal junction distance constraints.
 * Prevents basal points from separating too far (Euclidean distance).
 * Points will be projected back onto the curve in a subsequent step.
 */
export function projectMaxBasalDistanceConstraints(
  state: EHTSimulationState,
  params: EHTParams
): void {
  const cells = state.cells;
  const baLinks = state.ba_links;

  for (const link of baLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

    // Use the average of both cell types' max basal junction distance
    const cellTypeI = getCellType(params, ci);
    const cellTypeJ = getCellType(params, cj);
    const maxDist = (cellTypeI.max_basal_junction_dist + cellTypeJ.max_basal_junction_dist) / 2;

    const Bi = Vector2.from(ci.B);
    const Bj = Vector2.from(cj.B);

    // Euclidean distance between basal points
    const dist = Bi.dist(Bj);

    if (dist > maxDist) {
      // Exceeds max distance - pull points closer along straight line
      const excess = dist - maxDist;
      const direction = Bj.sub(Bi).normalize();
      const correction = direction.scale(excess / 2);

      ci.B.x += correction.x;
      ci.B.y += correction.y;
      cj.B.x -= correction.x;
      cj.B.y -= correction.y;
    }
  }
}

/**
 * Project basal points onto the basal curve.
 * Only applies to cells that still have basal adhesion.
 */
export function projectBasalCurveConstraints(
  state: EHTSimulationState,
  _params: EHTParams
): void {
  const cells = state.cells;

  for (const cell of cells) {
    // Skip cells that have lost basal adhesion
    if (!cell.has_B) continue;

    const B = Vector2.from(cell.B);
    const projected = state.basalGeometry.projectPoint(B);
    cell.B.x = projected.x;
    cell.B.y = projected.y;
  }
}

/**
 * Apply all EHT constraints in sequence.
 */
export function applyAllConstraints(
  state: EHTSimulationState,
  params: EHTParams
): void {
  projectHardSphereConstraints(state, params);
  projectBasalOrderingConstraints(state, params);
  projectMaxBasalDistanceConstraints(state, params);
  projectBasalCurveConstraints(state, params);
}
