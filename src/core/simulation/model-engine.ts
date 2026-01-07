/**
 * Model-aware simulation engine.
 * Uses the model's hooks for initialization, forces, constraints, events, and divisions.
 */
import { SeededRandom } from '../math/random';
import type { SimulationState, TimeSnapshot, CellSnapshot } from '../types';
import type { BatchSnapshot } from '../batch/types';
import type { ModelDefinition, BaseSimulationParams } from '../registry';
import { createInitialState } from '../types/state';
import { createSnapshot } from '../snapshot';

export interface ModelEngineConfig {
  model: ModelDefinition<BaseSimulationParams>;
  params: BaseSimulationParams;
  onSnapshot?: (snapshot: TimeSnapshot) => void;
  onBatchSnapshot?: (snapshot: BatchSnapshot) => void;
  snapshotInterval?: number;
}

/**
 * Model-aware simulation engine.
 * Delegates simulation logic to the model's hooks.
 */
export class ModelSimulationEngine {
  private model: ModelDefinition<BaseSimulationParams>;
  private state: SimulationState;
  private params: BaseSimulationParams;
  private rng: SeededRandom;
  private snapshots: TimeSnapshot[] = [];
  private batchSnapshots: BatchSnapshot[] = [];
  private totalDivisions = 0;

  private onSnapshot?: (snapshot: TimeSnapshot) => void;
  private onBatchSnapshot?: (snapshot: BatchSnapshot) => void;
  private snapshotInterval: number;

  constructor(config: ModelEngineConfig) {
    this.model = config.model;
    this.params = config.params;
    this.rng = new SeededRandom(config.params.general.random_seed);
    this.state = createInitialState();
    this.onSnapshot = config.onSnapshot;
    this.onBatchSnapshot = config.onBatchSnapshot;
    this.snapshotInterval = config.snapshotInterval ?? 1;
  }

  /**
   * Initialize the simulation using the model's initialization hook.
   */
  init(): void {
    this.state = createInitialState();
    this.rng = new SeededRandom(this.params.general.random_seed);
    this.snapshots = [];
    this.batchSnapshots = [];
    this.totalDivisions = 0;

    // Delegate to model's initialization
    this.model.initializeSimulation(this.params, this.state, this.rng);

    // Record initial snapshot
    this.recordSnapshot();
  }

  /**
   * Advance the simulation by one timestep.
   */
  step(): void {
    const dt = this.params.general.dt;
    const n_substeps = this.params.general.n_substeps;
    const subDt = dt / n_substeps;

    // Perform substeps
    for (let sub = 0; sub < n_substeps; sub++) {
      // Calculate forces using model hook
      const forces = this.model.calcForces(this.state, this.params);

      // Integrate forces
      this.integrateForces(forces, subDt);

      // Apply constraints using model hook
      this.model.applyConstraints(this.state, this.params);
    }

    // Process events (EMT, etc.) using model hook
    this.model.processEvents(this.state, this.params, dt);

    // Process divisions using model hook
    const divisions = this.model.processDivisions(this.state, this.params, this.rng);
    this.totalDivisions += divisions;

    // Update time
    this.state.t += dt;
    this.state.step_count += 1;

    // Record snapshot if interval reached
    if (this.state.step_count % this.snapshotInterval === 0) {
      this.recordSnapshot();
    }
  }

  /**
   * Integrate forces to update cell positions.
   */
  private integrateForces(
    forces: Array<{ pos: { x: number; y: number }; A: { x: number; y: number }; B: { x: number; y: number } }>,
    dt: number
  ): void {
    const mu = this.params.general.mu;

    for (let i = 0; i < this.state.cells.length; i++) {
      const cell = this.state.cells[i];
      const f = forces[i];

      if (!f) continue;

      // Integrate position
      cell.pos.x += (dt * f.pos.x) / mu;
      cell.pos.y += (dt * f.pos.y) / mu;

      // Integrate apical point
      cell.A.x += (dt * f.A.x) / mu;
      cell.A.y += (dt * f.A.y) / mu;

      // Integrate basal point
      cell.B.x += (dt * f.B.x) / mu;
      cell.B.y += (dt * f.B.y) / mu;
    }
  }

  /**
   * Check if simulation has reached end time.
   */
  isComplete(): boolean {
    return this.state.t >= this.params.general.t_end;
  }

  /**
   * Get current simulation state.
   */
  getState(): Readonly<SimulationState> {
    return this.state;
  }

  /**
   * Get simulation parameters.
   */
  getParams(): Readonly<BaseSimulationParams> {
    return this.params;
  }

  /**
   * Get the current model.
   */
  getModel(): ModelDefinition<BaseSimulationParams> {
    return this.model;
  }

  /**
   * Run simulation to completion.
   */
  runToEnd(): void {
    while (!this.isComplete()) {
      this.step();
    }
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
  resetWithParams(params: BaseSimulationParams): void {
    this.params = params;
    this.init();
  }

  /**
   * Reset with new model and parameters.
   */
  resetWithModel(model: ModelDefinition<BaseSimulationParams>, params: BaseSimulationParams): void {
    this.model = model;
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
   * Get batch snapshots.
   */
  getBatchSnapshots(): BatchSnapshot[] {
    return this.batchSnapshots;
  }

  /**
   * Record a snapshot of the current state.
   */
  private recordSnapshot(): void {
    const batchSnapshot = createSnapshot(this.state, {
      seed: this.params.general.random_seed,
    });
    this.batchSnapshots.push(batchSnapshot);

    if (this.onBatchSnapshot) {
      this.onBatchSnapshot(batchSnapshot);
    }

    const timeSnapshot = this.createTimeSnapshot();
    this.snapshots.push(timeSnapshot);

    if (this.onSnapshot) {
      this.onSnapshot(timeSnapshot);
    }
  }

  /**
   * Create a TimeSnapshot from current state.
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

    // Count cells by type
    const emtCount = this.state.cells.filter((c) => c.typeIndex === 'emt').length;

    return {
      t: this.state.t,
      step: this.state.step_count,
      cells,
      cell_count: cells.length,
      emt_count: emtCount,
    };
  }
}
