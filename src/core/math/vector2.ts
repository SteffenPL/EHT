/**
 * Immutable 2D Vector class.
 * Replaces p5.Vector with a pure, immutable implementation.
 * All operations return new Vector2 instances.
 */
export class Vector2 {
  constructor(
    public readonly x: number = 0,
    public readonly y: number = 0
  ) {}

  /** Create a vector from an object with x, y properties */
  static from(obj: { x: number; y: number }): Vector2 {
    return new Vector2(obj.x, obj.y);
  }

  /** Create a zero vector */
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  /** Create a unit vector in a given direction (radians) */
  static fromAngle(angle: number): Vector2 {
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }

  /** Add another vector */
  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  /** Subtract another vector */
  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /** Multiply by a scalar */
  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  /** Alias for scale (matches p5.Vector.mult) */
  mult(s: number): Vector2 {
    return this.scale(s);
  }

  /** Divide by a scalar */
  div(s: number): Vector2 {
    if (s === 0) {
      console.warn('Vector2.div: division by zero');
      return this;
    }
    return new Vector2(this.x / s, this.y / s);
  }

  /** Negate the vector */
  negate(): Vector2 {
    return new Vector2(-this.x, -this.y);
  }

  /** Get the magnitude (length) */
  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Get the squared magnitude (faster than mag) */
  magSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Normalize to unit length */
  normalize(): Vector2 {
    const m = this.mag();
    if (m === 0) {
      return this;
    }
    return new Vector2(this.x / m, this.y / m);
  }

  /** Set magnitude to a specific value */
  setMag(len: number): Vector2 {
    return this.normalize().scale(len);
  }

  /** Limit magnitude to a maximum value */
  limit(max: number): Vector2 {
    const mSq = this.magSq();
    if (mSq > max * max) {
      return this.normalize().scale(max);
    }
    return this;
  }

  /** Dot product with another vector */
  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /** Cross product (returns scalar in 2D - z component of 3D cross) */
  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  /** Distance to another vector */
  dist(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Squared distance to another vector */
  distSq(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /** Get the angle (heading) in radians */
  heading(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Rotate by an angle (radians) */
  rotate(angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /** Linear interpolation to another vector */
  lerp(v: Vector2, t: number): Vector2 {
    return new Vector2(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t
    );
  }

  /** Check if equal to another vector (exact) */
  equals(v: Vector2): boolean {
    return this.x === v.x && this.y === v.y;
  }

  /** Check if approximately equal (within epsilon) */
  approxEquals(v: Vector2, epsilon: number = 1e-10): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  /** Create a copy */
  copy(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /** Convert to plain object */
  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** String representation */
  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }

  /** Array representation */
  toArray(): [number, number] {
    return [this.x, this.y];
  }
}

// Static helper functions (like p5.Vector static methods)

/** Subtract two vectors: a - b */
export function sub(a: Vector2, b: Vector2): Vector2 {
  return a.sub(b);
}

/** Add two vectors: a + b */
export function add(a: Vector2, b: Vector2): Vector2 {
  return a.add(b);
}

/** Multiply vector by scalar */
export function mult(v: Vector2, s: number): Vector2 {
  return v.scale(s);
}

/** Distance between two vectors */
export function dist(a: Vector2, b: Vector2): number {
  return a.dist(b);
}

/** Dot product of two vectors */
export function dot(a: Vector2, b: Vector2): number {
  return a.dot(b);
}
