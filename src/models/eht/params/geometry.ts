/**
 * Ellipse geometry calculations for the EHT model.
 * Converts user-friendly perimeter/aspect_ratio to internal curvature values.
 * 
 * Aspect ratio semantics:
 * - aspect = 0: straight line
 * - aspect > 0: curve above x-axis (normal points into tissue, up)
 *   - large aspect = large vertical radius, small horizontal radius
 * - aspect < 0: curve below x-axis (normal points outward, down)
 *   - |aspect| determines the shape
 */

/**
 * Ellipse geometry result containing semi-axes and curvatures.
 */
export interface EllipseGeometry {
  a: number;           // horizontal semi-axis
  b: number;           // vertical semi-axis
  curvature_1: number; // 1/a (horizontal curvature)
  curvature_2: number; // 1/b (vertical curvature), sign indicates orientation
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
 * New semantics:
 * - aspect = 0: straight line (curvatures = 0)
 * - aspect > 0: tissue on inside of curve (normal points up/inward)
 *   - Larger aspect = larger vertical radius (tall ellipse)
 *   - aspect = 1: circle
 * - aspect < 0: tissue on outside of curve (normal points down/outward)
 *   - Same shape as |aspect|, but curvatures are negative
 *
 * The aspect ratio determines b/a (vertical/horizontal), so:
 * - aspect = 2: vertical radius is twice horizontal (tall ellipse)
 * - aspect = 0.5: vertical radius is half horizontal (wide ellipse)
 *
 * @param perimeter - Target ellipse perimeter (used when aspect != 0)
 * @param aspectRatio - Shape: 0=line, >0=curve above, <0=curve below
 * @returns EllipseGeometry with computed values
 */
export function computeEllipseFromPerimeter(
  perimeter: number,
  aspectRatio: number
): EllipseGeometry {
  // Special case: straight line (aspect = 0)
  if (aspectRatio === 0) {
    return {
      a: Infinity,
      b: Infinity,
      curvature_1: 0,
      curvature_2: 0,
    };
  }

  // Extract sign for orientation and magnitude for shape
  const sign = Math.sign(aspectRatio);
  const absAspect = Math.abs(aspectRatio);

  // New semantics: aspect = b/a (vertical/horizontal)
  // So if aspect = 2, b = 2*a (tall ellipse)
  // Normalized ellipse: a' = 1, b' = absAspect
  const aPrime = 1;
  const bPrime = absAspect;

  // Compute normalized perimeter
  const pPrime = ramanujanPerimeter(aPrime, bPrime);

  // Scale factor to achieve target perimeter
  const f = perimeter / pPrime;

  // Final semi-axes
  const a = f * aPrime;
  const b = f * bPrime;

  // Curvatures (handle potential division by zero)
  // Sign controls orientation: positive = tissue inside, negative = tissue outside
  const curvature_1 = a > 0 ? sign / a : 0;
  const curvature_2 = b > 0 ? sign / b : 0;

  return {
    a,
    b,
    curvature_1,
    curvature_2,
  };
}
