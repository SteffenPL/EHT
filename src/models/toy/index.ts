/**
 * Toy model definition.
 *
 * A simple run-and-tumble model demonstrating the multi-model architecture.
 * This model manages its own simulation state (ToySimulationState) rather than
 * using the shared SimulationState/CellState types from EHT.
 */

import type { ModelDefinition, CellForces as ModelCellForces } from '@/core/registry/types';
import { modelRegistry } from '@/core/registry/registry';
import type { SimulationState, CellState } from '@/core/types/state';
import { CellPhase } from '@/core/types/state';
import type { SeededRandom } from '@/core/math/random';
import { Vector2 } from '@/core/math/vector2';

// Import Toy-specific modules
import type { ToyParams } from './params/types';
import { toyParamsSchema } from './params/schema';
import { DEFAULT_TOY_PARAMS } from './params/defaults';
import { TOY_STATISTICS } from './statistics';
import { TOY_PARAMETER_GROUPS, TOY_BATCH_PARAMETERS } from './ui';
import { toyRenderer } from './renderer';

/**
 * Toy Model Definition
 *
 * A simple run-and-tumble model with:
 * - N cells with soft repulsion
 * - Run-and-tumble dynamics with periodic polarity changes
 * - Box, periodic, or no boundary conditions
 *
 * Note: This model uses adapter functions to work with the shared simulation
 * engine types. The actual simulation logic is in ./simulation/simulation.ts.
 */
export const ToyModel: ModelDefinition<ToyParams> = {
  // Identity
  name: 'Toy',
  displayName: 'Run & Tumble (Toy)',
  version: { major: 1, minor: 0, patch: 0 },
  description: 'Simple run-and-tumble model for demonstration purposes.',

  // Parameter system
  paramsSchema: toyParamsSchema,
  defaultParams: DEFAULT_TOY_PARAMS,
  cellTypes: ['toy'],

  // Statistics
  statistics: TOY_STATISTICS,

  // Simulation hooks - adapted for the shared engine interface
  // Note: The Toy model has simpler cell structure, so we create minimal adapters

  createCell: (
    params: ToyParams,
    _state: SimulationState,
    rng: SeededRandom,
    position: Vector2,
    _cellTypeName: string,
    _parent?: CellState
  ): CellState => {
    // Create a minimal CellState for compatibility
    const angle = rng.random(2 * Math.PI);
    const polarityX = Math.cos(angle);
    const polarityY = Math.sin(angle);

    return {
      id: _state.cells.length,
      typeIndex: 'toy',
      pos: { x: position.x, y: position.y },
      A: { x: polarityX, y: polarityY }, // Store polarity in A
      B: { x: 0, y: 0 }, // Unused
      R_soft: params.general.soft_radius,
      R_hard: params.general.soft_radius * 0.5,
      eta_A: 0,
      eta_B: 0,
      has_A: true,
      has_B: false,
      phase: CellPhase.G1,
      birth_time: 0,
      division_time: Infinity,
      is_running: true,
      running_mode: 0,
      has_inm: false,
      time_A: 0,
      time_B: 0,
      time_S: 0,
      time_P: 0,
      stiffness_apical_apical: 0,
      stiffness_straightness: 0,
      stiffness_nuclei_apical: 0,
      stiffness_nuclei_basal: 0,
    };
  },

  initializeSimulation: (
    params: ToyParams,
    state: SimulationState,
    rng: SeededRandom
  ): void => {
    const { N, domain_size } = params.general;
    const [width, height] = domain_size;

    state.cells = [];
    for (let i = 0; i < N; i++) {
      const x = rng.random(width);
      const y = rng.random(height);
      const angle = rng.random(2 * Math.PI);

      state.cells.push({
        id: i,
        typeIndex: 'toy',
        pos: { x, y },
        A: { x: Math.cos(angle), y: Math.sin(angle) }, // Polarity
        B: { x: 0, y: 0 },
        R_soft: params.general.soft_radius,
        R_hard: params.general.soft_radius * 0.5,
        eta_A: rng.random(params.general.running_duration + params.general.tumbling_duration), // Phase timer
        eta_B: 0, // Tumble timer
        has_A: true, // is_running
        has_B: false,
        phase: CellPhase.G1,
        birth_time: 0,
        division_time: Infinity,
        is_running: true,
        running_mode: 0,
        has_inm: false,
        time_A: 0,
        time_B: 0,
        time_S: 0,
        time_P: 0,
        stiffness_apical_apical: 0,
        stiffness_straightness: 0,
        stiffness_nuclei_apical: 0,
        stiffness_nuclei_basal: 0,
      });
    }
  },

  calcForces: (state: SimulationState, params: ToyParams): ModelCellForces[] => {
    const { soft_radius, repulsion_strength, running_speed, tumble_speed, mu } = params.general;
    const cells = state.cells;

    // Initialize forces with Vector2
    const posForces: Vector2[] = cells.map(() => Vector2.zero());

    // Repulsion forces
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const dx = cells[i].pos.x - cells[j].pos.x;
        const dy = cells[i].pos.y - cells[j].pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < soft_radius && dist > 0) {
          const overlap = soft_radius - dist;
          const fx = (repulsion_strength * overlap * dx) / dist;
          const fy = (repulsion_strength * overlap * dy) / dist;

          posForces[i] = posForces[i].add(new Vector2(fx, fy));
          posForces[j] = posForces[j].sub(new Vector2(fx, fy));
        }
      }
    }

    // Self-propulsion forces
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const isRunning = cell.has_A;
      const speed = isRunning ? running_speed : tumble_speed;
      const propulsion = new Vector2(speed * mu * cell.A.x, speed * mu * cell.A.y);
      posForces[i] = posForces[i].add(propulsion);
    }

    // Convert to ModelCellForces format
    return posForces.map((f) => ({
      pos: f,
      A: Vector2.zero(),
      B: Vector2.zero(),
    }));
  },

  applyConstraints: (state: SimulationState, params: ToyParams): void => {
    const { boundary_type, domain_size } = params.general;
    const [width, height] = domain_size;

    if (boundary_type === 'none') return;

    for (const cell of state.cells) {
      if (boundary_type === 'periodic') {
        cell.pos = {
          x: ((cell.pos.x % width) + width) % width,
          y: ((cell.pos.y % height) + height) % height,
        };
      } else if (boundary_type === 'box') {
        cell.pos = {
          x: Math.max(0, Math.min(width, cell.pos.x)),
          y: Math.max(0, Math.min(height, cell.pos.y)),
        };
      }
    }
  },

  processEvents: (state: SimulationState, params: ToyParams, dt: number): void => {
    const { running_duration, tumbling_duration, tumbling_period } = params.general;

    for (const cell of state.cells) {
      // eta_A stores phase time, has_A stores is_running, eta_B stores tumble timer
      cell.eta_A += dt;

      if (cell.has_A) {
        // Running phase
        if (cell.eta_A >= running_duration) {
          cell.has_A = false; // Switch to tumbling
          cell.eta_A = 0;
          cell.eta_B = 0;
          // Pick new random polarity
          const angle = Math.random() * 2 * Math.PI;
          cell.A = { x: Math.cos(angle), y: Math.sin(angle) };
        }
      } else {
        // Tumbling phase
        cell.eta_B += dt;

        // Periodic polarity changes during tumbling
        if (cell.eta_B >= tumbling_period) {
          const angle = Math.random() * 2 * Math.PI;
          cell.A = { x: Math.cos(angle), y: Math.sin(angle) };
          cell.eta_B = 0;
        }

        // Check if should transition to running
        if (cell.eta_A >= tumbling_duration) {
          cell.has_A = true; // Switch to running
          cell.eta_A = 0;
        }
      }
    }
  },

  processDivisions: (): number => {
    // No division in Toy model
    return 0;
  },

  // UI configuration
  parameterGroups: TOY_PARAMETER_GROUPS,
  batchParameters: TOY_BATCH_PARAMETERS,

  // Model-specific renderer
  renderer: toyRenderer,
};

// Register the Toy model
modelRegistry.register(ToyModel);

// Re-export everything
export * from './params';
export * from './simulation';
export * from './statistics';
export { TOY_PARAMETER_GROUPS, TOY_BATCH_PARAMETERS } from './ui';
