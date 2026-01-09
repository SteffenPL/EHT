/**
 * Toy model definition.
 * A simple run-and-tumble model.
 */

import type { SimulationModel } from '@/core/registry/types';
import type { ToySimulationState, ToyCell } from './simulation/types';
import { Vector2 } from '@/core/math/vector2';
import { SeededRandom } from '@/core/math/random';

// Import Toy-specific modules
import type { ToyParams } from './params/types';
import { toyParamsSchema } from './params/schema';
import { DEFAULT_TOY_PARAMS } from './params/defaults';
import { computeToyStatistics, TOY_STATISTICS } from './statistics';
import { TOY_BATCH_PARAMETERS, toyUI } from './ui';
import { toyRenderer } from './renderer';

/**
 * Toy Model Definition
 */
export const ToyModel: SimulationModel<ToyParams, ToySimulationState> = {
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
    const effectiveSeed = seed ?? params.general.random_seed;
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
        phaseTime: 0, // Should be randomized?
        timeSinceLastTumble: 0
      });
    }

    return {
      time: 0,
      cells
    };
  },

  step: (state: ToySimulationState, dt: number, params: ToyParams): ToySimulationState => {
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
          // New random polarity
          const angle = Math.random() * 2 * Math.PI;
          cell.polarity = new Vector2(Math.cos(angle), Math.sin(angle));
        }
      } else {
        // Tumbling
        cell.timeSinceLastTumble += dt;
        if (cell.timeSinceLastTumble >= tumbling_period) {
          const angle = Math.random() * 2 * Math.PI;
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

        // Optimization: check squared dist
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
      // F = velocity * friction ? No, F_propulsion / mu = velocity
      // Here: velocity = (Forces / mu)
      // Self-propulsion adds to velocity directly? 
      // Previous impl: F += speed * mu * polarity
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
    return state;
  },

  // I/O
  getSnapshot: (state: ToySimulationState): Record<string, any>[] => {
    // Flatten
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

  loadSnapshot: (rows: Record<string, any>[], _params: ToyParams): ToySimulationState => {
    if (rows.length === 0) return { time: 0, cells: [] };
    const t = Number(rows[0].t);
    const cells: ToyCell[] = rows.map(r => ({
      id: Number(r.id),
      position: new Vector2(Number(r.pos_x), Number(r.pos_y)),
      prevPosition: new Vector2(Number(r.pos_x), Number(r.pos_y)),
      polarity: new Vector2(Number(r.pol_x), Number(r.pol_y)),
      phase: r.phase as 'running' | 'tumbling',
      phaseTime: 0, // Lost
      timeSinceLastTumble: 0 // Lost
    }));
    return { time: t, cells };
  },

  // Statistics
  computeStats: (state: ToySimulationState, _params?: ToyParams) => computeToyStatistics(state),
  statistics: TOY_STATISTICS,
  generateStatistics: (_params: ToyParams) => TOY_STATISTICS,

  // Model-specific renderer
  renderer: toyRenderer,

  // Model-specific UI components
  ui: toyUI,
};

// Re-export specific parts if needed
export { TOY_BATCH_PARAMETERS };
