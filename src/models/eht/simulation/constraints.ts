/**
 * EHT model constraint projections.
 * Enforces hard constraints like collision, basal ordering, etc.
 */

import { Vector2 } from '@/core/math/vector2';
import { basalCurve, basalArcLength } from '@/core/math/geometry';
import type { SimulationState } from '@/core/types/state';
import type { EHTParams } from '../params/types';

/**
 * Project hard sphere collision constraints.
 * Prevents cell nuclei from overlapping beyond hard radius.
 */
export function projectHardSphereConstraints(
  state: SimulationState,
  _params: EHTParams
): void {
  const cells = state.cells;
  const n = cells.length;

  for (let i = 0; i < n; i++) {
    const ci = cells[i];

    for (let j = 0; j < i; j++) {
      const cj = cells[j];

      // Quick distance check
      if (Math.abs(ci.pos.x - cj.pos.x) >= 1.5) continue;

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
 * Ensures basal points maintain their left-right ordering along the arc length.
 * Uses arc length comparison instead of x-coordinate for curved membranes.
 */
export function projectBasalOrderingConstraints(
  state: SimulationState,
  params: EHTParams
): void {
  const cells = state.cells;
  const baLinks = state.ba_links;
  const curvature_1 = state.geometry?.curvature_1 ?? 0;
  const curvature_2 = state.geometry?.curvature_2 ?? 0;

  for (const link of baLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

    const Bi = Vector2.from(ci.B);
    const Bj = Vector2.from(cj.B);

    const li = basalArcLength(Bi, curvature_1, curvature_2);
    const lj = basalArcLength(Bj, curvature_1, curvature_2);

    // Arc length delta: positive means j is "ahead" of i (correct ordering)
    let deltaL = lj - li;

    // Compute modulo for periodic boundary if needed
    if (params.general.full_circle && curvature_1 !== 0 && curvature_1 === curvature_2) {
      const circumference = 2 * Math.PI * Math.abs(1 / curvature_1);
      while (deltaL > circumference / 2) {
        // j is too far ahead - wrap around
        deltaL -= circumference;
      }

      while (deltaL < -circumference / 2) {
        // j is too far behind - wrap around
        deltaL += circumference;
      }
    }

    if (deltaL < 0) {
      // Ordering violation - currently disabled
      // TODO: Re-enable basal ordering correction when needed
      // const correction = deltaL / 2;
      // const newLi = li + correction;
      // const newLj = lj - correction;
      // const newBi = basalCurveParam(newLi, curvature_1, curvature_2);
      // const newBj = basalCurveParam(newLj, curvature_1, curvature_2);
      // ci.B.x = newBi.x;
      // ci.B.y = newBi.y;
      // cj.B.x = newBj.x;
      // cj.B.y = newBj.y;
    }
  }
}

/**
 * Project maximum basal junction distance constraints.
 * Prevents basal points from separating too far (Euclidean distance).
 * Points will be projected back onto the curve in a subsequent step.
 */
export function projectMaxBasalDistanceConstraints(
  state: SimulationState,
  params: EHTParams
): void {
  const cells = state.cells;
  const baLinks = state.ba_links;
  const maxDist = params.cell_prop.max_basal_junction_dist;

  for (const link of baLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

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
 */
export function projectBasalCurveConstraints(
  state: SimulationState,
  _params: EHTParams
): void {
  const cells = state.cells;
  const curvature_1 = state.geometry?.curvature_1 ?? 0;
  const curvature_2 = state.geometry?.curvature_2 ?? 0;

  for (const cell of cells) {
    const B = Vector2.from(cell.B);
    const projected = basalCurve(B, curvature_1, curvature_2);
    cell.B.x = projected.x;
    cell.B.y = projected.y;
  }
}

/**
 * Apply all EHT constraints in sequence.
 */
export function applyAllConstraints(
  state: SimulationState,
  params: EHTParams
): void {
  projectHardSphereConstraints(state, params);
  projectBasalOrderingConstraints(state, params);
  projectMaxBasalDistanceConstraints(state, params);
  projectBasalCurveConstraints(state, params);
}
