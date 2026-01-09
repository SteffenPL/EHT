/**
 * EHT (Epithelial-to-Hematopoietic Transition) model definition.
 * This is the main entry point for the EHT model.
 */

import type { SimulationModel } from '@/core/interfaces/model';
import type { EHTSimulationState } from './types';
import { createInitialEHTState } from './types';

// Import EHT-specific modules
import type { EHTParams } from './params/types';
import { ehtParamsSchema } from './params/schema';
import { DEFAULT_EHT_PARAMS, EHT_PRESETS } from './params/defaults';
import { computeEHTStatistics, generateEHTStatistics } from './statistics';
import { EHT_BATCH_PARAMETERS, generateEHTBatchParameters } from './ui/availableParams';
import { ehtUI } from './ui';
import { initializeEHTSimulation } from './simulation/init';
import { performTimestep } from './simulation/step';
import { ehtRenderer } from './renderer';
import { getSnapshot, loadSnapshot } from './output';
import { SeededRandom } from '@/core/math/random';

/**
 * EHT Model Definition
 */
export const EHTModel: SimulationModel<EHTParams, EHTSimulationState> = {
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
    // If seed is provided override params seed, else use params seed
    const effectiveSeed = seed ?? params.general.random_seed;
    // We should probably update the params with the seed if it was passed?
    // But init returns state, not params. The params object is usually immutable during run.
    // However, the internal RNG needs to be seeded.
    // In current logic, `initializeEHTSimulation` treats params as source of truth.
    // So we assume params has the correct seed already or we construct a RNG from it.

    // Note: If the runner manages the seed override, it should pass it in params.
    const rng = new SeededRandom(effectiveSeed);
    const state = createInitialEHTState();
    initializeEHTSimulation(params, state, rng);
    return state;
  },

  step: (state: EHTSimulationState, _dt: number, params: EHTParams): EHTSimulationState => {
    // The EHT model uses a fixed time step logic inside "performTimestep" usually,
    // but here we expose `dt` in the interface.
    // `performTimestep` internalizes the dt from params.general.dt
    // We should ensure consistency.
    // For now we ignore the passed `dt` and use params' dt as per original logic, 
    // or we should update `performTimestep` to use this dt.
    // Given the physics is stiff, best to stick to fixed dt from params for now.

    // Create a new RNG based on step (or carry over RNG state? generic interface doesn't pass RNG)
    // This is a flaw in the functional `step` interface if we want determinism without passing RNG.
    // EHT old logic stored RNG in the generic `SimulationEngine`.
    // We might need to store RNG state in `EHTSimulationState` if we want full determinism on resume.
    // For now, we'll re-instantiate RNG based on seed + step_count (perf hit?) or just use Math.random if generic.
    // BUT we want seeded random.
    // Best approach: Add `rng` to EHTSimulationState.

    // Hack for now: Re-create RNG is expensive and incorrect for sequence.
    // The `SimulationModel` interface `step` might need to accept an RNG or the state should hold it.
    // Let's assume the state holds relevant RNG state, OR we rely on the fact that `step` is called sequentially.
    // The `step` function should really perform the update.

    // Construct RNG. 
    // If we want to support true replay, we need to handle RNG state.
    // For now, let's use a temporary new RNG seeded with (seed + step_count).
    // This provides determinism for a specific step count.
    const seed = params.general.random_seed + "_" + state.step_count;
    const rng = new SeededRandom(seed);

    performTimestep(state, params, rng);

    return state; // In-place mutation for performance, but return it.
  },

  // I/O
  getSnapshot: (state: EHTSimulationState) => getSnapshot(state),
  loadSnapshot: (rows: Record<string, any>[], params: EHTParams) => loadSnapshot(rows, params),

  // Statistics
  computeStats: (state: EHTSimulationState, params?: EHTParams) => computeEHTStatistics(state, params),
  statistics: generateEHTStatistics(DEFAULT_EHT_PARAMS),

  // Batch parameters - dynamic generation
  generateBatchParameters: (params: EHTParams) => generateEHTBatchParameters(params),
  batchParameters: EHT_BATCH_PARAMETERS, // Static fallback

  // Model-specific renderer
  renderer: ehtRenderer,

  // Model-specific UI components
  ui: ehtUI,
};

// Re-export specific parts if needed
export { EHT_PRESETS, EHT_BATCH_PARAMETERS };
