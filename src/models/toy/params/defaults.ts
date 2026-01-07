/**
 * Toy model default parameters.
 */

import type { ToyParams, ToyGeneralParams } from './types';

/** Default general parameters */
export const DEFAULT_TOY_GENERAL: ToyGeneralParams = {
  // Toy-specific
  N: 20,
  soft_radius: 5,
  repulsion_strength: 10,
  running_speed: 2,
  tumble_speed: 0.5,
  running_duration: 5,
  tumbling_duration: 2,
  tumbling_period: 0.5,
  boundary_type: 'box',
  domain_size: [100, 100],
  // Base params
  t_end: 60,
  dt: 0.1,
  random_seed: 42,
  mu: 1,
  n_substeps: 1,
  N_max: 100,
  w_screen: 100,
  h_screen: 100,
};

/** Default Toy model parameters */
export const DEFAULT_TOY_PARAMS: ToyParams = {
  metadata: {
    model: 'Toy',
    version: '1.0.0',
  },
  general: DEFAULT_TOY_GENERAL,
};

/** Create default params with optional overrides */
export function createDefaultToyParams(overrides?: Partial<ToyParams>): ToyParams {
  return {
    ...DEFAULT_TOY_PARAMS,
    ...overrides,
    general: {
      ...DEFAULT_TOY_GENERAL,
      ...overrides?.general,
    },
  };
}
