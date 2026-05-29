/**
 * EHT model constraint projections.
 * Enforces hard constraints like collision, basal ordering, etc.
 */

import { Vector2 } from '@/core/math/vector2';
import {
  getActiveSimulationProfiler,
  nowMs,
} from '@/core/profiling/simulation-profiler';
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
      const Rij = ci.R_hard + cj.R_hard;
      const dx = ci.pos.x - cj.pos.x;
      const dy = ci.pos.y - cj.pos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < Rij * Rij && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const d = dist - Rij;
        const correctionScale = 0.5 * d / dist;
        const correctionX = dx * correctionScale;
        const correctionY = dy * correctionScale;

        ci.pos.x -= correctionX;
        ci.pos.y -= correctionY;
        cj.pos.x += correctionX;
        cj.pos.y += correctionY;
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
  const basalGeometry = state.basalGeometry;

  if (basalGeometry.type === 'line') {
    for (const link of baLinks) {
      const ci = cells[link.l];
      const cj = cells[link.r];

      if (!ci.has_B || !cj.has_B) continue;

      const overlap = ci.B.x - cj.B.x;
      if (overlap >= 0) {
        const correction = overlap / 2;
        ci.B.x -= correction;
        cj.B.x += correction;
      }
    }
    return;
  }

  for (const link of baLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

    // Skip if either cell has lost basal adhesion
    if (!ci.has_B || !cj.has_B) continue;

    if (basalGeometry.type === 'circle') {
      const center = basalGeometry.center;
      const centerX = 0.5 * (ci.B.x + cj.B.x);
      const centerY = 0.5 * (ci.B.y + cj.B.y);
      const cx = centerX - center.x;
      const cy = centerY - center.y;
      const dist = Math.sqrt(cx * cx + cy * cy);

      if (dist === 0) continue;

      const normalScale = -Math.sign(basalGeometry.curvature_2) / dist;
      const normalX = cx * normalScale;
      const normalY = cy * normalScale;
      const tangentX = normalY;
      const tangentY = -normalX;

      const projI = (ci.B.x - centerX) * tangentX + (ci.B.y - centerY) * tangentY;
      const projJ = (cj.B.x - centerX) * tangentX + (cj.B.y - centerY) * tangentY;

      if (projI >= projJ) {
        const correction = (projI - projJ) / 2;
        ci.B.x -= correction * tangentX;
        ci.B.y -= correction * tangentY;
        cj.B.x += correction * tangentX;
        cj.B.y += correction * tangentY;
      }
      continue;
    }

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
      const correction = overlap / 2;

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

    const dx = cj.B.x - ci.B.x;
    const dy = cj.B.y - ci.B.y;
    const distSq = dx * dx + dy * dy;

    if (distSq > maxDist * maxDist && distSq > 0) {
      const dist = Math.sqrt(distSq);
      // Exceeds max distance - pull points closer along straight line
      const excess = dist - maxDist;
      const correctionScale = excess / (2 * dist);
      const correctionX = dx * correctionScale;
      const correctionY = dy * correctionScale;

      ci.B.x += correctionX;
      ci.B.y += correctionY;
      cj.B.x -= correctionX;
      cj.B.y -= correctionY;
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
  const basalGeometry = state.basalGeometry;

  if (basalGeometry.type === 'line') {
    for (const cell of cells) {
      if (cell.has_B) {
        cell.B.y = 0;
      }
    }
    return;
  }

  if (basalGeometry.type === 'circle') {
    const center = basalGeometry.center;
    const radius = Math.abs(1 / basalGeometry.curvature_1);

    for (const cell of cells) {
      if (!cell.has_B) continue;

      const dx = cell.B.x - center.x;
      const dy = cell.B.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const scale = radius / dist;
        cell.B.x = center.x + dx * scale;
        cell.B.y = center.y + dy * scale;
      } else {
        cell.B.x = center.x;
        cell.B.y = center.y;
      }
    }
    return;
  }

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
function applyAllConstraintsUnprofiled(
  state: EHTSimulationState,
  params: EHTParams
): void {
  projectHardSphereConstraints(state, params);
  projectBasalOrderingConstraints(state, params);
  projectMaxBasalDistanceConstraints(state, params);
  projectBasalCurveConstraints(state, params);
}

export function applyAllConstraints(
  state: EHTSimulationState,
  params: EHTParams
): void {
  const profiler = getActiveSimulationProfiler();
  if (!profiler) {
    applyAllConstraintsUnprofiled(state, params);
    return;
  }

  const start = nowMs();
  try {
    applyAllConstraintsUnprofiled(state, params);
  } finally {
    profiler.recordTiming('constraints', nowMs() - start);
  }
}
