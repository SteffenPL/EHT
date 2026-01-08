/**
 * Tests for Vector2 class.
 * Ensures mathematical correctness of 2D vector operations.
 */

import { describe, it, expect } from 'vitest';
import { Vector2, add, sub, mult, dist, dot } from './vector2';
import { assertClose } from '@/test/helpers';

describe('Vector2 Construction', () => {
  it('should create vector with default values', () => {
    const v = new Vector2();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('should create vector with specified values', () => {
    const v = new Vector2(3, 4);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
  });

  it('should create zero vector', () => {
    const v = Vector2.zero();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('should create vector from angle', () => {
    const v = Vector2.fromAngle(0);
    assertClose(v.x, 1, 1e-10);
    assertClose(v.y, 0, 1e-10);

    const v2 = Vector2.fromAngle(Math.PI / 2);
    assertClose(v2.x, 0, 1e-10);
    assertClose(v2.y, 1, 1e-10);
  });

  it('should create vector from object', () => {
    const v = Vector2.from({ x: 5, y: 6 });
    expect(v.x).toBe(5);
    expect(v.y).toBe(6);
  });
});

describe('Vector2 Basic Operations', () => {
  it('should add vectors', () => {
    const v1 = new Vector2(1, 2);
    const v2 = new Vector2(3, 4);
    const result = v1.add(v2);
    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
  });

  it('should subtract vectors', () => {
    const v1 = new Vector2(5, 7);
    const v2 = new Vector2(2, 3);
    const result = v1.sub(v2);
    expect(result.x).toBe(3);
    expect(result.y).toBe(4);
  });

  it('should scale vector', () => {
    const v = new Vector2(2, 3);
    const result = v.scale(2.5);
    expect(result.x).toBe(5);
    expect(result.y).toBe(7.5);
  });

  it('should divide vector', () => {
    const v = new Vector2(10, 20);
    const result = v.div(2);
    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
  });

  it('should handle division by zero', () => {
    const v = new Vector2(10, 20);
    const result = v.div(0);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });

  it('should negate vector', () => {
    const v = new Vector2(3, -4);
    const result = v.negate();
    expect(result.x).toBe(-3);
    expect(result.y).toBe(4);
  });
});

describe('Vector2 Magnitude Operations', () => {
  it('should compute magnitude', () => {
    const v = new Vector2(3, 4);
    expect(v.mag()).toBe(5);
  });

  it('should compute squared magnitude', () => {
    const v = new Vector2(3, 4);
    expect(v.magSq()).toBe(25);
  });

  it('should normalize vector', () => {
    const v = new Vector2(3, 4);
    const normalized = v.normalize();
    assertClose(normalized.mag(), 1, 1e-10);
    assertClose(normalized.x, 0.6, 1e-10);
    assertClose(normalized.y, 0.8, 1e-10);
  });

  it('should handle normalizing zero vector', () => {
    const v = Vector2.zero();
    const normalized = v.normalize();
    expect(normalized.x).toBe(0);
    expect(normalized.y).toBe(0);
  });

  it('should set magnitude', () => {
    const v = new Vector2(3, 4);
    const result = v.setMag(10);
    assertClose(result.mag(), 10, 1e-10);
    assertClose(result.x, 6, 1e-10);
    assertClose(result.y, 8, 1e-10);
  });

  it('should limit magnitude', () => {
    const v = new Vector2(6, 8); // mag = 10
    const limited = v.limit(5);
    assertClose(limited.mag(), 5, 1e-10);
  });

  it('should not limit if already below max', () => {
    const v = new Vector2(2, 1); // mag ~ 2.236
    const limited = v.limit(5);
    expect(limited.x).toBe(2);
    expect(limited.y).toBe(1);
  });
});

describe('Vector2 Products', () => {
  it('should compute dot product', () => {
    const v1 = new Vector2(2, 3);
    const v2 = new Vector2(4, 5);
    expect(v1.dot(v2)).toBe(23); // 2*4 + 3*5 = 23
  });

  it('should compute cross product (2D)', () => {
    const v1 = new Vector2(2, 3);
    const v2 = new Vector2(4, 5);
    expect(v1.cross(v2)).toBe(-2); // 2*5 - 3*4 = -2
  });

  it('should have dot product zero for perpendicular vectors', () => {
    const v1 = new Vector2(1, 0);
    const v2 = new Vector2(0, 1);
    expect(v1.dot(v2)).toBe(0);
  });
});

describe('Vector2 Distance', () => {
  it('should compute distance between vectors', () => {
    const v1 = new Vector2(0, 0);
    const v2 = new Vector2(3, 4);
    expect(v1.dist(v2)).toBe(5);
  });

  it('should compute squared distance', () => {
    const v1 = new Vector2(0, 0);
    const v2 = new Vector2(3, 4);
    expect(v1.distSq(v2)).toBe(25);
  });
});

describe('Vector2 Rotation', () => {
  it('should rotate vector', () => {
    const v = new Vector2(1, 0);
    const rotated = v.rotate(Math.PI / 2);
    assertClose(rotated.x, 0, 1e-10);
    assertClose(rotated.y, 1, 1e-10);
  });

  it('should compute heading', () => {
    const v = new Vector2(1, 0);
    expect(v.heading()).toBe(0);

    const v2 = new Vector2(0, 1);
    assertClose(v2.heading(), Math.PI / 2, 1e-10);
  });
});

describe('Vector2 Interpolation', () => {
  it('should interpolate between vectors', () => {
    const v1 = new Vector2(0, 0);
    const v2 = new Vector2(10, 20);
    const mid = v1.lerp(v2, 0.5);
    expect(mid.x).toBe(5);
    expect(mid.y).toBe(10);
  });

  it('should return start vector at t=0', () => {
    const v1 = new Vector2(1, 2);
    const v2 = new Vector2(10, 20);
    const result = v1.lerp(v2, 0);
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
  });

  it('should return end vector at t=1', () => {
    const v1 = new Vector2(1, 2);
    const v2 = new Vector2(10, 20);
    const result = v1.lerp(v2, 1);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });
});

describe('Vector2 Equality', () => {
  it('should check exact equality', () => {
    const v1 = new Vector2(1, 2);
    const v2 = new Vector2(1, 2);
    const v3 = new Vector2(1, 2.0001);
    expect(v1.equals(v2)).toBe(true);
    expect(v1.equals(v3)).toBe(false);
  });

  it('should check approximate equality', () => {
    const v1 = new Vector2(1, 2);
    const v2 = new Vector2(1.0000001, 2.0000001);
    expect(v1.approxEquals(v2, 1e-6)).toBe(true);
    expect(v1.approxEquals(v2, 1e-8)).toBe(false);
  });
});

describe('Vector2 Conversion', () => {
  it('should convert to object', () => {
    const v = new Vector2(3, 4);
    const obj = v.toObject();
    expect(obj.x).toBe(3);
    expect(obj.y).toBe(4);
  });

  it('should convert to array', () => {
    const v = new Vector2(3, 4);
    const arr = v.toArray();
    expect(arr[0]).toBe(3);
    expect(arr[1]).toBe(4);
  });

  it('should convert to string', () => {
    const v = new Vector2(3, 4);
    expect(v.toString()).toBe('Vector2(3, 4)');
  });
});

describe('Vector2 Immutability', () => {
  it('should not modify original vector on operations', () => {
    const v = new Vector2(1, 2);
    v.add(new Vector2(3, 4));
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
  });

  it('should create new instance on copy', () => {
    const v1 = new Vector2(1, 2);
    const v2 = v1.copy();
    expect(v1).not.toBe(v2);
    expect(v1.equals(v2)).toBe(true);
  });
});

describe('Vector2 Static Functions', () => {
  it('should add using static function', () => {
    const v1 = new Vector2(1, 2);
    const v2 = new Vector2(3, 4);
    const result = add(v1, v2);
    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
  });

  it('should subtract using static function', () => {
    const v1 = new Vector2(5, 7);
    const v2 = new Vector2(2, 3);
    const result = sub(v1, v2);
    expect(result.x).toBe(3);
    expect(result.y).toBe(4);
  });

  it('should multiply using static function', () => {
    const v = new Vector2(2, 3);
    const result = mult(v, 2);
    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
  });

  it('should compute distance using static function', () => {
    const v1 = new Vector2(0, 0);
    const v2 = new Vector2(3, 4);
    expect(dist(v1, v2)).toBe(5);
  });

  it('should compute dot product using static function', () => {
    const v1 = new Vector2(2, 3);
    const v2 = new Vector2(4, 5);
    expect(dot(v1, v2)).toBe(23);
  });
});
