/**
 * Discretized basal curve geometry system.
 *
 * Replaces on-the-fly numerical computations with pre-computed discretized
 * curve representations for performance and reliability.
 *
 * Architecture:
 * - BasalGeometry: Abstract base class defining the interface
 * - StraightLineGeometry: Analytical formulas for straight lines
 * - CircularGeometry: Analytical formulas for circles
 * - EllipticalGeometry: Discretized representation for ellipses
 */

import { Vector2 } from './vector2';

/**
 * Abstract base class for basal curve geometry.
 * All geometry types must implement the core interface methods.
 */
export abstract class BasalGeometry {
  abstract readonly type: 'line' | 'circle' | 'ellipse';
  abstract readonly curvature_1: number;
  abstract readonly curvature_2: number;
  abstract readonly perimeter: number;

  /**
   * Project a point onto the basal curve.
   * Returns the closest point on the curve to the given position.
   */
  abstract projectPoint(pos: Vector2): Vector2;

  /**
   * Get the arc length parameter for a point on the curve.
   * The point should typically be the result of projectPoint().
   */
  abstract getArcLength(pos: Vector2): number;

  /**
   * Get the position on the curve at a given arc length.
   * Arc length is measured from the reference point (typically theta=0).
   */
  abstract getPointAtArcLength(l: number): Vector2;

  /**
   * Get the unit normal vector at a point on the curve.
   * Points into the tissue (away from the basal surface).
   */
  abstract getNormal(pos: Vector2): Vector2;

  /**
   * Convert curved coordinates (arc length, height) to Cartesian position.
   * This is a convenience method implemented using the interface methods.
   */
  curvedToCartesian(l: number, h: number): Vector2 {
    const basalPoint = this.getPointAtArcLength(l);
    const normal = this.getNormal(basalPoint);
    return basalPoint.add(normal.scale(h));
  }
}

/**
 * Geometry for straight line (zero curvature).
 * Uses analytical formulas - no discretization needed.
 */
export class StraightLineGeometry extends BasalGeometry {
  readonly type = 'line' as const;
  readonly curvature_1 = 0;
  readonly curvature_2 = 0;
  readonly perimeter = Infinity;

  projectPoint(pos: Vector2): Vector2 {
    return new Vector2(pos.x, 0);
  }

  getArcLength(pos: Vector2): number {
    return pos.x;
  }

  getPointAtArcLength(l: number): Vector2 {
    return new Vector2(l, 0);
  }

  getNormal(_pos: Vector2): Vector2 {
    return new Vector2(0, 1);
  }
}

/**
 * Geometry for circular curve (equal curvatures).
 * Uses analytical formulas - no discretization needed.
 */
export class CircularGeometry extends BasalGeometry {
  readonly type = 'circle' as const;
  readonly center: Vector2;
  readonly radius: number;
  readonly perimeter: number;
  readonly dir: number; // -sign(curvature)

  constructor(
    public readonly curvature_1: number,
    public readonly curvature_2: number
  ) {
    super();
    this.radius = Math.abs(1 / curvature_1);
    this.perimeter = 2 * Math.PI * this.radius;
    this.dir = -Math.sign(curvature_2);
    this.center = new Vector2(0, 1 / curvature_2);
  }

  projectPoint(pos: Vector2): Vector2 {
    const toPos = pos.sub(this.center);
    return this.center.add(toPos.setMag(this.radius));
  }

  getArcLength(pos: Vector2): number {
    const toPos = pos.sub(this.center);
    const angle = Math.atan2(this.dir * toPos.x, this.dir * toPos.y);
    return angle * this.radius;
  }

  getPointAtArcLength(l: number): Vector2 {
    const theta = l / this.radius;
    return new Vector2(
      this.center.x + this.dir * this.radius * Math.cos(theta),
      this.center.y + this.dir * this.radius * Math.sin(theta)
    );
  }

  getNormal(pos: Vector2): Vector2 {
    return this.center.sub(pos).setMag(Math.sign(this.curvature_2));
  }
}

/**
 * Point on a discretized curve, storing all relevant geometric information.
 */
interface CurvePoint {
  position: Vector2;    // (x, y) coordinates
  arcLength: number;    // Cumulative arc length from start
  theta: number;        // Parametric angle
  normal: Vector2;      // Unit outward normal
}

/**
 * Geometry for elliptical curve (different curvatures).
 * Uses discretized representation with pre-computed lookup tables.
 *
 * The curve is discretized into N points (default 360, ~1° resolution),
 * storing position, arc length, angle, and normal at each point.
 * All operations use linear/binary search with interpolation.
 */
export class EllipticalGeometry extends BasalGeometry {
  readonly type = 'ellipse' as const;
  readonly center: Vector2;
  readonly a: number;           // Semi-major axis (1/curvature_1)
  readonly b: number;           // Semi-minor axis (1/curvature_2)
  readonly dir: number;         // -sign(curvature_2)
  readonly perimeter: number;   // Computed from discrete curve

  private readonly points: CurvePoint[];
  private readonly numPoints: number;

  constructor(
    public readonly curvature_1: number,
    public readonly curvature_2: number,
    numPoints: number = 360
  ) {
    super();
    this.a = Math.abs(1 / curvature_1);
    this.b = Math.abs(1 / curvature_2);
    this.dir = -Math.sign(curvature_2);
    this.center = new Vector2(0, 1 / curvature_2);
    this.numPoints = numPoints;

    // Pre-compute discretized curve
    this.points = this.discretizeCurve();
    this.perimeter = this.points[this.points.length - 1].arcLength;
  }

  /**
   * Pre-compute the discretized curve points.
   * Uses standard ellipse parameterization: x = a*cos(theta), y = b*sin(theta)
   * Computes arc length via piecewise linear approximation.
   */
  private discretizeCurve(): CurvePoint[] {
    const points: CurvePoint[] = [];
    let cumulativeLength = 0;

    for (let i = 0; i <= this.numPoints; i++) {
      const theta = (i / this.numPoints) * 2 * Math.PI;

      // Position using standard ellipse parameterization
      const x = this.center.x + this.dir * this.a * Math.cos(theta);
      const y = this.center.y + this.dir * this.b * Math.sin(theta);
      const position = new Vector2(x, y);

      // Compute segment length (piecewise linear approximation)
      if (i > 0) {
        const prev = points[i - 1].position;
        const segmentLength = position.dist(prev);
        cumulativeLength += segmentLength;
      }

      // Compute normal (gradient of ellipse equation)
      // For ellipse: (x-cx)^2/a^2 + (y-cy)^2/b^2 = 1
      // Gradient: [2(x-cx)/a^2, 2(y-cy)/b^2]
      const relPos = position.sub(this.center).scale(this.dir);
      const gradX = 2 * relPos.x / (this.a * this.a);
      const gradY = 2 * relPos.y / (this.b * this.b);
      const normal = new Vector2(gradX, gradY).setMag(Math.sign(this.curvature_2));

      points.push({
        position,
        arcLength: cumulativeLength,
        theta,
        normal,
      });
    }

    return points;
  }

  /**
   * Find two curve points that bracket the target value.
   * Uses binary search for efficiency (O(log N)).
   */
  private findBracket(
    value: number,
    getValue: (p: CurvePoint) => number
  ): [number, number] {
    let left = 0;
    let right = this.points.length - 1;

    while (right - left > 1) {
      const mid = Math.floor((left + right) / 2);
      if (getValue(this.points[mid]) < value) {
        left = mid;
      } else {
        right = mid;
      }
    }

    return [left, right];
  }

  /**
   * Linearly interpolate between two curve points based on a value.
   */
  private interpolate(
    p1: CurvePoint,
    p2: CurvePoint,
    value: number,
    getValue: (p: CurvePoint) => number
  ): CurvePoint {
    const v1 = getValue(p1);
    const v2 = getValue(p2);
    const t = (value - v1) / (v2 - v1);

    return {
      position: p1.position.lerp(p2.position, t),
      arcLength: p1.arcLength + t * (p2.arcLength - p1.arcLength),
      theta: p1.theta + t * (p2.theta - p1.theta),
      normal: p1.normal.lerp(p2.normal, t).normalize(),
    };
  }

  projectPoint(pos: Vector2): Vector2 {
    // Find closest point on discretized curve (linear search)
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < this.points.length; i++) {
      const dist = pos.distSq(this.points[i].position);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }

    // Project onto the line segment between the closest point and its neighbors
    // Test both adjacent segments and pick the closest projection
    const leftIdx = closestIdx === 0 ? this.points.length - 1 : closestIdx - 1;
    const rightIdx = closestIdx === this.points.length - 1 ? 0 : closestIdx + 1;

    const center = this.points[closestIdx].position;
    const left = this.points[leftIdx].position;
    const right = this.points[rightIdx].position;

    // Project onto left segment (left -> center)
    const projLeft = this.projectOntoSegment(pos, left, center);
    const distLeft = pos.distSq(projLeft);

    // Project onto right segment (center -> right)
    const projRight = this.projectOntoSegment(pos, center, right);
    const distRight = pos.distSq(projRight);

    // Return the closest projection
    return distLeft < distRight ? projLeft : projRight;
  }

  /**
   * Project a point onto a line segment between two points.
   * Uses parametric form: P(t) = p1 + t*(p2-p1) where t ∈ [0,1]
   */
  private projectOntoSegment(pos: Vector2, p1: Vector2, p2: Vector2): Vector2 {
    const segment = p2.sub(p1);
    const toPos = pos.sub(p1);

    // Compute parameter t where projection falls on segment
    const segmentLengthSq = segment.magSq();
    if (segmentLengthSq < 1e-10) {
      // Degenerate segment, return p1
      return p1;
    }

    const t = Math.max(0, Math.min(1, toPos.dot(segment) / segmentLengthSq));

    // Return point on segment
    return p1.add(segment.scale(t));
  }

  getArcLength(pos: Vector2): number {
    // Project point to curve, then get its arc length
    const projected = this.projectPoint(pos);

    // Find the curve point closest to projected position
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < this.points.length; i++) {
      const dist = projected.distSq(this.points[i].position);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }

    return this.points[closestIdx].arcLength;
  }

  getPointAtArcLength(l: number): Vector2 {
    // Handle wrapping for closed curves
    const normalizedL = ((l % this.perimeter) + this.perimeter) % this.perimeter;

    const [i1, i2] = this.findBracket(normalizedL, p => p.arcLength);
    const interpolated = this.interpolate(
      this.points[i1],
      this.points[i2],
      normalizedL,
      p => p.arcLength
    );

    return interpolated.position;
  }

  getNormal(pos: Vector2): Vector2 {
    // Find closest point and return its pre-computed normal
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < this.points.length; i++) {
      const dist = pos.distSq(this.points[i].position);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }

    return this.points[closestIdx].normal;
  }
}

/**
 * Factory function to create the appropriate geometry type.
 *
 * @param curvature_1 - Curvature in first principal direction (1/a)
 * @param curvature_2 - Curvature in second principal direction (1/b)
 * @param numPoints - Number of discretization points for ellipses (default 360)
 * @returns The appropriate BasalGeometry subclass instance
 */
export function createBasalGeometry(
  curvature_1: number,
  curvature_2: number,
  numPoints: number = 360
): BasalGeometry {
  // Straight line (zero curvature)
  if (curvature_1 === 0 && curvature_2 === 0) {
    return new StraightLineGeometry();
  }

  // Circle (equal curvatures)
  if (Math.abs(curvature_1 - curvature_2) < 1e-10) {
    return new CircularGeometry(curvature_1, curvature_2);
  }

  // Ellipse (different curvatures)
  return new EllipticalGeometry(curvature_1, curvature_2, numPoints);
}
