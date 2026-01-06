/**
 * Geometry functions for basal membrane curves.
 * Supports both circular and elliptical basal membranes.
 */
import { Vector2 } from './vector2';

/**
 * Get the center of curvature for the basal membrane.
 * For curvature_1 = curvature_2 = 0, returns origin.
 * For non-zero curvatures, center is at y = 1/curvature_2.
 */
export function shapeCenter(curvature_1: number, curvature_2: number): Vector2 {
  if (curvature_1 === 0 && curvature_2 === 0) {
    return new Vector2(0, 0);
  }
  if (curvature_2 === 0) {
    return new Vector2(0, 0);
  }
  return new Vector2(0, 1 / curvature_2);
}

/**
 * Get ellipse semi-axes from curvatures.
 * a = 1/curvature_1 (horizontal semi-axis)
 * b = 1/curvature_2 (vertical semi-axis)
 */
function getEllipseAxes(curvature_1: number, curvature_2: number): { a: number; b: number } {
  const a = curvature_1 !== 0 ? Math.abs(1 / curvature_1) : Infinity;
  const b = curvature_2 !== 0 ? Math.abs(1 / curvature_2) : Infinity;
  return { a, b };
}

/**
 * Project a point onto an ellipse using gradient descent.
 * Finds theta such that the point on the ellipse (a*cos(theta), b*sin(theta))
 * minimizes distance to the given point.
 * 
 * @param pos - Position to project (relative to ellipse center)
 * @param a - Horizontal semi-axis
 * @param b - Vertical semi-axis
 * @returns Optimal theta parameter
 */
function projectOntoEllipse(pos: Vector2, a: number, b: number): number {
  // Initial guess: angle to the point
  let theta = Math.atan2(pos.y / b, pos.x / a);
  
  // Gradient descent to minimize ||(a*cos(t), b*sin(t)) - pos||^2
  const maxIter = 100;
  const tol = 1e-10;
  let learningRate = 0.5;
  
  for (let i = 0; i < maxIter; i++) {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    
    // Point on ellipse
    const ex = a * c;
    const ey = b * s;
    
    // Gradient of squared distance: d/dtheta[(ex - px)^2 + (ey - py)^2]
    // = 2*(ex - px)*(-a*sin(theta)) + 2*(ey - py)*(b*cos(theta))
    const gradient = -2 * a * s * (ex - pos.x) + 2 * b * c * (ey - pos.y);
    
    if (Math.abs(gradient) < tol) {
      break;
    }
    
    // Gradient descent step
    const newTheta = theta - learningRate * gradient;
    
    // Check if we're making progress
    const newC = Math.cos(newTheta);
    const newS = Math.sin(newTheta);
    const newEx = a * newC;
    const newEy = b * newS;
    
    const oldDist = (ex - pos.x) * (ex - pos.x) + (ey - pos.y) * (ey - pos.y);
    const newDist = (newEx - pos.x) * (newEx - pos.x) + (newEy - pos.y) * (newEy - pos.y);
    
    // Adaptive learning rate: reduce if we overshoot, increase if making good progress
    if (newDist < oldDist) {
      theta = newTheta;
      learningRate = Math.min(1.0, learningRate * 1.1); // Increase learning rate
    } else {
      learningRate *= 0.5; // Decrease learning rate
      if (learningRate < 1e-10) {
        break; // Learning rate too small, stop
      }
    }
  }
  
  return theta;
}

/**
 * Compute arc length of an ellipse from theta=0 to theta using adaptive integration.
 * Arc length integral: ∫√(a²sin²(t) + b²cos²(t)) dt
 * 
 * @param theta - End angle
 * @param a - Horizontal semi-axis
 * @param b - Vertical semi-axis
 * @returns Arc length from 0 to theta
 */
function ellipseArcLength(theta: number, a: number, b: number): number {
  // Integrand: sqrt(a^2 * sin^2(t) + b^2 * cos^2(t))
  const integrand = (t: number) => {
    const s = Math.sin(t);
    const c = Math.cos(t);
    return Math.sqrt(a * a * s * s + b * b * c * c);
  };
  
  // Adaptive Simpson's rule
  const simpson = (f: (x: number) => number, a: number, b: number, tol: number): number => {
    const c = (a + b) / 2;
    const h = b - a;
    const fa = f(a);
    const fb = f(b);
    const fc = f(c);
    
    const s = (h / 6) * (fa + 4 * fc + fb);
    
    return adaptiveSimpsonAux(f, a, b, tol, s, fa, fb, fc, h, 0);
  };
  
  const adaptiveSimpsonAux = (
    f: (x: number) => number,
    a: number,
    b: number,
    tol: number,
    s: number,
    fa: number,
    fb: number,
    fc: number,
    h: number,
    depth: number
  ): number => {
    const maxDepth = 20;
    const c = (a + b) / 2;
    const d = (a + c) / 2;
    const e = (c + b) / 2;
    
    const fd = f(d);
    const fe = f(e);
    
    const sleft = (h / 12) * (fa + 4 * fd + fc);
    const sright = (h / 12) * (fc + 4 * fe + fb);
    const s2 = sleft + sright;
    
    if (depth >= maxDepth || Math.abs(s2 - s) <= 15 * tol) {
      return s2 + (s2 - s) / 15;
    }
    
    return (
      adaptiveSimpsonAux(f, a, c, tol / 2, sleft, fa, fc, fd, h / 2, depth + 1) +
      adaptiveSimpsonAux(f, c, b, tol / 2, sright, fc, fb, fe, h / 2, depth + 1)
    );
  };
  
  // Handle negative theta
  const sign = theta >= 0 ? 1 : -1;
  const absTheta = Math.abs(theta);
  
  if (absTheta < 1e-10) {
    return 0;
  }
  
  return sign * simpson(integrand, 0, absTheta, 1e-8);
}

/**
 * Find theta such that arc length from 0 to theta equals target length.
 * Uses forward integration with adaptive bisection refinement.
 * 
 * @param targetLength - Target arc length
 * @param a - Horizontal semi-axis
 * @param b - Vertical semi-axis
 * @returns Theta value
 */
function ellipseThetaFromArcLength(targetLength: number, a: number, b: number): number {
  if (Math.abs(targetLength) < 1e-10) {
    return 0;
  }
  
  const sign = targetLength >= 0 ? 1 : -1;
  const absTarget = Math.abs(targetLength);
  
  // Arc length velocity at angle t: sqrt(a² sin²(t) + b² cos²(t))
  const velocity = (t: number) => {
    const s = Math.sin(t);
    const c = Math.cos(t);
    return Math.sqrt(a * a * s * s + b * b * c * c);
  };
  
  // Start from theta = 0, arcLength = 0
  let theta = 0;
  let arcLength = 0;
  
  // Initial step size (estimate based on average radius)
  const avgRadius = (a + b) / 2;
  let dt = absTarget / avgRadius / 10; // Start with ~10 steps
  
  const tol = 1e-8;
  const maxIter = 1000;
  let direction = 1; // 1 for forward, -1 for backward
  
  for (let iter = 0; iter < maxIter; iter++) {
    // Check if we're close enough
    const error = absTarget - arcLength;
    
    if (Math.abs(error) < tol) {
      break;
    }
    
    // Take a step
    const newTheta = theta + direction * dt;
    
    // Estimate arc length increment using trapezoidal rule
    const v1 = velocity(theta);
    const v2 = velocity(newTheta);
    const deltaArc = Math.abs(dt) * (v1 + v2) / 2;
    
    const newArcLength = arcLength + direction * deltaArc;
    
    // Check if we've crossed the target
    const wasBelow = arcLength < absTarget;
    const isAbove = newArcLength > absTarget;
    
    if (wasBelow && isAbove) {
      // We've crossed - use bisection
      dt = dt / 2;
      direction = -1;
    } else if (!wasBelow && !isAbove) {
      // We crossed back - reverse again
      dt = dt / 2;
      direction = 1;
    } else {
      // Haven't crossed yet, keep going in same direction
      theta = newTheta;
      arcLength = newArcLength;
      
      // If step is getting too small, we're converged
      if (Math.abs(deltaArc) < tol) {
        break;
      }
    }
    
    // Safety check: if dt becomes too small, stop
    if (Math.abs(dt) < 1e-12) {
      break;
    }
  }
  
  return sign * theta;
}

/**
 * Parameterize the basal curve by arc length.
 * For curvature_1 = curvature_2 = 0: straight line at y = 0.
 * For non-zero curvatures: elliptical arc.
 *
 * @param l - Arc length parameter (x-position for straight line)
 * @param curvature_1 - Horizontal membrane curvature
 * @param curvature_2 - Vertical membrane curvature
 * @returns Position on the basal curve
 */
export function basalCurveParam(l: number, curvature_1: number, curvature_2: number): Vector2 {
  if (curvature_1 === 0 && curvature_2 === 0) {
    return new Vector2(l, 0); // Straight line at y = 0
  }

  const center = shapeCenter(curvature_1, curvature_2);
  const { a, b } = getEllipseAxes(curvature_1, curvature_2);
  
  // Handle straight line cases
  if (!isFinite(a) || !isFinite(b)) {
    return new Vector2(l, 0);
  }
  
  const dir = -Math.sign(curvature_2);
  
  // For circular case, use direct formula
  if (Math.abs(curvature_1 - curvature_2) < 1e-10) {
    const radius = a;
    const theta = l / radius;
    return new Vector2(
      center.x + dir * radius * Math.sin(theta),
      center.y + dir * radius * Math.cos(theta)
    );
  }
  
  // For elliptical case, find theta from arc length
  const theta = ellipseThetaFromArcLength(l, a, b);
  
  return new Vector2(
    center.x + dir * a * Math.sin(theta),
    center.y + dir * b * Math.cos(theta)
  );
}

/**
 * Project a point onto the basal curve.
 * For curvature_1 = curvature_2 = 0: projects to y = 0.
 * For non-zero curvatures: projects to the ellipse.
 *
 * @param pos - Position to project
 * @param curvature_1 - Horizontal membrane curvature
 * @param curvature_2 - Vertical membrane curvature
 * @returns Projected position on the basal curve
 */
export function basalCurve(pos: Vector2, curvature_1: number, curvature_2: number): Vector2 {
  if (curvature_1 === 0 && curvature_2 === 0) {
    return new Vector2(pos.x, 0); // Straight line at y = 0
  }

  const center = shapeCenter(curvature_1, curvature_2);
  const { a, b } = getEllipseAxes(curvature_1, curvature_2);
  
  // Handle straight line cases
  if (!isFinite(a) || !isFinite(b)) {
    return new Vector2(pos.x, 0);
  }
  
  // For circular case, use direct formula
  if (Math.abs(curvature_1 - curvature_2) < 1e-10) {
    const radius = a;
    const toPos = pos.sub(center);
    const normalized = toPos.setMag(radius);
    return center.add(normalized);
  }
  
  // For elliptical case, use Newton's method
  const relPos = pos.sub(center);
  const dir = -Math.sign(curvature_2);
  const theta = projectOntoEllipse(relPos.scale(dir), a, b);
  
  return new Vector2(
    center.x + dir * a * Math.cos(theta),
    center.y + dir * b * Math.sin(theta)
  );
}

/**
 * Get the outward normal at a position (pointing into the tissue).
 * For curvature_1 = curvature_2 = 0: always (0, 1).
 * For non-zero curvatures: perpendicular to ellipse at that point.
 *
 * @param pos - Position (should be on or near the basal curve)
 * @param curvature_1 - Horizontal membrane curvature
 * @param curvature_2 - Vertical membrane curvature
 * @returns Unit normal vector pointing into the tissue
 */
export function basalNormal(pos: Vector2, curvature_1: number, curvature_2: number): Vector2 {
  if (curvature_1 === 0 && curvature_2 === 0) {
    return new Vector2(0, 1); // Always pointing up
  }

  const center = shapeCenter(curvature_1, curvature_2);
  const { a, b } = getEllipseAxes(curvature_1, curvature_2);
  
  // Handle straight line cases
  if (!isFinite(a) || !isFinite(b)) {
    return new Vector2(0, 1);
  }
  
  // For circular case
  if (Math.abs(curvature_1 - curvature_2) < 1e-10) {
    return center.sub(pos).setMag(Math.sign(curvature_2));
  }
  
  // For elliptical case: gradient of x²/a² + y²/b² is (2x/a², 2y/b²)
  // This points outward from ellipse
  const relPos = pos.sub(center);
  const dir = -Math.sign(curvature_2);
  const scaledPos = relPos.scale(dir);
  
  const gradX = 2 * scaledPos.x / (a * a);
  const gradY = 2 * scaledPos.y / (b * b);
  const grad = new Vector2(gradX, gradY);
  
  // Normal points outward (same direction as gradient for ellipse)
  // Scale by dir to account for orientation
  return grad.setMag(Math.sign(curvature_2));
}

/**
 * Get the arc length position along the basal curve.
 * This is approximately the x-coordinate for small curvature.
 *
 * @param pos - Position on or near the basal curve
 * @param curvature_1 - Horizontal membrane curvature
 * @param curvature_2 - Vertical membrane curvature
 * @returns Arc length parameter
 */
export function basalArcLength(pos: Vector2, curvature_1: number, curvature_2: number): number {
  if (curvature_1 === 0 && curvature_2 === 0) {
    return pos.x;
  }

  const center = shapeCenter(curvature_1, curvature_2);
  const { a, b } = getEllipseAxes(curvature_1, curvature_2);
  
  // Handle straight line cases
  if (!isFinite(a) || !isFinite(b)) {
    return pos.x;
  }
  
  const toPos = pos.sub(center);
  const dir = -Math.sign(curvature_2);
  
  // For circular case
  if (Math.abs(curvature_1 - curvature_2) < 1e-10) {
    const radius = a;
    const angle = Math.atan2(dir * toPos.x, dir * toPos.y);
    return angle * radius;
  }
  
  // For elliptical case: find theta and compute arc length
  const scaledPos = toPos.scale(dir);
  const theta = Math.atan2(scaledPos.y, scaledPos.x);
  
  return ellipseArcLength(theta, a, b);
}

/**
 * Convert curved coordinates (l along basal curve, h along outward normal)
 * into Cartesian coordinates.
 *
 * @param l - Basal curve parameter
 * @param h - Distance along the outward normal (into tissue)
 * @param curvature_1 - Horizontal membrane curvature
 * @param curvature_2 - Vertical membrane curvature
 * @returns Cartesian position
 */
export function curvedCoordsToPosition(l: number, h: number, curvature_1: number, curvature_2: number): Vector2 {
  const bp = basalCurveParam(l, curvature_1, curvature_2);
  return bp.add(basalNormal(bp, curvature_1, curvature_2).scale(h));
}
