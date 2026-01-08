/**
 * Main simulation engine class.
 * Orchestrates initialization, stepping, and output collection.
 */
import { Vector2 } from '../math/vector2';
import { SeededRandom } from '../math/random';
import { basalArcLength, basalCurve, curvedCoordsToPosition } from '../math/geometry';
import type {
  SimulationParams,
  SimulationState,
  SimulationOutput,
  TimeSnapshot,
  CellSnapshot,
} from '../types';
import type { BatchSnapshot } from '../batch/types';
import { createInitialState } from '../types/state';
import { createCell } from './cell';
import { performTimestep } from './timestep';
import { createSnapshot } from '../snapshot';
import { computeEllipseFromPerimeter } from '@/models/eht/params/geometry';

export interface SimulationEngineConfig {
  params: SimulationParams;
  onSnapshot?: (snapshot: TimeSnapshot) => void;
  onBatchSnapshot?: (snapshot: BatchSnapshot) => void;
  snapshotInterval?: number; // Record every N steps (default: 1)
}

/**
 * Main simulation engine.
 * Can run headless or with callbacks for UI updates.
 */
export class SimulationEngine {
  private state: SimulationState;
  private params: SimulationParams;
  private rng: SeededRandom;
  private snapshots: TimeSnapshot[] = [];
  private batchSnapshots: BatchSnapshot[] = [];
  private totalDivisions = 0;

  private onSnapshot?: (snapshot: TimeSnapshot) => void;
  private onBatchSnapshot?: (snapshot: BatchSnapshot) => void;
  private snapshotInterval: number;

  constructor(config: SimulationEngineConfig) {
    this.params = config.params;
    this.rng = new SeededRandom(config.params.general.random_seed);
    this.state = createInitialState();
    this.onSnapshot = config.onSnapshot;
    this.onBatchSnapshot = config.onBatchSnapshot;
    this.snapshotInterval = config.snapshotInterval ?? 1;
  }

  /**
   * Initialize the simulation with cells.
   */
  init(): void {
    this.state = createInitialState();
    this.rng = new SeededRandom(this.params.general.random_seed);
    this.snapshots = [];
    this.batchSnapshots = [];
    this.totalDivisions = 0;

    const pg = this.params.general;

    // Compute and store geometry from perimeter/aspect_ratio
    const geometry = computeEllipseFromPerimeter(pg.perimeter, pg.aspect_ratio);
    this.state.geometry = {
      curvature_1: geometry.curvature_1,
      curvature_2: geometry.curvature_2,
    };

    const { curvature_1, curvature_2 } = this.state.geometry;

    const N = pg.N_init;
    const w = pg.full_circle && curvature_1 !== 0 && curvature_1 === curvature_2
      ? 2 * Math.PI * Math.abs(1 / curvature_1)
      : pg.w_init;
    const h = pg.h_init;

    // Determine EMT cell indices (middle section)
    const iEmt = Math.round((N - pg.N_emt) / 2);
    const jEmt = iEmt + pg.N_emt;

    // Generate initial positions
    const positions: Vector2[] = [];
    for (let i = 0; i < N; i++) {
      const l = this.rng.random(-w, w);
      const height = this.rng.random(h / 3, (2 * h) / 3);
      const pos = curvedCoordsToPosition(l, height, curvature_1, curvature_2);

      positions.push(pos);
    }

    // Sort by position along the basal curve (arc length), not by x coordinate.
    // This preserves ordering for curved membranes.
    positions.sort((a, b) => {
      const la = basalArcLength(basalCurve(a, curvature_1, curvature_2), curvature_1, curvature_2);
      const lb = basalArcLength(basalCurve(b, curvature_1, curvature_2), curvature_1, curvature_2);
      return la - lb;
    });

    // Create cells
    for (let i = 0; i < N; i++) {
      const cellType =
        i >= iEmt && i < jEmt
          ? this.params.cell_types.emt
          : this.params.cell_types.control;

      const cell = createCell(
        this.params,
        this.state,
        this.rng,
        positions[i],
        cellType
      );

      this.state.cells.push(cell);
    }

    // Create initial links between adjacent cells
    for (let i = 0; i < this.state.cells.length - 1; i++) {
      this.state.ap_links.push({
        l: i,
        r: i + 1,
        rl: this.params.cell_prop.apical_junction_init,
      });
      this.state.ba_links.push({
        l: i,
        r: i + 1,
      });
    }

    // If simulating a closed ring, connect the last and first cells as well.
    if (pg.full_circle && this.state.cells.length > 2) {
      const last = this.state.cells.length - 1;
      this.state.ap_links.push({
        l: last,
        r: 0,
        rl: this.params.cell_prop.apical_junction_init,
      });
      this.state.ba_links.push({
        l: last,
        r: 0,
      });
    }

    // Record initial snapshot
    this.recordSnapshot();
  }

  /**
   * Advance the simulation by one timestep.
   */
  step(): void {
    const divisions = performTimestep(this.state, this.params, this.rng);
    this.totalDivisions += divisions;

    // Record snapshot if interval reached
    if (this.state.step_count % this.snapshotInterval === 0) {
      this.recordSnapshot();
    }
  }

  /**
   * Check if simulation has reached end time.
   */
  isComplete(): boolean {
    return this.state.t >= this.params.general.t_end;
  }

  /**
   * Get current simulation state (readonly).
   */
  getState(): Readonly<SimulationState> {
    return this.state;
  }

  /**
   * Get simulation parameters.
   */
  getParams(): Readonly<SimulationParams> {
    return this.params;
  }

  /**
   * Run simulation to completion.
   */
  runToEnd(): SimulationOutput {
    while (!this.isComplete()) {
      this.step();
    }
    return this.getOutput();
  }

  /**
   * Get collected output.
   */
  getOutput(): SimulationOutput {
    // Count EMT cells that have escaped (lost both adhesions)
    const emtEscaped = this.state.cells.filter(
      (c) => c.typeIndex === 'emt' && !c.has_A && !c.has_B
    ).length;

    return {
      params: this.params,
      snapshots: this.snapshots,
      final_cell_count: this.state.cells.length,
      total_divisions: this.totalDivisions,
      emt_events_occurred: emtEscaped,
    };
  }

  /**
   * Reset with same parameters.
   */
  reset(): void {
    this.init();
  }

  /**
   * Reset with new parameters.
   */
  resetWithParams(params: SimulationParams): void {
    this.params = params;
    this.init();
  }

  /**
   * Get current time.
   */
  getTime(): number {
    return this.state.t;
  }

  /**
   * Get current step count.
   */
  getStepCount(): number {
    return this.state.step_count;
  }

  /**
   * Get batch snapshots (unified format with neighbor info).
   */
  getBatchSnapshots(): BatchSnapshot[] {
    return this.batchSnapshots;
  }

  /**
   * Record a snapshot of the current state.
   */
  private recordSnapshot(): void {
    // Create unified batch snapshot (includes neighbor info)
    const batchSnapshot = createSnapshot(this.state, {
      seed: this.params.general.random_seed,
    });
    this.batchSnapshots.push(batchSnapshot);

    if (this.onBatchSnapshot) {
      this.onBatchSnapshot(batchSnapshot);
    }

    // Also create legacy TimeSnapshot for UI compatibility
    const timeSnapshot = this.createTimeSnapshot();
    this.snapshots.push(timeSnapshot);

    if (this.onSnapshot) {
      this.onSnapshot(timeSnapshot);
    }
  }

  /**
   * Create a TimeSnapshot from current state (for UI compatibility).
   */
  private createTimeSnapshot(): TimeSnapshot {
    const cells: CellSnapshot[] = this.state.cells.map((cell) => ({
      id: cell.id,
      type_name: cell.typeIndex,
      pos_x: cell.pos.x,
      pos_y: cell.pos.y,
      A_x: cell.A.x,
      A_y: cell.A.y,
      B_x: cell.B.x,
      B_y: cell.B.y,
      phase: cell.phase,
      has_A: cell.has_A,
      has_B: cell.has_B,
      is_running: cell.is_running,
      age: this.state.t - cell.birth_time,
    }));

    const emtCount = this.state.cells.filter(
      (c) => c.typeIndex === 'emt'
    ).length;

    return {
      t: this.state.t,
      step: this.state.step_count,
      cells,
      cell_count: cells.length,
      emt_count: emtCount,
    };
  }
}
