/**
 * Default parameter values for the new flat format (v2).
 */

import type {
  EHTParamsV2,
  EHTCellParams,
  ToyParamsV2,
  RunningMode,
} from './types';

// =============================================================================
// EHT Defaults
// =============================================================================

/** Default EHT cell parameters */
export const DEFAULT_EHT_CELL: EHTCellParams = {
  count: 0,
  location: '',
  color: '#1E6414', // Dark green

  // Geometry
  radius_hard: 0.4,
  radius_hard_div: 0.7,
  radius_soft: 1.2,

  // Cell cycle
  lifespan: [5.5, 6.5],
  g2_duration: 0.5,
  mitosis_duration: 0.5,

  // Stiffness
  k_apical: 5.0,
  k_apical_div: 10.0,
  k_nuclei_apical: 3.0,
  k_nuclei_basal: 2.0,
  k_repulsion: 2.0,
  k_straightness: 5.0,
  k_junction: 5.0,
  k_cytoskeleton: 5.0,

  // Movement
  p_running: 0.0,
  running_speed: 1.0,
  running_mode: 'none' as RunningMode,

  // INM
  p_inm: 0.0,

  // EMT events
  emt_lose_apical: 'never',
  emt_lose_basal: 'never',
  emt_lose_straightness: 'never',
  emt_polarized_running: 'never',

  // Other
  heterogeneous: false,
  diffusion: 0.1,
  basal_damping: 1.0,
  max_basal_junction_dist: 0.33,
  cytoskeleton_init: 1.5,
  basal_membrane_repulsion: 0.0,
  apical_junction_init: 0.33,
  max_cytoskeleton_length: 0.0,
};

/** Default EHT parameters */
export const DEFAULT_EHT_PARAMS_V2: EHTParamsV2 = {
  model: 'EHT',

  // Simulation
  t_end: 48.0,
  dt: 0.1,
  seed: 42,
  substeps: 30,
  alg_dt: 0.05,

  // Geometry
  tissue_width: 10,
  tissue_height: 5,
  perimeter: 105,
  aspect_ratio: 1.0,
  full_circle: true,

  // Physics
  friction: 0.2,
  p_division_in_plane: 1.0,
  hard_sphere_nuclei: false,

  // Display
  view_width: 50,
  view_height: 25,

  // Cell types
  cells: {
    default: { ...DEFAULT_EHT_CELL },
    control: {
      count: 25,
      color: '#1E6414',
    },
    emt: {
      count: 0,
      location: 'bottom',
      color: '#800080', // Purple
    },
  },
};

// =============================================================================
// Toy Defaults
// =============================================================================

/** Default Toy parameters */
export const DEFAULT_TOY_PARAMS_V2: ToyParamsV2 = {
  model: 'Toy',

  // Simulation
  t_end: 60.0,
  dt: 0.1,
  seed: 42,
  substeps: 1,

  // Domain
  domain: [100, 100],
  boundary: 'box',

  // Cells
  count: 20,
  radius: 5.0,
  repulsion: 10.0,
  friction: 1.0,

  // Run-and-tumble
  running_speed: 2.0,
  tumble_speed: 0.5,
  running_duration: 5.0,
  tumbling_duration: 2.0,
  tumbling_period: 0.5,

  // Display
  view_width: 100,
  view_height: 100,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Resolve a cell type's parameters by merging with defaults.
 */
export function resolveEHTCellParams(
  cellType: Partial<EHTCellParams> | undefined,
  defaults: Partial<EHTCellParams> | undefined
): EHTCellParams {
  return {
    ...DEFAULT_EHT_CELL,
    ...defaults,
    ...cellType,
  };
}

/**
 * Get all cell type names from params (excluding 'default').
 */
export function getCellTypeNames(params: EHTParamsV2): string[] {
  return Object.keys(params.cells).filter((k) => k !== 'default');
}

/**
 * Get resolved cell params for a specific type.
 */
export function getResolvedCellParams(
  params: EHTParamsV2,
  cellType: string
): EHTCellParams {
  return resolveEHTCellParams(
    params.cells[cellType],
    params.cells.default
  );
}
