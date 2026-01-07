/**
 * EHT (Epithelial-to-Hematopoietic Transition) model definition.
 * This is the main entry point for the EHT model.
 */

import type { ModelDefinition, CellForces as ModelCellForces } from '@/core/registry/types';
import { modelRegistry } from '@/core/registry/registry';
import type { SimulationState, CellState } from '@/core/types/state';
import type { SeededRandom } from '@/core/math/random';
import type { Vector2 } from '@/core/math/vector2';

// Import EHT-specific modules
import type { EHTParams } from './params/types';
import { ehtParamsSchema } from './params/schema';
import { DEFAULT_EHT_PARAMS, EHT_PRESETS } from './params/defaults';
import { EHT_STATISTICS } from './statistics';
import { EHT_PARAMETER_GROUPS } from './ui/parameterGroups';
import { EHT_BATCH_PARAMETERS } from './ui/availableParams';
import {
  createCell as ehtCreateCell,
  calcAllForces as ehtCalcForces,
  applyAllConstraints as ehtApplyConstraints,
  processEMTEvents as ehtProcessEvents,
  processCellDivisions as ehtProcessDivisions,
  initializeEHTSimulation,
} from './simulation';

/**
 * EHT Model Definition
 *
 * Models Epithelial-to-Hematopoietic Transition with:
 * - Cell mechanics (repulsion, springs, constraints)
 * - Cell division with interkinetic nuclear migration (INM)
 * - EMT events: loss of apical/basal adhesion, loss of straightness, cell polarization/running
 * - Curved basal membrane geometry
 */
export const EHTModel: ModelDefinition<EHTParams> = {
  // Identity
  name: 'EHT',
  displayName: 'Epithelial-to-Hematopoietic Transition',
  version: { major: 1, minor: 0, patch: 0 },
  description:
    'Simulates cell mechanics, division, and EMT events in curved epithelial tissue.',

  // Parameter system
  paramsSchema: ehtParamsSchema,
  defaultParams: DEFAULT_EHT_PARAMS,
  cellTypes: ['control', 'emt'],

  // Statistics
  statistics: EHT_STATISTICS,

  // Simulation hooks
  createCell: (
    params: EHTParams,
    state: SimulationState,
    rng: SeededRandom,
    position: Vector2,
    cellTypeName: string,
    parent?: CellState
  ): CellState => {
    const cellType = params.cell_types[cellTypeName] || params.cell_types.control;
    return ehtCreateCell(params, state, rng, position, cellType, parent);
  },

  initializeSimulation: (
    params: EHTParams,
    state: SimulationState,
    rng: SeededRandom
  ): void => {
    initializeEHTSimulation(params, state, rng);
  },

  calcForces: (state: SimulationState, params: EHTParams): ModelCellForces[] => {
    // Convert the EHT-specific forces to the common format
    const ehtForces = ehtCalcForces(state, params);
    return ehtForces.map((f) => ({
      pos: f.f,
      A: f.fA,
      B: f.fB,
    }));
  },

  applyConstraints: (state: SimulationState, params: EHTParams): void => {
    ehtApplyConstraints(state, params);
  },

  processEvents: (state: SimulationState, params: EHTParams, dt: number): void => {
    ehtProcessEvents(state, params, dt);
  },

  processDivisions: (
    state: SimulationState,
    params: EHTParams,
    rng: SeededRandom
  ): number => {
    return ehtProcessDivisions(state, params, rng);
  },

  // UI configuration
  parameterGroups: EHT_PARAMETER_GROUPS,
  batchParameters: EHT_BATCH_PARAMETERS,

  // Presets
  presets: EHT_PRESETS,

  // Render configuration
  renderConfig: {
    hasBasalMembrane: true,
    basalCurveParams: ['general.curvature_1', 'general.curvature_2'],
  },
};

// Register the EHT model
modelRegistry.register(EHTModel);
modelRegistry.setDefault('EHT');

// Re-export everything for convenience
export * from './params';
export * from './simulation';
export * from './statistics';
export * from './ui';
