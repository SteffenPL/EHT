/**
 * Default parameter values for the EHT simulator.
 * Based on the original simulation.js params object.
 */
import type { SimulationParams, CellTypeParams } from '../types';

/** Default control cell type */
export const DEFAULT_CONTROL_CELL: CellTypeParams = {
  name: 'control',
  R_hard: 0.4,
  R_hard_div: 0.7,
  R_soft: 1.2,
  color: { r: 30, g: 100, b: 20 },
  dur_G2: 0.5,
  dur_mitosis: 0.5,
  k_apical_junction: 5.0,
  k_cytos: 5.0,
  max_cytoskeleton_length: 0.0,
  run: 0.0,
  running_speed: 1.0,
  running_mode: 0,
  stiffness_apical_apical: 2.0,
  stiffness_apical_apical_div: 4.0,
  stiffness_nuclei_apical: 3.0,
  stiffness_nuclei_basal: 2.0,
  stiffness_repulsion: 2.0,
  stiffness_straightness: 5.0,
  lifespan: { min: 5.5, max: 6.5 },
  INM: 0.0,
  hetero: false,
  events: {
    time_A: { min: Infinity, max: Infinity },
    time_B: { min: Infinity, max: Infinity },
    time_S: { min: Infinity, max: Infinity },
    time_P: { min: Infinity, max: Infinity },
  },
};

/** Default EMT cell type */
export const DEFAULT_EMT_CELL: CellTypeParams = {
  name: 'emt',
  R_hard: 0.4,
  R_hard_div: 0.7,
  R_soft: 1.2,
  color: { r: 128, g: 0, b: 128 },
  dur_G2: 0.5,
  dur_mitosis: 0.5,
  k_apical_junction: 1.0,
  k_cytos: 5.0,
  max_cytoskeleton_length: 0.0,
  run: 0.0,
  running_speed: 1.0,
  running_mode: 0,
  stiffness_apical_apical: 2.0,
  stiffness_apical_apical_div: 4.0,
  stiffness_nuclei_apical: 3.0,
  stiffness_nuclei_basal: 2.0,
  stiffness_repulsion: 4.0,
  stiffness_straightness: 2.0,
  lifespan: { min: 5.5, max: 6.5 },
  INM: 0.0,
  hetero: true,
  events: {
    time_A: { min: 3, max: 12 },
    time_B: { min: 3, max: 12 },
    time_S: { min: Infinity, max: Infinity },
    time_P: { min: Infinity, max: Infinity },
  },
};

/** Default simulation parameters */
export const DEFAULT_PARAMS: SimulationParams = {
  general: {
    t_end: 48,
    dt: 0.1,
    random_seed: 0,
    full_circle: false,
    N_init: 30,
    N_max: 80,
    N_emt: 5,
    w_init: 80, // ~ N_init * 1.5
    h_init: 5,
    mu: 0.2,
    n_substeps: 30,
    alg_dt: 0.01,
    w_screen: 70,
    h_screen: (70 * 1) / 3,
    p_div_out: 1.0,
    curvature: 0.06,
  },
  cell_prop: {
    apical_junction_init: 0.0,
    max_basal_junction_dist: 2.0,
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
 * Create a deep copy of the default parameters.
 * Useful for creating a fresh parameter set to modify.
 */
export function createDefaultParams(): SimulationParams {
  return JSON.parse(JSON.stringify(DEFAULT_PARAMS));
}
