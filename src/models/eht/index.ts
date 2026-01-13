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
import { computeEHTStatistics, generateEHTStatistics, exportCellMetrics } from './statistics';
import { EHT_BATCH_PARAMETERS, generateEHTBatchParameters } from './ui/availableParams';
import { ehtUI } from './ui';
import { initializeEHTSimulation } from './simulation/init';
import { performTimestep } from './simulation/step';
import { ehtRenderer } from './renderer';
import { getSnapshot, loadSnapshot } from './output';
import { SeededRandom } from '@/core/math/random';
import { EHTRenderOptionsPanel, defaultEHTRenderOptions } from './renderOptions';

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
    const effectiveSeed = seed ?? String(params.general.random_seed);
    const rng = new SeededRandom(effectiveSeed);
    const state = createInitialEHTState(effectiveSeed);
    initializeEHTSimulation(params, state, rng);
    return state;
  },

  step: (state: EHTSimulationState, _dt: number, params: EHTParams): EHTSimulationState => {
    // Create seeded RNG for this step (deterministic based on step count)
    // Uses stored rngSeed for proper replay from loaded state
    const rng = new SeededRandom(`${state.rngSeed}_step_${state.step_count}`);

    performTimestep(state, params, rng);

    return state; // In-place mutation for performance, but return it.
  },

  // I/O
  getSnapshot: (state: EHTSimulationState) => getSnapshot(state),
  loadSnapshot: (rows: Record<string, any>[], params: EHTParams) => loadSnapshot(rows, params),
  exportCellMetrics: (state: EHTSimulationState, params: EHTParams) => exportCellMetrics(state, params),

  // Statistics
  computeStats: (state: EHTSimulationState, params?: EHTParams) => computeEHTStatistics(state, params),
  statistics: generateEHTStatistics(DEFAULT_EHT_PARAMS),
  generateStatistics: (params: EHTParams) => generateEHTStatistics(params),

  // Batch parameters - dynamic generation
  generateBatchParameters: (params: EHTParams) => generateEHTBatchParameters(params),
  batchParameters: EHT_BATCH_PARAMETERS, // Static fallback

  // Model-specific renderer
  renderer: ehtRenderer,

  // Model-specific UI components
  ui: ehtUI,

  // Model-specific render options
  renderOptions: {
    defaultOptions: defaultEHTRenderOptions,
    RenderOptionsPanel: EHTRenderOptionsPanel,
  },
};

// Re-export specific parts if needed
export { EHT_PRESETS, EHT_BATCH_PARAMETERS };
