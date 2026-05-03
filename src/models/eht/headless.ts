/**
 * Browser-free EHT model definition for CLI and worker-style execution.
 * Avoids importing UI, renderer, and CSS-only modules into Node.
 */

import type { SimulationModel } from '@/core/interfaces/model';
import type { EHTSimulationState } from './types';
import { createInitialEHTState } from './types';
import type { EHTParams } from './params/types';
import { ehtParamsSchema } from './params/schema';
import { DEFAULT_EHT_PARAMS, EHT_PRESETS } from './params/defaults';
import { computeEHTStatistics, generateEHTStatistics, exportCellMetrics } from './statistics';
import { EHT_BATCH_PARAMETERS, generateEHTBatchParameters } from './ui/availableParams';
import { initializeEHTSimulation } from './simulation/init';
import { performTimestep } from './simulation/step';
import { getSnapshot, loadSnapshot } from './output';
import { SeededRandom } from '@/core/math/random';

export const EHTHeadlessModel: SimulationModel<EHTParams, EHTSimulationState> = {
  id: 'EHT',
  name: 'Epithelial-to-Hematopoietic Transition',
  version: '1.2.0',
  description: 'Simulates cell mechanics, division, and EMT events in curved epithelial tissue.',

  defaultParams: DEFAULT_EHT_PARAMS,
  validateParams(params: unknown): EHTParams {
    return ehtParamsSchema.parse(params);
  },

  init: (params: EHTParams, seed?: string): EHTSimulationState => {
    const effectiveSeed = seed ?? String(params.general.random_seed);
    const rng = new SeededRandom(effectiveSeed);
    const state = createInitialEHTState(effectiveSeed);
    initializeEHTSimulation(params, state, rng);
    return state;
  },

  step: (state: EHTSimulationState, _dt: number, params: EHTParams): EHTSimulationState => {
    const rng = new SeededRandom(`${state.rngSeed}_step_${state.step_count}`);
    performTimestep(state, params, rng);
    return state;
  },

  getSnapshot: (state: EHTSimulationState) => getSnapshot(state),
  loadSnapshot: (rows: Record<string, any>[], params: EHTParams) => loadSnapshot(rows, params),
  exportCellMetrics: (state: EHTSimulationState, params: EHTParams) => exportCellMetrics(state, params),

  computeStats: (state: EHTSimulationState, params?: EHTParams) => computeEHTStatistics(state, params),
  statistics: generateEHTStatistics(DEFAULT_EHT_PARAMS),
  generateStatistics: (params: EHTParams) => generateEHTStatistics(params),

  generateBatchParameters: (params: EHTParams) => generateEHTBatchParameters(params),
  batchParameters: EHT_BATCH_PARAMETERS,

  renderer: null!,
  ui: undefined,
};

export { EHT_PRESETS, EHT_BATCH_PARAMETERS };
