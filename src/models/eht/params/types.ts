/**
 * EHT model parameter type definitions.
 * Defines the specific parameter structure for the EHT (Epithelial-to-Hematopoietic Transition) model.
 */

import type { ParamsMetadata, RGBColor, Range, BaseSimulationParams } from '@/core/registry/types';

// Re-export shared types for convenience
export type { RGBColor, Range };

/** EMT event timing configuration */
export interface EMTEventTimes {
  time_A_start: number; // Time to lose apical adhesion (start)
  time_A_end: number;   // Time to lose apical adhesion (end)
  time_B_start: number; // Time to lose basal adhesion (start)
  time_B_end: number;   // Time to lose basal adhesion (end)
  time_S_start: number; // Time to lose straightness (start)
  time_S_end: number;   // Time to lose straightness (end)
  time_P_start: number; // Time to start polarized running (start)
  time_P_end: number;   // Time to start polarized running (end)
}

/** Cell type definition - defines the properties of a cell type (e.g., control, emt) */
export interface EHTCellTypeParams {
  N_init: number;           // Initial number of cells of this type
  location: string;         // Optional predefined location along the basal membrane, "top", "bottom", "rest" or numeric value in [-1, 1]
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
  lifespan_start: number;
  lifespan_end: number;
  INM: number;              // Interkinetic nuclear migration probability
  hetero: boolean;          // Heterogeneous EMT behavior
  events: EMTEventTimes;
  // Per-cell-type properties (previously global in cell_prop)
  diffusion: number;                // Diffusion coefficient
  basal_damping_ratio: number;      // Basal damping ratio
  max_basal_junction_dist: number;  // Maximum basal junction distance
  cytos_init: number;               // Initial cytoskeleton length
  basal_membrane_repulsion: number; // Basal membrane repulsion strength
  apical_junction_init: number;     // Initial apical junction distance
}

/** EHT general simulation parameters */
export interface EHTGeneralParams {
  t_end: number;            // End time
  dt: number;               // Time step
  random_seed: number;      // Random seed for reproducibility
  full_circle: boolean;     // If true: compute w_init from curvature and close initial connections
  w_init: number;           // Initial tissue width
  h_init: number;           // Initial tissue height
  mu: number;               // Friction coefficient
  n_substeps: number;       // Number of substeps per timestep
  alg_dt: number;           // Algorithm time step
  w_screen: number;         // Screen width (visualization)
  h_screen: number;         // Screen height (visualization)
  p_div_out: number;        // Probability of division producing one offspring
  perimeter: number;        // Ellipse perimeter (0 for straight line)
  aspect_ratio: number;     // Shape: 0=line, >0=curve above, <0=curve below; |aspect|=b/a
}

/** Cell property parameters (shared properties across cell types) */
export interface EHTCellPropertyParams {
  apical_junction_init: number;
  max_basal_junction_dist: number;
  basal_daming_ratio: number;
  basal_membrane_repulsion: number;
  cytos_init: number;
  diffusion: number;
}

/** Cell types map - allows any cell types */
export type EHTCellTypesMap = Record<string, EHTCellTypeParams>;

/** Complete EHT simulation parameters */
export interface EHTParams extends BaseSimulationParams {
  metadata: ParamsMetadata;
  general: EHTGeneralParams;
  cell_prop: EHTCellPropertyParams;
  cell_types: EHTCellTypesMap;
}

/** Deep partial type for EHT params input */
export type PartialEHTParams = {
  metadata?: Partial<ParamsMetadata>;
  general?: Partial<EHTGeneralParams>;
  cell_prop?: Partial<EHTCellPropertyParams>;
  cell_types?: {
    control?: Partial<EHTCellTypeParams>;
    emt?: Partial<EHTCellTypeParams>;
    [key: string]: Partial<EHTCellTypeParams> | undefined;
  };
};

// Legacy type aliases for backwards compatibility
export type CellTypeParams = EHTCellTypeParams;
export type GeneralParams = EHTGeneralParams;
export type CellPropertyParams = EHTCellPropertyParams;
export type CellTypesMap = EHTCellTypesMap;
export type SimulationParams = EHTParams;
