/**
 * Main simulation engine class.
 * Orchestrates initialization, stepping, and output collection.
 */
import { Vector2 } from '../math/vector2';
import { SeededRandom } from '../math/random';
import { basalCurveParam, basalNormal } from '../math/geometry';
import type {
  SimulationParams,
  SimulationState,
  SimulationOutput,
  TimeSnapshot,
  CellSnapshot,
} from '../types';
import { createInitialState } from '../types/state';
import { createCell } from './cell';
import { performTimestep } from './timestep';

export interface SimulationEngineConfig {
  params: SimulationParams;
  onSnapshot?: (snapshot: TimeSnapshot) => void;
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
  private totalDivisions = 0;

  private onSnapshot?: (snapshot: TimeSnapshot) => void;
  private snapshotInterval: number;

  constructor(config: SimulationEngineConfig) {
    this.params = config.params;
    this.rng = new SeededRandom(config.params.general.random_seed);
    this.state = createInitialState();
    this.onSnapshot = config.onSnapshot;
    this.snapshotInterval = config.snapshotInterval ?? 1;
  }

  /**
   * Initialize the simulation with cells.
   */
  init(): void {
    this.state = createInitialState();
    this.rng = new SeededRandom(this.params.general.random_seed);
    this.snapshots = [];
    this.totalDivisions = 0;

    const pg = this.params.general;
    const N = pg.N_init;
    const w = pg.w_init;
    const h = pg.h_init;

    // Determine EMT cell indices (middle section)
    const iEmt = Math.round((N - pg.N_emt) / 2);
    const jEmt = iEmt + pg.N_emt;

    // Generate initial positions
    const positions: Vector2[] = [];
    for (let i = 0; i < N; i++) {
      const x = this.rng.random(-w / 2, w / 2);
      const y = this.rng.random(h / 3, (2 * h) / 3);

      // Get position on basal curve
      let pos = basalCurveParam(x, pg.curvature);
      const normal = basalNormal(pos, pg.curvature);
      pos = pos.add(normal.scale(y));

      positions.push(pos);
    }

    // Sort by x position
    positions.sort((a, b) => a.x - b.x);

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
   * Record a snapshot of the current state.
   */
  private recordSnapshot(): void {
    const snapshot = this.createSnapshot();
    this.snapshots.push(snapshot);

    if (this.onSnapshot) {
      this.onSnapshot(snapshot);
    }
  }

  /**
   * Create a snapshot from current state.
   */
  private createSnapshot(): TimeSnapshot {
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
