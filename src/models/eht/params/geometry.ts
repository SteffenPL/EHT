/**
 * Ellipse geometry calculations for the EHT model.
 * Converts user-friendly perimeter/aspect_ratio to internal curvature values.
 */

/**
 * Ellipse geometry result containing semi-axes and curvatures.
 */
export interface EllipseGeometry {
  a: number;           // horizontal semi-axis
  b: number;           // vertical semi-axis
  curvature_1: number; // 1/a (horizontal curvature)
  curvature_2: number; // 1/b (vertical curvature)
}

/**
 * Compute ellipse perimeter using Ramanujan's approximation.
 * P ≈ π(a + b)(1 + 3h / (10 + √(4 - 3h)))
 * where h = (a - b)² / (a + b)²
 *
 * This approximation is accurate to within 0.015% for any ellipse.
 *
 * @param a - Horizontal semi-axis
 * @param b - Vertical semi-axis
 * @returns Approximate perimeter
 */
export function ramanujanPerimeter(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  if (a === b) return 2 * Math.PI * a; // Circle: exact

  const sum = a + b;
  const diff = a - b;
  const h = (diff * diff) / (sum * sum);

  return Math.PI * sum * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

/**
 * Compute ellipse semi-axes and curvatures from perimeter and aspect ratio.
 *
 * Algorithm:
 * 1. Normalize: b' = 1, a' = aspectRatio
 * 2. Compute normalized perimeter P' using Ramanujan's formula
 * 3. Scale factor f = perimeter / P'
 * 4. Final axes: a = f * a', b = f * b'
 * 5. Curvatures: curvature_1 = 1/a, curvature_2 = 1/b
 *
 * Special cases:
 * - perimeter = 0: straight line (curvatures = 0)
 * - aspectRatio = 1: circle (curvature_1 = curvature_2)
 * - aspectRatio < 1: ellipse with b > a (taller than wide)
 * - aspectRatio > 1: ellipse with a > b (wider than tall)
 *
 * @param perimeter - Target ellipse perimeter (0 for straight line)
 * @param aspectRatio - Ratio a/b (any positive value)
 * @returns EllipseGeometry with computed values
 */
export function computeEllipseFromPerimeter(
  perimeter: number,
  aspectRatio: number
): EllipseGeometry {
  // Special case: straight line
  if (perimeter === 0) {
    return {
      a: Infinity,
      b: Infinity,
      curvature_1: 0,
      curvature_2: 0,
    };
  }

  // Ensure aspectRatio is positive
  const ar = Math.max(Number.EPSILON, aspectRatio);

  // Normalized ellipse: b' = 1, a' = aspectRatio
  // This works for any positive aspectRatio (including < 1)
  const aPrime = ar;
  const bPrime = 1;

  // Compute normalized perimeter
  const pPrime = ramanujanPerimeter(aPrime, bPrime);

  // Scale factor to achieve target perimeter
  const f = perimeter / pPrime;

  // Final semi-axes
  const a = f * aPrime;
  const b = f * bPrime;

  // Curvatures (handle potential division by zero)
  const curvature_1 = a > 0 ? 1 / a : 0;
  const curvature_2 = b > 0 ? 1 / b : 0;

  return {
    a,
    b,
    curvature_1,
    curvature_2,
  };
}
