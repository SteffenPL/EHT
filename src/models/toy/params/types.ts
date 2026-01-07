/**
 * Toy model parameter types.
 * A simple run-and-tumble model for demonstration.
 */

import type { ParamsMetadata, BaseGeneralParams } from '@/core/registry';

/** Boundary condition type */
export type BoundaryType = 'periodic' | 'box' | 'none';

/** General simulation parameters - extends base with Toy-specific params */
export interface ToyGeneralParams extends BaseGeneralParams {
  /** Number of cells */
  N: number;
  /** Soft radius in microns */
  soft_radius: number;
  /** Repulsion force coefficient */
  repulsion_strength: number;
  /** Running speed in microns/minute */
  running_speed: number;
  /** Tumbling speed in microns/minute */
  tumble_speed: number;
  /** Running duration in minutes */
  running_duration: number;
  /** Tumbling duration in minutes */
  tumbling_duration: number;
  /** Time between polarity changes during tumbling, in minutes */
  tumbling_period: number;
  /** Boundary condition type */
  boundary_type: BoundaryType;
  /** Domain size [width, height] in microns (ignored for 'none' boundary) */
  domain_size: [number, number];
}

/** Complete Toy model parameters */
export interface ToyParams {
  metadata: ParamsMetadata;
  general: ToyGeneralParams;
}

/** Partial params for loading/merging */
export type PartialToyParams = {
  metadata?: Partial<ParamsMetadata>;
  general?: Partial<ToyGeneralParams>;
};
