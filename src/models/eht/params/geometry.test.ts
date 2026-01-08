/**
 * Tests for EHT-specific geometry functions.
 * Validates Ramanujan approximation and ellipse parameter conversions.
 */

import { describe, it, expect } from 'vitest';
import { ramanujanPerimeter, computeEllipseFromPerimeter } from './geometry';
import { assertClose, circlePerimeter, isCloseRelative } from '@/test/helpers';

describe('ramanujanPerimeter', () => {
  it('should compute exact circle perimeter', () => {
    const radius = 5;
    const perimeter = ramanujanPerimeter(radius, radius);
    assertClose(perimeter, circlePerimeter(radius), 1e-10);
  });

  it('should handle zero ellipse', () => {
    const perimeter = ramanujanPerimeter(0, 0);
    expect(perimeter).toBe(0);
  });

  it('should be accurate for ellipse', () => {
    const a = 10, b = 5;
    const perimeter = ramanujanPerimeter(a, b);

    // Ramanujan is within 0.015% of true value
    // We just check it's reasonable
    expect(perimeter).toBeGreaterThan(2 * Math.PI * b); // Greater than smallest circle
    expect(perimeter).toBeLessThan(2 * Math.PI * a);    // Less than largest circle
  });

  it('should be symmetric in a and b', () => {
    const a = 7, b = 3;
    const p1 = ramanujanPerimeter(a, b);
    const p2 = ramanujanPerimeter(b, a);
    assertClose(p1, p2, 1e-10);
  });

  it('should increase with increasing semi-axes', () => {
    const p1 = ramanujanPerimeter(5, 3);
    const p2 = ramanujanPerimeter(10, 6);
    expect(p2).toBeGreaterThan(p1);
  });

  it('should match known values for common ellipses', () => {
    // Semi-major = 10, semi-minor = 5
    const a = 10, b = 5;
    const perimeter = ramanujanPerimeter(a, b);

    // Using Ramanujan formula
    const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
    const expected = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));

    assertClose(perimeter, expected, 1e-10);
  });
});

describe('computeEllipseFromPerimeter', () => {
  it('should return zero curvature for straight line (aspect = 0)', () => {
    const result = computeEllipseFromPerimeter(100, 0);
    expect(result.curvature_1).toBe(0);
    expect(result.curvature_2).toBe(0);
    expect(result.a).toBe(Infinity);
    expect(result.b).toBe(Infinity);
  });

  it('should compute circle from perimeter (aspect = 1)', () => {
    const targetPerimeter = circlePerimeter(5);
    const result = computeEllipseFromPerimeter(targetPerimeter, 1);

    assertClose(result.a, 5, 1e-6);
    assertClose(result.b, 5, 1e-6);
    assertClose(result.curvature_1, 1/5, 1e-6);
    assertClose(result.curvature_2, 1/5, 1e-6);

    // Verify perimeter matches
    const actualPerimeter = ramanujanPerimeter(result.a, result.b);
    assertClose(actualPerimeter, targetPerimeter, 1e-6);
  });

  it('should compute ellipse from perimeter and aspect ratio', () => {
    const targetPerimeter = 50;
    const aspectRatio = 2; // b = 2*a (tall ellipse)

    const result = computeEllipseFromPerimeter(targetPerimeter, aspectRatio);

    // Verify aspect ratio
    assertClose(result.b / result.a, 2, 1e-6);

    // Verify perimeter
    const actualPerimeter = ramanujanPerimeter(result.a, result.b);
    assertClose(actualPerimeter, targetPerimeter, 0.01);

    // Verify curvatures
    assertClose(result.curvature_1, 1 / result.a, 1e-10);
    assertClose(result.curvature_2, 1 / result.b, 1e-10);
  });

  it('should handle negative aspect ratio (orientation)', () => {
    const targetPerimeter = 50;
    const aspectRatio = -2;

    const result = computeEllipseFromPerimeter(targetPerimeter, aspectRatio);

    // Semi-axes should be positive
    expect(result.a).toBeGreaterThan(0);
    expect(result.b).toBeGreaterThan(0);

    // Curvatures should be negative (different orientation)
    expect(result.curvature_1).toBeLessThan(0);
    expect(result.curvature_2).toBeLessThan(0);

    // Shape should still match absolute aspect ratio
    assertClose(Math.abs(result.b / result.a), 2, 1e-6);
  });

  it('should handle aspect ratio < 1 (wide ellipse)', () => {
    const targetPerimeter = 50;
    const aspectRatio = 0.5; // b = 0.5*a (wide ellipse)

    const result = computeEllipseFromPerimeter(targetPerimeter, aspectRatio);

    assertClose(result.b / result.a, 0.5, 1e-6);

    const actualPerimeter = ramanujanPerimeter(result.a, result.b);
    assertClose(actualPerimeter, targetPerimeter, 0.01);
  });

  it('should round-trip: perimeter → ellipse → perimeter', () => {
    const testCases = [
      { perimeter: 30, aspect: 1 },
      { perimeter: 50, aspect: 2 },
      { perimeter: 40, aspect: 0.5 },
      { perimeter: 60, aspect: 3 },
    ];

    for (const { perimeter, aspect } of testCases) {
      const ellipse = computeEllipseFromPerimeter(perimeter, aspect);
      const actualPerimeter = ramanujanPerimeter(ellipse.a, ellipse.b);

      assertClose(
        actualPerimeter,
        perimeter,
        0.01,
        `Round-trip failed for perimeter=${perimeter}, aspect=${aspect}`
      );
    }
  });

  it('should produce consistent curvature signs', () => {
    // Positive aspect ratio
    const pos = computeEllipseFromPerimeter(50, 2);
    expect(Math.sign(pos.curvature_1)).toBe(Math.sign(pos.curvature_2));
    expect(pos.curvature_1).toBeGreaterThan(0);

    // Negative aspect ratio
    const neg = computeEllipseFromPerimeter(50, -2);
    expect(Math.sign(neg.curvature_1)).toBe(Math.sign(neg.curvature_2));
    expect(neg.curvature_1).toBeLessThan(0);
  });
});

describe('Integration: Perimeter and Aspect Ratio', () => {
  it('should maintain aspect ratio across different perimeters', () => {
    const aspect = 1.5;
    const perimeters = [20, 50, 100];

    for (const perimeter of perimeters) {
      const ellipse = computeEllipseFromPerimeter(perimeter, aspect);
      assertClose(ellipse.b / ellipse.a, aspect, 1e-6);
    }
  });

  it('should scale proportionally with perimeter for fixed aspect', () => {
    const aspect = 2;
    const p1 = 30;
    const p2 = 60;

    const e1 = computeEllipseFromPerimeter(p1, aspect);
    const e2 = computeEllipseFromPerimeter(p2, aspect);

    // Doubling perimeter should approximately double semi-axes
    assertClose(e2.a / e1.a, 2, 0.01);
    assertClose(e2.b / e1.b, 2, 0.01);
  });

  it('should handle extreme aspect ratios', () => {
    // Very tall
    const tall = computeEllipseFromPerimeter(50, 10);
    expect(tall.b / tall.a).toBeGreaterThan(9);
    expect(tall.b / tall.a).toBeLessThan(11);

    // Very wide
    const wide = computeEllipseFromPerimeter(50, 0.1);
    expect(wide.b / wide.a).toBeGreaterThan(0.09);
    expect(wide.b / wide.a).toBeLessThan(0.11);
  });
});

describe('Scientific Correctness', () => {
  it('should maintain numerical precision for typical biological parameters', () => {
    // Typical EHT parameters
    const perimeter = 100; // μm
    const aspects = [0.8, 1.0, 1.2, 1.5, 2.0];

    for (const aspect of aspects) {
      const ellipse = computeEllipseFromPerimeter(perimeter, aspect);

      // Verify no numerical instabilities
      expect(isFinite(ellipse.a)).toBe(true);
      expect(isFinite(ellipse.b)).toBe(true);
      expect(isFinite(ellipse.curvature_1)).toBe(true);
      expect(isFinite(ellipse.curvature_2)).toBe(true);

      // Verify reasonable values
      expect(ellipse.a).toBeGreaterThan(0);
      expect(ellipse.b).toBeGreaterThan(0);
    }
  });
});
