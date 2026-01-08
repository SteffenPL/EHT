/**
 * Worker pool for parallel batch simulations.
 */

import type { BaseSimulationParams } from '../registry';
import type { BatchSnapshot } from './types';
import type { WorkerRequest, WorkerResponse } from './simulation.worker';

// Vite worker import - will be resolved at build time
import SimulationWorker from './simulation.worker?worker';

/** Task waiting to be executed */
interface PendingTask {
  request: WorkerRequest;
  resolve: (snapshots: BatchSnapshot[]) => void;
  reject: (error: Error) => void;
}

/** Manages a pool of Web Workers for parallel simulation */
export class WorkerPool {
  private workers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private taskQueue: PendingTask[] = [];
  private pendingTasks: Map<number, PendingTask> = new Map();

  constructor(private poolSize: number = navigator.hardwareConcurrency || 4) {}

  /**
   * Initialize the worker pool.
   */
  init(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new SimulationWorker();
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(worker, event.data);
      };
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.handleWorkerError(worker, error);
      };
      this.workers.push(worker);
    }
  }

  /**
   * Get the pool size (number of workers).
   */
  getPoolSize(): number {
    return this.poolSize;
  }

  /**
   * Submit a simulation task to the pool.
   * Returns a promise that resolves with the snapshots.
   */
  submit(
    modelName: string,
    baseParams: BaseSimulationParams,
    overrides: Record<string, number>,
    seed: number,
    timeSamples: number[],
    runIndex: number
  ): Promise<BatchSnapshot[]> {
    return new Promise((resolve, reject) => {
      const request: WorkerRequest = {
        type: 'run',
        modelName,
        baseParams,
        overrides,
        seed,
        timeSamples,
        runIndex,
      };

      const task: PendingTask = { request, resolve, reject };

      // Try to find an available worker
      const availableWorker = this.workers.find((w) => !this.busyWorkers.has(w));

      if (availableWorker) {
        this.executeTask(availableWorker, task);
      } else {
        // All workers busy, queue the task
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Execute a task on a worker.
   */
  private executeTask(worker: Worker, task: PendingTask): void {
    this.busyWorkers.add(worker);
    this.pendingTasks.set(task.request.runIndex, task);
    worker.postMessage(task.request);
  }

  /**
   * Handle message from a worker.
   */
  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    const task = this.pendingTasks.get(response.runIndex);
    this.pendingTasks.delete(response.runIndex);
    this.busyWorkers.delete(worker);

    if (task) {
      if (response.type === 'complete' && response.snapshots) {
        task.resolve(response.snapshots);
      } else if (response.type === 'error') {
        task.reject(new Error(response.error || 'Unknown worker error'));
      }
    }

    // Process next queued task if any
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift()!;
      this.executeTask(worker, nextTask);
    }
  }

  /**
   * Handle worker error.
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    this.busyWorkers.delete(worker);

    // Find and reject any pending task for this worker
    // Note: We can't easily map worker to task, so we just log the error
    console.error('Worker error:', error.message);

    // Process next queued task if any
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift()!;
      this.executeTask(worker, nextTask);
    }
  }

  /**
   * Terminate all workers.
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.busyWorkers.clear();
    this.taskQueue = [];
    this.pendingTasks.clear();
  }

  /**
   * Check if workers are supported in the current environment.
   */
  static isSupported(): boolean {
    return typeof Worker !== 'undefined';
  }
}

/** Singleton pool instance */
let globalPool: WorkerPool | null = null;

/**
 * Get or create the global worker pool.
 */
export function getWorkerPool(): WorkerPool {
  if (!globalPool) {
    globalPool = new WorkerPool();
    globalPool.init();
  }
  return globalPool;
}

/**
 * Terminate the global worker pool.
 */
export function terminateWorkerPool(): void {
  if (globalPool) {
    globalPool.terminate();
    globalPool = null;
  }
}
