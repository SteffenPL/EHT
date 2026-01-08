/**
 * Projection utilities for EHT model.
 * Used for statistics computation.
 */

import { Vector2 } from '@/core/math/vector2';
import type { EHTSimulationState } from '../types';

/**
 * Project a point onto a line segment.
 * Returns the closest point on the segment [p1, p2] to the given point.
 */
function projectOntoSegment(point: Vector2, p1: Vector2, p2: Vector2): Vector2 {
  const segment = p2.sub(p1);
  const toPoint = point.sub(p1);

  const segmentLengthSq = segment.magSq();
  if (segmentLengthSq < 1e-10) {
    return p1; // Degenerate segment
  }

  const t = Math.max(0, Math.min(1, toPoint.dot(segment) / segmentLengthSq));
  return p1.add(segment.scale(t));
}

/**
 * Project a point onto the apical line strip.
 * The apical line strip is formed by connecting all apical points A_i in order.
 * Returns the closest point on any segment of the line strip.
 */
export function projectOntoApicalStrip(point: Vector2, state: EHTSimulationState): Vector2 {
  const cells = state.cells;
  if (cells.length === 0) {
    return point;
  }

  if (cells.length === 1) {
    return Vector2.from(cells[0].A);
  }

  let closestPoint = Vector2.from(cells[0].A);
  let minDistSq = point.distSq(closestPoint);

  // Check all segments in the apical line strip
  for (let i = 0; i < cells.length - 1; i++) {
    const A_i = Vector2.from(cells[i].A);
    const A_next = Vector2.from(cells[i + 1].A);

    const proj = projectOntoSegment(point, A_i, A_next);
    const distSq = point.distSq(proj);

    if (distSq < minDistSq) {
      minDistSq = distSq;
      closestPoint = proj;
    }
  }

  // For closed curves, also check the closing segment
  if (cells.length > 2) {
    const A_last = Vector2.from(cells[cells.length - 1].A);
    const A_first = Vector2.from(cells[0].A);

    const proj = projectOntoSegment(point, A_last, A_first);
    const distSq = point.distSq(proj);

    if (distSq < minDistSq) {
      closestPoint = proj;
    }
  }

  return closestPoint;
}

/**
 * Project a point onto the basal curve using the basalGeometry object.
 * This is a convenience wrapper around the existing basalGeometry.projectPoint method.
 */
export function projectOntoBasalCurve(point: Vector2, state: EHTSimulationState): Vector2 {
  return state.basalGeometry.projectPoint(point);
}
