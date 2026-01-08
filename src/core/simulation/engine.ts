/**
 * Generic simulation engine/runner.
 * Orchestrates initialization, stepping, and output collection using a SimulationModel.
 */
import type { SimulationModel } from '@/core/interfaces/model';
import type { BatchSnapshot } from '../batch/types';

export interface SimulationEngineConfig<Params = any, State = any> {
  model: SimulationModel<Params, State>;
  params: Params;
  onSnapshot?: (snapshot: Record<string, any>[]) => void; // Changed to match model.getSnapshot format
  onBatchSnapshot?: (snapshot: BatchSnapshot) => void; // Batch snapshot might need update?
  snapshotInterval?: number; // Record every N steps (default: 1)
}

/**
 * Generic simulation runner.
 */
export class SimulationEngine<Params = any, State = any> {
  private model: SimulationModel<Params, State>;
  private state!: State; // initialized in init
  private params: Params;
  private snapshots: Record<string, any>[][] = []; // Array of flat row arrays

  // Callbacks
  private onSnapshot?: (snapshot: Record<string, any>[]) => void;
  // TODO: BatchSnapshot type is currently EHT specific probably?
  // We'll leave it out or adapt it.

  private snapshotInterval: number;

  constructor(config: SimulationEngineConfig<Params, State>) {
    this.model = config.model;
    this.params = config.params;
    this.onSnapshot = config.onSnapshot;
    this.snapshotInterval = config.snapshotInterval ?? 1;

    // Initialize immediately
    this.init();
  }

  /**
   * Initialize the simulation.
   */
  init(): void {
    this.state = this.model.init(this.params);
    this.snapshots = [];
    this.recordSnapshot();
  }

  /**
   * Advance the simulation by one timestep.
   */
  step(): void {
    // We assume model handles dt internally via params or fixed step
    // But interface has dt. We pass 0 or fix it?
    // Let's pass 1.0 or read from params if possible, but params is generic.
    // For EHT model we implemented it to use params.general.dt inside step if needed, 
    // or we passed params. 
    // The generic interface has step(state, dt, params).

    // Try to extract dt from params if it looks like standard params, else 1.0
    let dt = 1.0;
    const pAny = this.params as any;
    if (pAny.general && typeof pAny.general.dt === 'number') {
      dt = pAny.general.dt;
    }

    this.state = this.model.step(this.state, dt, this.params);

    // Snapshot logic
    // We need to know step count or time.
    // Generic state doesn't enforce it, but we can assume model tracks it.
    // Or we track it here?
    // Let's assume on every call we might snapshot.

    // But we need to throttle based on interval.
    // EHT state had step_count.
    const sAny = this.state as any;
    const stepCount = typeof sAny.step_count === 'number' ? sAny.step_count : this.snapshots.length;

    if (stepCount % this.snapshotInterval === 0) {
      this.recordSnapshot();
    }
  }

  /**
   * Check if simulation is complete.
   */
  isComplete(): boolean {
    const pAny = this.params as any;
    const sAny = this.state as any;

    if (pAny.general && typeof pAny.general.t_end === 'number' && typeof sAny.t === 'number') {
      return sAny.t >= pAny.general.t_end;
    }
    return false;
  }

  /**
   * Get current state.
   */
  getState(): State {
    return this.state;
  }

  /**
   * Get parameters.
   */
  getParams(): Params {
    return this.params;
  }

  /**
   * Reset with new parameters.
   */
  resetWithParams(params: Params): void {
    this.params = params;
    this.init();
  }

  /**
   * Record a snapshot.
   */
  private recordSnapshot(): void {
    const snapshot = this.model.getSnapshot(this.state);
    this.snapshots.push(snapshot);
    if (this.onSnapshot) {
      this.onSnapshot(snapshot);
    }
  }

  /**
   * Get current statistics.
   */
  getStats(): Record<string, number> {
    return this.model.computeStats(this.state);
  }
}
