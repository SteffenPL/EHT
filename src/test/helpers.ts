/**
 * Test utilities and helpers for scientific computing tests.
 */

import { SeededRandom } from '@/core/math/random';

/**
 * Assert that two numbers are close within a tolerance.
 * Useful for floating-point comparisons in numerical tests.
 *
 * @param actual - The actual value
 * @param expected - The expected value
 * @param tolerance - Absolute tolerance (default: 1e-10)
 * @param message - Optional error message
 */
export function assertClose(
  actual: number,
  expected: number,
  tolerance: number = 1e-10,
  message?: string
): void {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    const msg = message
      ? `${message}: `
      : '';
    throw new Error(
      `${msg}Expected ${actual} to be close to ${expected} (tolerance: ${tolerance}), but difference was ${diff}`
    );
  }
}

/**
 * Create a seeded RNG for reproducible tests.
 *
 * @param seed - Optional seed string (default: 'test-seed')
 * @returns SeededRandom instance
 */
export function createTestRng(seed: string = 'test-seed'): SeededRandom {
  return new SeededRandom(seed);
}

/**
 * Generate test data points around an ellipse.
 *
 * @param a - Horizontal semi-axis
 * @param b - Vertical semi-axis
 * @param numPoints - Number of points to generate
 * @returns Array of [theta, x, y] tuples
 */
export function generateEllipsePoints(
  a: number,
  b: number,
  numPoints: number
): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i < numPoints; i++) {
    const theta = (i / numPoints) * 2 * Math.PI;
    const x = a * Math.cos(theta);
    const y = b * Math.sin(theta);
    points.push([theta, x, y]);
  }
  return points;
}

/**
 * Compute exact circle perimeter.
 *
 * @param radius - Circle radius
 * @returns Perimeter
 */
export function circlePerimeter(radius: number): number {
  return 2 * Math.PI * radius;
}

/**
 * Check if a value is close to an expected value with relative tolerance.
 *
 * @param actual - The actual value
 * @param expected - The expected value
 * @param relTolerance - Relative tolerance (default: 1e-6)
 * @returns True if close within relative tolerance
 */
export function isCloseRelative(
  actual: number,
  expected: number,
  relTolerance: number = 1e-6
): boolean {
  if (expected === 0) {
    return Math.abs(actual) < relTolerance;
  }
  return Math.abs((actual - expected) / expected) < relTolerance;
}
