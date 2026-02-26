/**
 * EHT model parameter type definitions.
 * Defines the specific parameter structure for the EHT (Epithelial-to-Hematopoietic Transition) model.
 */

import type { ParamsMetadata, RGBColor, Range, BaseSimulationParams } from '@/core/registry/types';

// Re-export shared types for convenience
export type { RGBColor, Range };

// =============================================================================
// New Event System (v1.1.0)
// =============================================================================

/** Cell cycle phase for event triggering requirements */
export enum CellCyclePhase {
  Any = 'any',
  Birth = 'birth',
  G1 = 'g1',
  G2 = 'g2',
  Mitosis = 'mitosis',
  Division = 'division',
}

/** Special event names (hard-coded functions) */
export type SpecialEventName =
  | 'lose_apical_adhesion'
  | 'lose_basal_adhesion'
  | 'apical_constriction'
  | 'start_running'
  | 'cell_division'
  | 'cell_cycle_reset';

/** Base properties shared by all event types */
export interface BaseEventDefinition {
  /** Unique identifier (used for prerequisites) */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Earliest time event can occur */
  start: number;
  /** Latest time event can occur */
  end: number;
  /** Repeat interval (0 = one-time event) */
  period: number;
  /** Probability formula - evaluated at cell birth (0-1). Variables: p_div_out, mu, etc. */
  probability: string;
  /** Required event ID that must fire first (same cell only) */
  prereq: string | null;
  /** Cell must have reached this phase */
  cell_cycle_phase: CellCyclePhase;
}

/** Parameter change event - updates a cell parameter using a math.js formula */
export interface ParameterChangeEvent extends BaseEventDefinition {
  type: 'parameter_change';
  /** Target parameter path (e.g., 'stiffness_nuclei_apical') */
  target_parameter: string;
  /** math.js formula - variables: old_value, t, dt, period */
  formula: string;
}

/** Special event - hard-coded functions selected by name */
export interface SpecialEvent extends BaseEventDefinition {
  type: 'special';
  /** The special event function name */
  special_name: SpecialEventName;
}

/** Union type for all event definitions */
export type EventDefinition = ParameterChangeEvent | SpecialEvent;

// =============================================================================
// Legacy Event System (v1.0.0 - kept for backwards compatibility)
// =============================================================================

/** EMT event timing configuration (legacy v1.0.0 format) */
export interface EMTEventTimes {
  time_A_start: number; // Time to lose apical adhesion (start)
  time_A_end: number;   // Time to lose apical adhesion (end)
  time_B_start: number; // Time to lose basal adhesion (start)
  time_B_end: number;   // Time to lose basal adhesion (end)
  time_S_start: number; // Time to lose straightness (start)
  time_S_end: number;   // Time to lose straightness (end)
  time_P_start: number; // Time to start polarized running (start)
  time_P_end: number;   // Time to start polarized running (end)
  time_AC_start: number; // Time for apical constriction (start)
  time_AC_end: number;   // Time for apical constriction (end)
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
  hetero: boolean;          // Heterogeneous EMT behavior (legacy v1.0.0)
  events: EMTEventTimes;    // Legacy v1.0.0 event timing
  events_v2?: EventDefinition[];  // New v1.1.0 event system
  // Strain initial values (v1.2.0)
  apical_cytos_strain_init: number;
  basal_cytos_strain_init: number;
  skip_default_events: string[];  // IDs of default events to skip for this cell type
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
  hard_sphere_nuclei: boolean; // If true, use R_hard instead of R_soft for nuclei spring rest length
  default_events: EventDefinition[]; // Default events applied to all cell types (v1.2.0)
}

/** Cell property parameters (legacy - kept empty for backwards compatibility) */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EHTCellPropertyParams {
  // All properties moved to per-cell-type in EHTCellTypeParams
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
