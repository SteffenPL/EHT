/**
 * Model definition types for the multi-model architecture.
 * Each model must implement the ModelDefinition interface.
 */

import { z } from 'zod';
import type { SemanticVersion } from './version';
import type { SimulationState, CellState } from '../types/state';
import type { BatchSnapshot } from '../batch/types';
import type { SeededRandom } from '../math/random';
import type { Vector2 } from '../math/vector2';

/** Base parameter metadata - required for all models */
export interface ParamsMetadata {
  model: string;      // e.g., "EHT"
  version: string;    // e.g., "1.0.0"
}

/** RGB color type (shared across models) */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/** Min/max range for random values (shared across models) */
export interface Range {
  min: number;
  max: number;
}

/** Base general parameters that all models should have */
export interface BaseGeneralParams {
  t_end: number;            // End time
  dt: number;               // Time step
  random_seed: number;      // Random seed for reproducibility
  n_substeps: number;       // Number of substeps per timestep
  N_max: number;            // Maximum number of cells
  w_screen: number;         // Screen width (visualization)
  h_screen: number;         // Screen height (visualization)
  mu: number;               // Friction coefficient
}

/** Base simulation parameters that all models must have */
export interface BaseSimulationParams {
  metadata: ParamsMetadata;
  general: BaseGeneralParams;
}

/** Cell forces result from force calculation */
export interface CellForces {
  pos: Vector2;
  A: Vector2;
  B: Vector2;
}

/** Parameter field definition for UI */
export interface ParameterFieldDefinition {
  path: string;                     // e.g., "general.N_emt"
  label: string;
  type: 'number' | 'boolean' | 'color' | 'range';
  step?: number;
  min?: number;
  max?: number;
  isInteger?: boolean;
  description?: string;
}

/** Parameter group definition for UI panel */
export interface ParameterGroupDefinition {
  id: string;
  label: string;
  collapsed?: boolean;
  fields: ParameterFieldDefinition[];
}

/** Batch parameter definition for sweeps */
export interface BatchParameterDefinition {
  path: string;
  label: string;
  isInteger?: boolean;
}

/** Statistic definition for batch analysis */
export interface StatisticDefinition {
  id: string;
  label: string;
  description: string;
  compute: (snapshot: BatchSnapshot) => number;
}

/**
 * Model definition interface - each model must implement this.
 *
 * @template TParams The model's specific parameter type extending BaseSimulationParams
 */
export interface ModelDefinition<TParams extends BaseSimulationParams = BaseSimulationParams> {
  // Identity
  name: string;                           // e.g., "EHT"
  displayName: string;                    // e.g., "Epithelial-to-Hematopoietic Transition"
  version: SemanticVersion;
  description: string;

  // Parameter system
  paramsSchema: z.ZodSchema<TParams>;     // Zod schema for validation
  defaultParams: TParams;                 // Default parameter values
  cellTypes: string[];                    // Available cell types (e.g., ['control', 'emt'])

  // Statistics
  statistics: StatisticDefinition[];      // Model-specific statistics

  // Simulation hooks
  createCell: (
    params: TParams,
    state: SimulationState,
    rng: SeededRandom,
    position: Vector2,
    cellTypeName: string,
    parent?: CellState
  ) => CellState;

  initializeSimulation: (
    params: TParams,
    state: SimulationState,
    rng: SeededRandom
  ) => void;

  calcForces: (
    state: SimulationState,
    params: TParams
  ) => CellForces[];

  applyConstraints: (
    state: SimulationState,
    params: TParams
  ) => void;

  processEvents: (
    state: SimulationState,
    params: TParams,
    dt: number
  ) => void;

  processDivisions: (
    state: SimulationState,
    params: TParams,
    rng: SeededRandom
  ) => number;

  // UI configuration
  parameterGroups: ParameterGroupDefinition[];
  batchParameters: BatchParameterDefinition[];

  // Optional: Parameter presets
  presets?: Array<{
    key: string;
    label: string;
    create: () => TParams;
  }>;

  // Optional: Custom rendering configuration
  renderConfig?: ModelRenderConfig;
}

/** Custom rendering configuration for model-specific visuals */
export interface ModelRenderConfig {
  // Whether the model uses a basal membrane curve
  hasBasalMembrane?: boolean;
  // Custom basal curve parameters (if applicable)
  basalCurveParams?: string[];  // paths to curvature params
}

/** Deep partial type for user input - allows partial specification of nested objects */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Partial params for loading (missing fields use defaults) */
export type PartialParams<T extends BaseSimulationParams> = DeepPartial<T>;
