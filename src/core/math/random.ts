/**
 * Seeded random number generator.
 * Wraps seedrandom for reproducible simulations.
 */
import seedrandom from 'seedrandom';

export class SeededRandom {
  private rng: seedrandom.PRNG;

  constructor(seed: number | string = 0) {
    this.rng = seedrandom(String(seed));
  }

  /** Reset with a new seed */
  reset(seed: number | string): void {
    this.rng = seedrandom(String(seed));
  }

  /** Random number in [0, 1) */
  random(): number;
  /** Random number in [0, max) */
  random(max: number): number;
  /** Random number in [min, max) */
  random(min: number, max: number): number;
  random(minOrMax?: number, max?: number): number {
    const r = this.rng();
    if (minOrMax === undefined) {
      return r;
    }
    if (max === undefined) {
      return r * minOrMax;
    }
    return minOrMax + r * (max - minOrMax);
  }

  /** Random integer in [0, max) */
  randomInt(max: number): number;
  /** Random integer in [min, max) */
  randomInt(min: number, max: number): number;
  randomInt(minOrMax: number, max?: number): number {
    if (max === undefined) {
      return Math.floor(this.random(minOrMax));
    }
    return Math.floor(this.random(minOrMax, max));
  }

  /** Random boolean with given probability of true */
  randomBool(probability: number = 0.5): boolean {
    return this.rng() < probability;
  }

  /**
   * Random number from standard normal distribution (mean=0, stddev=1).
   * Uses Box-Muller transform.
   */
  gaussian(): number {
    let u1: number, u2: number;
    do {
      u1 = this.rng();
      u2 = this.rng();
    } while (u1 === 0); // Avoid log(0)

    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  /**
   * Random number from normal distribution with given mean and stddev.
   */
  randomGaussian(mean: number = 0, stddev: number = 1): number {
    return mean + stddev * this.gaussian();
  }

  /** Pick a random element from an array */
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[Math.floor(this.rng() * array.length)];
  }

  /** Shuffle an array in place */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
