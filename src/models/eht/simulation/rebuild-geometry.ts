/**
 * Geometry rebuild logic.
 * Detects when simulation-local params have diverged from the current
 * basalGeometry and rebuilds it, re-projecting cell basal points.
 */

import { Vector2 } from '@/core/math/vector2';
import { createBasalGeometry } from '@/core/math';
import type { EHTSimulationState } from '../types';
import { computeEllipseFromPerimeter } from '../params/geometry';

/**
 * Check if geometry needs rebuilding and do so if needed.
 * Compares curvatures derived from current state.params against
 * the curvatures stored in state.geometry (which reflect what
 * basalGeometry was built from).
 *
 * If they differ:
 * 1. Recompute curvatures
 * 2. Rebuild basalGeometry
 * 3. Re-project all cell basal points onto the new curve
 */
export function rebuildGeometryIfNeeded(state: EHTSimulationState): void {
  const params = state.params;
  if (!params || !state.geometry) return;

  const { perimeter, aspect_ratio } = params.general;
  const newGeom = computeEllipseFromPerimeter(perimeter, aspect_ratio);

  // Compare against stored curvatures
  const eps = 1e-12;
  if (
    Math.abs(newGeom.curvature_1 - state.geometry.curvature_1) < eps &&
    Math.abs(newGeom.curvature_2 - state.geometry.curvature_2) < eps
  ) {
    return; // No change needed
  }

  // Update stored curvatures
  state.geometry.curvature_1 = newGeom.curvature_1;
  state.geometry.curvature_2 = newGeom.curvature_2;

  // Rebuild basalGeometry
  state.basalGeometry = createBasalGeometry(
    newGeom.curvature_1,
    newGeom.curvature_2,
    360
  );

  // Re-project all cell basal points
  for (const cell of state.cells) {
    const B = Vector2.from(cell.B);
    const projected = state.basalGeometry.projectPoint(B);
    cell.B.x = projected.x;
    cell.B.y = projected.y;
  }
}
