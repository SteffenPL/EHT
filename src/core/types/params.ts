/**
 * Core parameter type definitions for the EHT simulator.
 * Based on the original simulation.js params structure.
 */

/** RGB color type */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/** Min/max range for random values */
export interface Range {
  min: number;
  max: number;
}

/** EMT event timing configuration */
export interface EMTEventTimes {
  time_A: Range; // Time to lose apical adhesion
  time_B: Range; // Time to lose basal adhesion
  time_S: Range; // Time to lose straightness
  time_P: Range; // Time to start polarized running
}

/** Cell type definition - defines the properties of a cell type (e.g., control, emt) */
export interface CellTypeParams {
  name: string;
  R_hard: number;           // Hard sphere radius
  R_hard_div: number;       // Hard sphere radius during division
  R_soft: number;           // Soft interaction radius
  color: RGBColor;
  dur_G2: number;           // Duration of G2 phase
  dur_mitosis: number;      // Duration of mitosis
  k_apical_junction: number;  // Apical junction spring constant
  k_cytos: number;          // Cytoskeleton relaxation rate
  max_cytoskeleton_length: number;
  run: number;              // Probability of running behavior
  running_speed: number;
  running_mode: number;     // 0: none, 1: after extrusion, 2: retain length, 3: immediate
  stiffness_apical_apical: number;
  stiffness_apical_apical_div: number;
  stiffness_nuclei_apical: number;
  stiffness_nuclei_basal: number;
  stiffness_repulsion: number;
  stiffness_straightness: number;
  lifespan: Range;
  INM: number;              // Interkinetic nuclear migration probability
  hetero: boolean;          // Heterogeneous EMT behavior
  events: EMTEventTimes;
}

/** General simulation parameters */
export interface GeneralParams {
  t_end: number;            // End time
  dt: number;               // Time step
  random_seed: number;      // Random seed for reproducibility
  N_init: number;           // Initial number of cells
  N_max: number;            // Maximum number of cells
  N_emt: number;            // Number of EMT cells
  w_init: number;           // Initial tissue width
  h_init: number;           // Initial tissue height
  mu: number;               // Friction coefficient
  n_substeps: number;       // Number of substeps per timestep
  alg_dt: number;           // Algorithm time step
  w_screen: number;         // Screen width (visualization)
  h_screen: number;         // Screen height (visualization)
  p_div_out: number;        // Probability of division producing one offspring
  curvature: number;        // Basal membrane curvature
}

/** Cell property parameters (shared properties) */
export interface CellPropertyParams {
  apical_junction_init: number;
  max_basal_junction_dist: number;
  basal_daming_ratio: number;
  basal_membrane_repulsion: number;
  cytos_init: number;
  diffusion: number;
}

/** Cell types map - allows custom cell types */
export interface CellTypesMap {
  control: CellTypeParams;
  emt: CellTypeParams;
  [key: string]: CellTypeParams;
}

/** Complete simulation parameters */
export interface SimulationParams {
  general: GeneralParams;
  cell_prop: CellPropertyParams;
  cell_types: CellTypesMap;
}

/** Deep partial type for user input - allows partial specification of nested objects */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Partial params for loading from TOML (missing fields use defaults) */
export type PartialSimulationParams = DeepPartial<SimulationParams>;
