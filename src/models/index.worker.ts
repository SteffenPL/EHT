/**
 * Worker-safe model registry.
 * Only imports simulation logic, no UI or renderer code.
 */

console.log('[Models Worker] Loading worker-safe index');
import { modelRegistry } from '@/core/registry';
import type { SimulationModel } from '@/core/interfaces/model';
import type { EHTParams } from './eht/params/types';
import type { EHTSimulationState } from './eht/types';
import type { ToyParams } from './toy/params/types';
import type { ToySimulationState, ToyCell } from './toy/simulation/types';
import { createInitialEHTState } from './eht/types';
import { ehtParamsSchema } from './eht/params/schema';
import { toyParamsSchema } from './toy/params/schema';
import { DEFAULT_EHT_PARAMS } from './eht/params/defaults';
import { DEFAULT_TOY_PARAMS } from './toy/params/defaults';
import { computeEHTStatistics, generateEHTStatistics } from './eht/statistics';
import { computeToyStatistics, TOY_STATISTICS } from './toy/statistics';
import { EHT_BATCH_PARAMETERS, generateEHTBatchParameters } from './eht/ui/availableParams';
import { initializeEHTSimulation } from './eht/simulation/init';
import { performTimestep as ehtPerformTimestep } from './eht/simulation/step';
import { getSnapshot as ehtGetSnapshot, loadSnapshot as ehtLoadSnapshot } from './eht/output';
import { SeededRandom } from '@/core/math/random';
import { Vector2 } from '@/core/math/vector2';

// Toy model batch parameters (inline to avoid UI imports)
const TOY_BATCH_PARAMETERS = [
  { path: 'general.N', label: 'Number of cells', isInteger: true },
  { path: 'general.soft_radius', label: 'Soft radius' },
  { path: 'general.repulsion_strength', label: 'Repulsion strength' },
  { path: 'general.running_speed', label: 'Running speed' },
  { path: 'general.tumble_speed', label: 'Tumble speed' },
  { path: 'general.running_duration', label: 'Running duration' },
  { path: 'general.tumbling_duration', label: 'Tumbling duration' },
  { path: 'general.tumbling_period', label: 'Tumbling period' },
  { path: 'general.random_seed', label: 'Random seed', isInteger: true },
  { path: 'general.t_end', label: 'End time' },
];

/**
 * EHT Model Definition (Worker-safe)
 */
const EHTModelWorker: SimulationModel<EHTParams, EHTSimulationState> = {
  // Identity
  id: 'EHT',
  name: 'Epithelial-to-Hematopoietic Transition',
  version: '1.0.0',
  description: 'Simulates cell mechanics, division, and EMT events in curved epithelial tissue.',

  // Parameter system
  defaultParams: DEFAULT_EHT_PARAMS,
  validateParams(params: unknown): EHTParams {
    return ehtParamsSchema.parse(params);
  },

  // Simulation Loop
  init: (params: EHTParams, seed?: string): EHTSimulationState => {
    const effectiveSeed = seed ?? String(params.general.random_seed);
    const rng = new SeededRandom(effectiveSeed);
    const state = createInitialEHTState(effectiveSeed);
    initializeEHTSimulation(params, state, rng);
    return state;
  },

  step: (state: EHTSimulationState, _dt: number, params: EHTParams): EHTSimulationState => {
    // Create seeded RNG for this step (deterministic based on step count)
    const rng = new SeededRandom(`${state.rngSeed}_step_${state.step_count}`);
    ehtPerformTimestep(state, params, rng);
    return state;
  },

  // I/O
  getSnapshot: (state: EHTSimulationState) => ehtGetSnapshot(state),
  loadSnapshot: (rows: Record<string, any>[], params: EHTParams) => ehtLoadSnapshot(rows, params),

  // Statistics
  computeStats: (state: EHTSimulationState, params?: EHTParams) => computeEHTStatistics(state, params),
  statistics: generateEHTStatistics(DEFAULT_EHT_PARAMS),
  generateStatistics: (params: EHTParams) => generateEHTStatistics(params),

  // Batch parameters
  generateBatchParameters: (params: EHTParams) => generateEHTBatchParameters(params),
  batchParameters: EHT_BATCH_PARAMETERS,

  // No renderer or UI in worker context
  renderer: null!,
  ui: undefined,
};

/**
 * Toy Model Definition (Worker-safe)
 * Inline implementation to avoid importing UI/renderer code
 */
const ToyModelWorker: SimulationModel<ToyParams, ToySimulationState> = {
  // Identity
  id: 'Toy',
  name: 'Run & Tumble (Toy)',
  version: '1.0.0',
  description: 'Simple run-and-tumble model for demonstration purposes.',

  // Parameter system
  defaultParams: DEFAULT_TOY_PARAMS,
  validateParams(params: unknown): ToyParams {
    return toyParamsSchema.parse(params);
  },

  // Simulation Loop
  init: (params: ToyParams, seed?: string): ToySimulationState => {
    const effectiveSeed = seed ?? String(params.general.random_seed);
    const rng = new SeededRandom(effectiveSeed);

    const { N, domain_size } = params.general;
    const [width, height] = domain_size;

    const cells: ToyCell[] = [];
    for (let i = 0; i < N; i++) {
      const x = rng.random(width);
      const y = rng.random(height);
      const angle = rng.random(2 * Math.PI);
      const initialPhase = rng.random() > 0.5 ? 'running' : 'tumbling';

      cells.push({
        id: i,
        position: new Vector2(x, y),
        prevPosition: new Vector2(x, y),
        polarity: new Vector2(Math.cos(angle), Math.sin(angle)),
        phase: initialPhase,
        phaseTime: 0,
        timeSinceLastTumble: 0
      });
    }

    return {
      time: 0,
      cells,
      stepCount: 0,
      rngSeed: effectiveSeed
    };
  },

  step: (state: ToySimulationState, dt: number, params: ToyParams): ToySimulationState => {
    // Create seeded RNG for this step (deterministic based on step count)
    const rng = new SeededRandom(`${state.rngSeed}_step_${state.stepCount}`);

    // In-place mutation for performance
    const {
      soft_radius, repulsion_strength, running_speed, tumble_speed, mu,
      boundary_type, domain_size,
      running_duration, tumbling_duration, tumbling_period
    } = params.general;
    const [width, height] = domain_size;
    const cells = state.cells;

    // 1. Process Events (Run/Tumble transitions)
    for (const cell of cells) {
      cell.phaseTime += dt;

      if (cell.phase === 'running') {
        if (cell.phaseTime >= running_duration) {
          cell.phase = 'tumbling';
          cell.phaseTime = 0;
          cell.timeSinceLastTumble = 0;
          // New random polarity (seeded)
          const angle = rng.random(2 * Math.PI);
          cell.polarity = new Vector2(Math.cos(angle), Math.sin(angle));
        }
      } else {
        // Tumbling
        cell.timeSinceLastTumble += dt;
        if (cell.timeSinceLastTumble >= tumbling_period) {
          const angle = rng.random(2 * Math.PI);
          cell.polarity = new Vector2(Math.cos(angle), Math.sin(angle));
          cell.timeSinceLastTumble = 0;
        }

        if (cell.phaseTime >= tumbling_duration) {
          cell.phase = 'running';
          cell.phaseTime = 0;
        }
      }
    }

    // 2. Compute Forces
    const forces: Vector2[] = cells.map(() => Vector2.zero());

    // Repulsion
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const c1 = cells[i];
        const c2 = cells[j];
        const dx = c1.position.x - c2.position.x;
        const dy = c1.position.y - c2.position.y;
        const distSq = dx * dx + dy * dy;

        const r = soft_radius;
        if (distSq < r * r && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const overlap = r - dist;
          const fx = (repulsion_strength * overlap * dx) / dist;
          const fy = (repulsion_strength * overlap * dy) / dist;
          const f = new Vector2(fx, fy);
          forces[i] = forces[i].add(f);
          forces[j] = forces[j].sub(f);
        }
      }
    }

    // Propulsion
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const speed = cell.phase === 'running' ? running_speed : tumble_speed;
      const propulsion = cell.polarity.mult(speed * mu);
      forces[i] = forces[i].add(propulsion);
    }

    // 3. Update Positions (Integration)
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const f = forces[i];
      cell.prevPosition = cell.position;

      const dx = (f.x * dt) / mu;
      const dy = (f.y * dt) / mu;
      cell.position = new Vector2(cell.position.x + dx, cell.position.y + dy);

      // 4. Constraints
      if (boundary_type === 'periodic') {
        cell.position = new Vector2(
          ((cell.position.x % width) + width) % width,
          ((cell.position.y % height) + height) % height
        );
      } else if (boundary_type === 'box') {
        cell.position = new Vector2(
          Math.max(0, Math.min(width, cell.position.x)),
          Math.max(0, Math.min(height, cell.position.y))
        );
      }
    }

    state.time += dt;
    state.stepCount += 1;
    return state;
  },

  // I/O
  getSnapshot: (state: ToySimulationState): Record<string, string | number | boolean>[] => {
    return state.cells.map(c => ({
      id: c.id,
      t: state.time,
      pos_x: c.position.x,
      pos_y: c.position.y,
      phase: c.phase,
      pol_x: c.polarity.x,
      pol_y: c.polarity.y
    }));
  },

  loadSnapshot: (rows: Record<string, string | number | boolean>[], params: ToyParams): ToySimulationState => {
    if (rows.length === 0) {
      return { time: 0, cells: [], stepCount: 0, rngSeed: String(params.general.random_seed) };
    }
    const t = Number(rows[0].t);
    const cells: ToyCell[] = rows.map(r => ({
      id: Number(r.id),
      position: new Vector2(Number(r.pos_x), Number(r.pos_y)),
      prevPosition: new Vector2(Number(r.pos_x), Number(r.pos_y)),
      polarity: new Vector2(Number(r.pol_x), Number(r.pol_y)),
      phase: r.phase as 'running' | 'tumbling',
      phaseTime: 0,
      timeSinceLastTumble: 0
    }));
    // Note: stepCount is estimated from time and dt, rngSeed from params
    const estimatedStepCount = Math.round(t / params.general.dt);
    return { time: t, cells, stepCount: estimatedStepCount, rngSeed: String(params.general.random_seed) };
  },

  // Statistics
  computeStats: (state: ToySimulationState, _params?: ToyParams) => computeToyStatistics(state),
  statistics: TOY_STATISTICS,
  generateStatistics: (_params: ToyParams) => TOY_STATISTICS,

  // Batch parameters
  generateBatchParameters: (_params: ToyParams) => TOY_BATCH_PARAMETERS,
  batchParameters: TOY_BATCH_PARAMETERS,

  // No renderer or UI in worker context
  renderer: null!,
  ui: undefined,
};

// Register models
modelRegistry.register(EHTModelWorker);
modelRegistry.register(ToyModelWorker);

// Set default
modelRegistry.setDefault(EHTModelWorker.id);
