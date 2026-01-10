/**
 * New simplified parameter types for all models (v2 format).
 * Flat structure with sensible defaults and inheritance.
 */

// =============================================================================
// Common Types
// =============================================================================

/** Running mode for cell movement */
export type RunningMode = 'none' | 'after_extrusion' | 'retain_length' | 'immediate';

/** Boundary condition type */
export type BoundaryType = 'box' | 'periodic' | 'none';

/** EMT event timing: [start, end] range or "never" */
export type EventTiming = [number, number] | 'never';

/** Cell spawn location */
export type CellLocation = 'top' | 'bottom' | 'random' | '' | number;

// =============================================================================
// Base Parameters (shared by all models)
// =============================================================================

export interface BaseParams {
  /** Model identifier */
  model: string;

  /** Simulation end time */
  t_end: number;

  /** Time step */
  dt: number;

  /** Random seed for reproducibility */
  seed: number;

  /** Number of substeps per dt */
  substeps: number;

  /** Display width (optional) */
  view_width?: number;

  /** Display height (optional) */
  view_height?: number;
}

// =============================================================================
// EHT Model Parameters
// =============================================================================

/** EHT cell type parameters */
export interface EHTCellParams {
  /** Initial number of cells of this type */
  count: number;

  /** Spawn location: "top", "bottom", "random", "", or numeric [-1, 1] */
  location: CellLocation;

  /** Hex color string "#RRGGBB" */
  color: string;

  // Geometry
  /** Hard sphere radius */
  radius_hard: number;
  /** Hard sphere radius during division */
  radius_hard_div: number;
  /** Soft interaction radius */
  radius_soft: number;

  // Cell cycle
  /** [min, max] lifespan range for division timing */
  lifespan: [number, number];
  /** G2 phase duration */
  g2_duration: number;
  /** Mitosis duration */
  mitosis_duration: number;

  // Stiffness (spring constants)
  /** Apical-apical spring stiffness */
  k_apical: number;
  /** Apical-apical spring stiffness during division */
  k_apical_div: number;
  /** Nucleus-apical spring stiffness */
  k_nuclei_apical: number;
  /** Nucleus-basal spring stiffness */
  k_nuclei_basal: number;
  /** Repulsion stiffness */
  k_repulsion: number;
  /** Straightness constraint stiffness */
  k_straightness: number;
  /** Apical junction spring constant */
  k_junction: number;
  /** Cytoskeleton relaxation rate */
  k_cytoskeleton: number;

  // Movement
  /** Probability of running behavior [0,1] */
  p_running: number;
  /** Running speed */
  running_speed: number;
  /** Running mode */
  running_mode: RunningMode;

  // Interkinetic Nuclear Migration
  /** Probability of INM being active [0,1] */
  p_inm: number;

  // EMT events: [start, end] or "never"
  /** Time window to lose apical adhesion */
  emt_lose_apical: EventTiming;
  /** Time window to lose basal adhesion */
  emt_lose_basal: EventTiming;
  /** Time window to lose straightness constraint */
  emt_lose_straightness: EventTiming;
  /** Time window to start polarized running */
  emt_polarized_running: EventTiming;

  /** Heterogeneous EMT (each cell samples own event times) */
  heterogeneous: boolean;

  // Other physical properties
  /** Diffusion coefficient */
  diffusion: number;
  /** Basal damping ratio */
  basal_damping: number;
  /** Maximum basal junction distance */
  max_basal_junction_dist: number;
  /** Initial cytoskeleton length */
  cytoskeleton_init: number;
  /** Basal membrane repulsion strength */
  basal_membrane_repulsion: number;
  /** Initial apical junction distance */
  apical_junction_init: number;
  /** Maximum cytoskeleton length (0 = no limit) */
  max_cytoskeleton_length: number;
}

/** EHT cell types map with optional default for inheritance */
export interface EHTCellsConfig {
  /** Default values inherited by all cell types */
  default?: Partial<EHTCellParams>;
  /** Control cells */
  control?: Partial<EHTCellParams>;
  /** EMT cells */
  emt?: Partial<EHTCellParams>;
  /** Allow additional cell types */
  [key: string]: Partial<EHTCellParams> | undefined;
}

/** Complete EHT parameters (new flat format) */
export interface EHTParamsV2 extends BaseParams {
  model: 'EHT';

  /** Algorithm time step */
  alg_dt: number;

  // Tissue geometry
  /** Initial tissue width (cell units) */
  tissue_width: number;
  /** Initial tissue height (cell units) */
  tissue_height: number;
  /** Ellipse perimeter in microns (0 = straight line) */
  perimeter: number;
  /** Ellipse aspect ratio: b/a (0=line, 1=circle) */
  aspect_ratio: number;
  /** Close tissue into a ring */
  full_circle: boolean;

  // Physics
  /** Friction coefficient */
  friction: number;

  // Division
  /** Probability that division produces one offspring in 2D slice */
  p_division_in_plane: number;

  /** Use hard sphere radius for nuclei spring rest length */
  hard_sphere_nuclei: boolean;

  /** Cell type configurations */
  cells: EHTCellsConfig;
}

// =============================================================================
// Toy Model Parameters
// =============================================================================

/** Complete Toy parameters (new flat format) */
export interface ToyParamsV2 extends BaseParams {
  model: 'Toy';

  // Domain
  /** Domain dimensions [width, height] */
  domain: [number, number];
  /** Boundary type */
  boundary: BoundaryType;

  // Cells
  /** Number of cells */
  count: number;
  /** Cell radius (soft) */
  radius: number;
  /** Repulsion strength */
  repulsion: number;
  /** Friction coefficient */
  friction: number;

  // Run-and-tumble dynamics
  /** Running speed */
  running_speed: number;
  /** Tumbling speed */
  tumble_speed: number;
  /** Running phase duration */
  running_duration: number;
  /** Tumbling phase duration */
  tumbling_duration: number;
  /** Time between polarity changes during tumbling */
  tumbling_period: number;
}

// =============================================================================
// Batch Configuration
// =============================================================================

/** Parameter sweep definition */
export interface ParamSweep {
  /** Parameter path (e.g., "cells.emt.count" or "friction") */
  param: string;
  /** Explicit values to sweep */
  values?: (number | string | boolean)[];
  /** Range [min, max] for numeric sweep */
  range?: [number, number];
  /** Number of steps for range sweep */
  steps?: number;
}

/** Batch configuration */
export interface BatchConfigV2 {
  /** Number of random seeds per parameter combination */
  seeds?: number;
  /** Sample interval (hours) */
  sample_interval?: number;
  /** Explicit sample times */
  sample_times?: number[];
  /** Parameter sweeps */
  sweep?: ParamSweep[];
}

// =============================================================================
// Union Types
// =============================================================================

/** Any model's parameters (new format) */
export type ModelParamsV2 = EHTParamsV2 | ToyParamsV2;

/** Partial params for loading (deep partial) */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PartialEHTParamsV2 = DeepPartial<EHTParamsV2>;
export type PartialToyParamsV2 = DeepPartial<ToyParamsV2>;
