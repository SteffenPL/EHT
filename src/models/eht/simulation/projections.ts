/**
 * Projection utilities for EHT model.
 * Used for statistics computation.
 */

import { Vector2 } from '@/core/math/vector2';
import { createBasalGeometry } from '@/core/math';
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
 * Get a working BasalGeometry instance from state.
 * Handles cases where state was cloned (structuredClone loses class methods).
 */
function getBasalGeometry(state: EHTSimulationState) {
  // If basalGeometry has working methods, use it directly
  if (typeof state.basalGeometry?.projectPoint === 'function') {
    return state.basalGeometry;
  }

  // Otherwise, recreate from curvatures stored in geometry or basalGeometry
  const curvature_1 = state.geometry?.curvature_1 ?? state.basalGeometry?.curvature_1 ?? 0;
  const curvature_2 = state.geometry?.curvature_2 ?? state.basalGeometry?.curvature_2 ?? 0;

  return createBasalGeometry(curvature_1, curvature_2, 360);
}

/**
 * Project a point onto the apical line strip.
 * The apical line strip is formed by the segments defined by apical links.
 * Only apical points that are part of a link belong to the apical strip.
 * Returns the closest point on any segment of the line strip.
 */
export function projectOntoApicalStrip(point: Vector2, state: EHTSimulationState): Vector2 {
  const { cells, ap_links } = state;

  if (ap_links.length === 0) {
    return point;
  }

  // Initialize with the first link's segment
  const firstLink = ap_links[0];
  const A_l = Vector2.from(cells[firstLink.l].A);
  const A_r = Vector2.from(cells[firstLink.r].A);
  let closestPoint = projectOntoSegment(point, A_l, A_r);
  let minDistSq = point.distSq(closestPoint);

  // Check all segments defined by apical links
  for (let i = 1; i < ap_links.length; i++) {
    const link = ap_links[i];
    const A_left = Vector2.from(cells[link.l].A);
    const A_right = Vector2.from(cells[link.r].A);

    const proj = projectOntoSegment(point, A_left, A_right);
    const distSq = point.distSq(proj);

    if (distSq < minDistSq) {
      minDistSq = distSq;
      closestPoint = proj;
    }
  }

  return closestPoint;
}

/**
 * Project a point onto the basal curve using the basalGeometry object.
 * Handles cases where state was cloned and basalGeometry lost its methods.
 */
export function projectOntoBasalCurve(point: Vector2, state: EHTSimulationState): Vector2 {
  const geometry = getBasalGeometry(state);
  return geometry.projectPoint(point);
}
