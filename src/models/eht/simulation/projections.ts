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
 * If no links are present, fall back to the ordered apical points from cells.
 * Returns the closest point on any segment of the line strip.
 */
export function projectOntoApicalStrip(point: Vector2, state: EHTSimulationState): Vector2 {
  const { cells, ap_links } = state;

  const segments: [Vector2, Vector2][] = [];

  if (ap_links.length > 0) {
    for (const link of ap_links) {
      segments.push([
        Vector2.from(cells[link.l].A),
        Vector2.from(cells[link.r].A),
      ]);
    }
  } else {
    const geometry = getBasalGeometry(state);
    const apicalPoints = cells
      .filter((cell) => cell.has_A)
      .map((cell, index) => ({
        index,
        arcLength: geometry.getArcLength(Vector2.from(cell.B)),
        point: Vector2.from(cell.A),
      }))
      .sort((a, b) => a.arcLength - b.arcLength || a.index - b.index)
      .map(({ point }) => point);

    if (apicalPoints.length === 0) {
      return point;
    }

    if (apicalPoints.length === 1) {
      return apicalPoints[0];
    }

    for (let i = 0; i < apicalPoints.length - 1; i++) {
      segments.push([apicalPoints[i], apicalPoints[i + 1]]);
    }
  }

  // Initialize with the first strip segment
  let closestPoint = projectOntoSegment(point, segments[0][0], segments[0][1]);
  let minDistSq = point.distSq(closestPoint);

  // Check remaining strip segments
  for (let i = 1; i < segments.length; i++) {
    const proj = projectOntoSegment(point, segments[i][0], segments[i][1]);
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
