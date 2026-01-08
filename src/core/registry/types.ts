/**
 * Model definition types for the multi-model architecture.
 */

import type { SimulationModel } from '../interfaces/model';
import type { ModelRenderer, ModelRenderContext, BoundingBox } from '../interfaces/renderer';

import type { Vector2 } from '../math/vector2';

// Re-export interface types
export type { SimulationModel };
export type { ModelRenderer, ModelRenderContext, BoundingBox };

// Alias for backward compatibility (if needed) or clarity
export type ModelDefinition<Params = any, State = any> = SimulationModel<Params, State>;

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
  options?: any[]; // For dropdowns/enums
}

/** Statistic definition for batch analysis */
export interface StatisticDefinition<State = any> {
  id: string;
  label: string;
  description: string;
  compute: (state: State) => number;
}


/** Deep partial type for user input - allows partial specification of nested objects */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Partial params for loading (missing fields use defaults) */
export type PartialParams<T extends BaseSimulationParams> = DeepPartial<T>;
