/**
 * Constraint projections for the simulation.
 * Enforces hard constraints like collision, basal ordering, etc.
 */
import { Vector2 } from '../math/vector2';
import { basalCurve, basalArcLength, basalCurveParam } from '../math/geometry';
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
 * Ensures basal points maintain their left-right ordering along the arc length.
 * Uses arc length comparison instead of x-coordinate for curved membranes.
 */
export function projectBasalOrderingConstraints(
  state: SimulationState,
  params: SimulationParams
): void {
  const cells = state.cells;
  const baLinks = state.ba_links;
  const curvature = params.general.curvature;

  for (const link of baLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

    const Bi = Vector2.from(ci.B);
    const Bj = Vector2.from(cj.B);

    const li = basalArcLength(Bi, curvature);
    const lj = basalArcLength(Bj, curvature);

    
    
    // Arc length delta: positive means j is "ahead" of i (correct ordering)
    let deltaL = 0 ; // lj - li;

    // Compute modulo for periodic boundary if needed
    if (params.general.full_circle && curvature !== 0) {
      const circumference = 2 * Math.PI * Math.abs(1 / curvature);
      while (deltaL > circumference / 2) {
        // j is too far ahead - wrap around
        deltaL -= circumference;
        console.log('[DEBUG] Adjusting deltaL for periodicity:', {
          ci: ci.id,
          cj: cj.id,
          li,
          lj,
          deltaL,
        });
      } 
      
      while (deltaL < -circumference / 2) {
        // j is too far behind - wrap around
        deltaL += circumference;
        console.log('[DEBUG] Adjusting deltaL for periodicity:', {
          ci: ci.id,
          cj: cj.id,
          li,
          lj,
          deltaL,
        });
      }
    }

    if (deltaL < 0) {
      // Ordering violation - move each point by half the violation along the curve
      const correction = deltaL / 2;
      const newLi = li + correction;
      const newLj = lj - correction;

      const newBi = basalCurveParam(newLi, curvature);
      const newBj = basalCurveParam(newLj, curvature);

      console.log('[DEBUG] Correcting basal ordering violation:', {
        ci: ci.id,
        cj: cj.id,
        li,
        lj,
        newLi,
        newLj,
      });

      ci.B.x = newBi.x;
      ci.B.y = newBi.y;

      cj.B.x = newBj.x;
      cj.B.y = newBj.y;
    }
  }
}

/**
 * Project maximum basal junction distance constraints.
 * Prevents basal points from separating too far along the arc length.
 */
export function projectMaxBasalDistanceConstraints(
  state: SimulationState,
  params: SimulationParams
): void {
  const cells = state.cells;
  const baLinks = state.ba_links;
  const curvature = params.general.curvature;
  const maxDist = params.cell_prop.max_basal_junction_dist;

  for (const link of baLinks) {
    const ci = cells[link.l];
    const cj = cells[link.r];

    const Bi = Vector2.from(ci.B);
    const Bj = Vector2.from(cj.B);

    const li = basalArcLength(Bi, curvature);
    const lj = basalArcLength(Bj, curvature);

    // Arc length distance between basal points
    const deltaL = lj - li;

    if (deltaL > maxDist) {
      // Exceeds max distance - pull points closer along the curve
      const excess = deltaL - maxDist;
      const newLi = li + excess / 2;
      const newLj = lj - excess / 2;

      const newBi = basalCurveParam(newLi, curvature);
      const newBj = basalCurveParam(newLj, curvature);

      ci.B.x = newBi.x;
      ci.B.y = newBi.y;
      cj.B.x = newBj.x;
      cj.B.y = newBj.y;
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
