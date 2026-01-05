/**
 * Constraint projections for the simulation.
 * Enforces hard constraints like collision, basal ordering, etc.
 */
import { Vector2 } from '../math/vector2';
import { basalCurve } from '../math/geometry';
import type { SimulationState } from '../types/state';
import type { SimulationParams } from '../types/params';

/**
 * Project hard sphere collision constraints.
 * Prevents cell nuclei from overlapping beyond hard radius.
 */
export function projectHardSphereConstraints(
  state: SimulationState,
  _params: SimulationParams
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
 * Ensures basal points maintain their left-right ordering.
 */
export function projectBasalOrderingConstraints(
  state: SimulationState,
  _params: SimulationParams
): void {
  const cells = state.cells;
  const baLinks = state.ba_links;

  for (const link of baLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

    const bij = cj.B.x - ci.B.x;

    if (bij < 0) {
      // Swap positions to restore ordering
      ci.B.x += bij / 2;
      cj.B.x -= bij / 2;
    }
  }
}

/**
 * Project maximum basal junction distance constraints.
 * Prevents basal points from separating too far.
 */
export function projectMaxBasalDistanceConstraints(
  state: SimulationState,
  params: SimulationParams
): void {
  const cells = state.cells;
  const baLinks = state.ba_links;
  const maxDist = params.cell_prop.max_basal_junction_dist;

  for (const link of baLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

    const bij = cj.B.x - ci.B.x;

    if (bij > maxDist) {
      const excess = bij - maxDist;
      ci.B.x += excess / 2;
      cj.B.x -= excess / 2;
    }
  }
}

/**
 * Project basal points onto the basal curve.
 */
export function projectBasalCurveConstraints(
  state: SimulationState,
  params: SimulationParams
): void {
  const cells = state.cells;
  const curvature = params.general.curvature;

  for (const cell of cells) {
    const B = Vector2.from(cell.B);
    const projected = basalCurve(B, curvature);
    cell.B.x = projected.x;
    cell.B.y = projected.y;
  }
}

/**
 * Apply all constraints in sequence.
 */
export function applyAllConstraints(
  state: SimulationState,
  params: SimulationParams
): void {
  projectHardSphereConstraints(state, params);
  projectBasalOrderingConstraints(state, params);
  projectMaxBasalDistanceConstraints(state, params);
  projectBasalCurveConstraints(state, params);
}
