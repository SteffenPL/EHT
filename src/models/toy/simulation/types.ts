/**
 * Toy model simulation types.
 */

import { Vector2 } from '@/core/math';

/** Cell state for the Toy model */
export interface ToyCell {
  /** Unique identifier */
  id: number;
  /** Position in microns */
  position: Vector2;
  /** Previous position (for speed calculation) */
  prevPosition: Vector2;
  /** Polarity direction (unit vector) */
  polarity: Vector2;
  /** Current phase: 'running' or 'tumbling' */
  phase: 'running' | 'tumbling';
  /** Time spent in current phase */
  phaseTime: number;
  /** Time since last polarity change (for tumbling) */
  timeSinceLastTumble: number;
}

/** Complete simulation state */
export interface ToySimulationState {
  /** Current simulation time */
  time: number;
  /** All cells */
  cells: ToyCell[];
}
