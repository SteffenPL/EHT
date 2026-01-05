/**
 * Geometry functions for basal membrane curves.
 * Ported from the original simulation.js.
 */
import { Vector2 } from './vector2';

/**
 * Get the center of curvature for the basal membrane.
 * For curvature = 0, returns origin.
 * For non-zero curvature, center is at y = 1/curvature.
 */
export function shapeCenter(curvature: number): Vector2 {
  if (curvature === 0) {
    return new Vector2(0, 0);
  }
  return new Vector2(0, 1 / curvature);
}

/**
 * Parameterize the basal curve by arc length.
 * For curvature = 0: straight line at y = 0.
 * For non-zero curvature: circular arc.
 *
 * @param l - Arc length parameter (x-position for straight line)
 * @param curvature - Membrane curvature
 * @returns Position on the basal curve
 */
export function basalCurveParam(l: number, curvature: number): Vector2 {
  if (curvature === 0) {
    return new Vector2(l, 0); // Straight line at y = 0
  }

  const center = shapeCenter(curvature);
  const radius = Math.abs(1 / curvature);
  const dir = -Math.sign(curvature);
  const theta = l / radius;

  return new Vector2(
    center.x + dir * radius * Math.sin(theta),
    center.y + dir * radius * Math.cos(theta)
  );
}

/**
 * Project a point onto the basal curve.
 * For curvature = 0: projects to y = 0.
 * For non-zero curvature: projects to the circle.
 *
 * @param pos - Position to project
 * @param curvature - Membrane curvature
 * @returns Projected position on the basal curve
 */
export function basalCurve(pos: Vector2, curvature: number): Vector2 {
  if (curvature === 0) {
    return new Vector2(pos.x, 0); // Straight line at y = 0
  }

  const center = shapeCenter(curvature);
  const radius = Math.abs(1 / curvature);

  // Vector from center to pos, normalized to radius length
  const toPos = pos.sub(center);
  const normalized = toPos.setMag(radius);
  return center.add(normalized);
}

/**
 * Get the outward normal at a position (pointing into the tissue).
 * For curvature = 0: always (0, 1).
 * For non-zero curvature: radial direction from center.
 *
 * @param pos - Position (should be on or near the basal curve)
 * @param curvature - Membrane curvature
 * @returns Unit normal vector pointing into the tissue
 */
export function basalNormal(pos: Vector2, curvature: number): Vector2 {
  if (curvature === 0) {
    return new Vector2(0, 1); // Always pointing up
  }

  const center = shapeCenter(curvature);
  // Normal points from center outward, scaled by sign of curvature
  return center.sub(pos).setMag(Math.sign(curvature));
}

/**
 * Get the arc length position along the basal curve.
 * This is approximately the x-coordinate for small curvature.
 *
 * @param pos - Position on or near the basal curve
 * @param curvature - Membrane curvature
 * @returns Arc length parameter
 */
export function basalArcLength(pos: Vector2, curvature: number): number {
  if (curvature === 0) {
    return pos.x;
  }

  const center = shapeCenter(curvature);
  const toPos = pos.sub(center);
  const radius = Math.abs(1 / curvature);
  const dir = -Math.sign(curvature);
  const angle = Math.atan2(dir * toPos.x, dir * toPos.y);

  // With basalCurveParam using theta = l / radius, we have l = theta * radius.
  return angle * radius;
}

/**
 * Convert curved coordinates (l along basal curve, h along outward normal)
 * into Cartesian coordinates.
 *
 * @param l - Basal curve parameter
 * @param h - Distance along the outward normal (into tissue)
 * @param curvature - Membrane curvature
 * @returns Cartesian position
 */
export function curvedCoordsToPosition(l: number, h: number, curvature: number): Vector2 {
  const bp = basalCurveParam(l, curvature);
  return bp.add(basalNormal(bp, curvature).scale(h));
}
