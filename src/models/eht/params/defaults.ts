/**
 * Default parameter values for the EHT model.
 */

import { cloneDeep } from 'lodash-es';
import type { EHTParams, EHTCellTypeParams } from './types';

/** Default control cell type */
export const DEFAULT_CONTROL_CELL: EHTCellTypeParams = {
  N_init: 25,
  location: "",
  R_hard: 0.4,
  R_hard_div: 0.7,
  R_soft: 1.2,
  color: { r: 30, g: 100, b: 20 },
  dur_G2: 0.5,
  dur_mitosis: 0.5,
  k_apical_junction: 5.0,
  k_cytos: 5.0,
  max_cytoskeleton_length: 0.5,
  run: 0.0,
  running_speed: 1.0,
  running_mode: 0,
  stiffness_apical_apical: 2.0,
  stiffness_apical_apical_div: 4.0,
  stiffness_nuclei_apical: 3.0,
  stiffness_nuclei_basal: 2.0,
  stiffness_repulsion: 2.0,
  stiffness_straightness: 5.0,
  lifespan_start: 5.5,
  lifespan_end: 6.5,
  INM: 0.0,
  hetero: false,
  events: {
    time_A_start: Infinity,
    time_A_end: Infinity,
    time_B_start: Infinity,
    time_B_end: Infinity,
    time_S_start: Infinity,
    time_S_end: Infinity,
    time_P_start: Infinity,
    time_P_end: Infinity,
  },
};

/** Default EMT cell type */
export const DEFAULT_EMT_CELL: EHTCellTypeParams = {
  N_init: 5,
  location: "bottom",
  R_hard: 0.4,
  R_hard_div: 0.7,
  R_soft: 1.2,
  color: { r: 128, g: 0, b: 128 },
  dur_G2: 0.5,
  dur_mitosis: 0.5,
  k_apical_junction: 1.0,
  k_cytos: 5.0,
  max_cytoskeleton_length: 0.5,
  run: 0.0,
  running_speed: 1.0,
  running_mode: 0,
  stiffness_apical_apical: 2.0,
  stiffness_apical_apical_div: 4.0,
  stiffness_nuclei_apical: 3.0,
  stiffness_nuclei_basal: 2.0,
  stiffness_repulsion: 4.0,
  stiffness_straightness: 2.0,
  lifespan_start: 5.5,
  lifespan_end: 6.5,
  INM: 0.0,
  hetero: true,
  events: {
    time_A_start: 3,
    time_A_end: 12,
    time_B_start: 3,
    time_B_end: 12,
    time_S_start: Infinity,
    time_S_end: Infinity,
    time_P_start: Infinity,
    time_P_end: Infinity,
  },
};

/** Default EHT simulation parameters */
export const DEFAULT_EHT_PARAMS: EHTParams = {
  metadata: {
    model: 'EHT',
    version: '1.0.0',
  },
  general: {
    t_end: 48,
    dt: 0.1,
    random_seed: 0,
    full_circle: true,
    w_init: 80, // ~ total N_init * 1.5
    h_init: 5,
    mu: 0.2,
    n_substeps: 30,
    alg_dt: 0.01,
    w_screen: 50,      // Minimum visible width in simulation units
    h_screen: 25,      // Minimum visible height in simulation units
    p_div_out: 1.0,
    perimeter: 105,    // ≈ 2π × 16.67 (equivalent to curvature 0.06)
    aspect_ratio: 1,   // Circle
  },
  cell_prop: {
    apical_junction_init: 0.0,
    max_basal_junction_dist: 4.0,
    basal_daming_ratio: 1.0,
    basal_membrane_repulsion: 0.0,
    cytos_init: 0.0,
    diffusion: 0.2,
  },
  cell_types: {
    control: DEFAULT_CONTROL_CELL,
    emt: DEFAULT_EMT_CELL,
  },
};

/**
 * Create a deep copy of the default EHT parameters.
 * Useful for creating a fresh parameter set to modify.
 * Note: Uses cloneDeep instead of JSON to preserve Infinity values.
 */
export function createDefaultEHTParams(): EHTParams {
  return cloneDeep(DEFAULT_EHT_PARAMS);
}

/**
 * EHT parameter presets.
 */
export const EHT_PRESETS: Array<{
  key: string;
  label: string;
  create: () => EHTParams;
}> = [
    {
      key: 'default',
      label: 'Default',
      create: () => cloneDeep(DEFAULT_EHT_PARAMS),
    },
    {
      key: 'straight',
      label: 'Straight',
      create: () => {
        const params = createDefaultEHTParams();
        params.general.perimeter = 0;      // Straight line
        params.general.aspect_ratio = 1;
        params.general.full_circle = false;
        return params;
      },
    },
    {
      key: 'full_circle',
      label: 'Full Circle',
      create: () => {
        const params = createDefaultEHTParams();
        params.general.perimeter = 31.4;   // ≈ 2π × 5 (equivalent to curvature 0.2)
        params.general.aspect_ratio = 1;
        params.general.full_circle = true;
        return params;
      },
    },
  ];

// Legacy exports for backwards compatibility
export const DEFAULT_PARAMS = DEFAULT_EHT_PARAMS;
export const PARAM_PRESETS = EHT_PRESETS;
export const createDefaultParams = createDefaultEHTParams;
