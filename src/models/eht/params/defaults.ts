/**
 * Default parameter values for the EHT model.
 */

import { cloneDeep, merge } from 'lodash-es';
import TOML from '@iarna/toml';
import type { EHTParams, EHTCellTypeParams, PartialEHTParams } from './types';

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
  // Per-cell-type properties
  diffusion: 0.2,
  basal_damping_ratio: 1.0,
  max_basal_junction_dist: 4.0,
  cytos_init: 0.0,
  basal_membrane_repulsion: 0.0,
  apical_junction_init: 0.0,
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
  // Per-cell-type properties
  diffusion: 0.2,
  basal_damping_ratio: 1.0,
  max_basal_junction_dist: 4.0,
  cytos_init: 0.0,
  basal_membrane_repulsion: 0.0,
  apical_junction_init: 0.0,
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
    hard_sphere_nuclei: true,
  },
  cell_prop: {
    // All properties moved to per-cell-type in cell_types
  },
  cell_types: {
    control: DEFAULT_CONTROL_CELL,
    emt: DEFAULT_EMT_CELL,
  },
};

/**
 * Create a deep copy of the default EHT parameters.
 * Useful for creating a fresh parameter set to modify.
 * Note: Uses structuredClone to preserve Infinity values.
 */
export function createDefaultEHTParams(): EHTParams {
  return cloneDeep(DEFAULT_EHT_PARAMS);
}

// --- TOML Preset Loading ---

interface PresetMeta {
  key: string;
  label: string;
  params: PartialEHTParams;
}

/**
 * Deep merge partial params with defaults, ensuring all cell types get proper defaults.
 */
function mergePresetWithDefaults(partial: PartialEHTParams): EHTParams {
  const base = cloneDeep(DEFAULT_EHT_PARAMS);

  // Merge general params
  if (partial.general) {
    base.general = { ...base.general, ...partial.general };
  }

  // Merge metadata
  if (partial.metadata) {
    base.metadata = { ...base.metadata, ...partial.metadata };
  }

  // Merge cell types - each cell type gets merged with DEFAULT_CONTROL_CELL
  if (partial.cell_types) {
    for (const [typeName, typeParams] of Object.entries(partial.cell_types)) {
      if (typeParams) {
        // Use existing cell type as base if it exists, otherwise use DEFAULT_CONTROL_CELL
        const baseType = base.cell_types[typeName] ?? cloneDeep(DEFAULT_CONTROL_CELL);
        base.cell_types[typeName] = merge(baseType, typeParams);
      }
    }
  }

  return base;
}

// Load all TOML presets at build time using Vite's import.meta.glob
// This MUST be at module level (not inside a function) for Vite to transform it
// In non-Vite environments (Node.js CLI, tests), this will be an empty object
let presetModules: Record<string, string> = {};
try {
  presetModules = import.meta.glob('./presets/*.toml', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>;
} catch {
  // In Node.js environments, import.meta.glob doesn't exist
  presetModules = {};
}

/**
 * Parse all TOML preset files and return preset metadata.
 */
function parsePresets(): PresetMeta[] {
  const presets: PresetMeta[] = [];

  for (const [path, raw] of Object.entries(presetModules)) {
    // Extract key from filename: ./presets/chick-embryo-control.toml → chick_embryo_control
    const filename = path.split('/').pop()?.replace('.toml', '') ?? '';
    const key = filename.replace(/-/g, '_');

    try {
      const parsed = TOML.parse(raw) as { label?: string } & PartialEHTParams;
      const label = parsed.label ?? filename;
      // Remove label from params (it's metadata, not a param)
      delete (parsed as Record<string, unknown>).label;

      presets.push({ key, label, params: parsed });
    } catch (e) {
      console.error(`Failed to parse preset ${path}:`, e);
    }
  }

  // Sort by label for consistent ordering
  return presets.sort((a, b) => a.label.localeCompare(b.label));
}

// Parse presets once at module load time
const loadedPresets = parsePresets();

/**
 * EHT parameter presets.
 * Includes the default preset plus all presets loaded from TOML files.
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
  ...loadedPresets.map(preset => ({
    key: preset.key,
    label: preset.label,
    create: (): EHTParams => mergePresetWithDefaults(preset.params),
  })),
];

// Legacy exports for backwards compatibility
export const DEFAULT_PARAMS = DEFAULT_EHT_PARAMS;
export const PARAM_PRESETS = EHT_PRESETS;
export const createDefaultParams = createDefaultEHTParams;
