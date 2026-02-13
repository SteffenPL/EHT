/**
 * Default parameter values for the EHT model.
 */

import { cloneDeep, merge } from 'lodash-es';
import TOML from '@iarna/toml';
import type { EHTParams, EHTCellTypeParams, PartialEHTParams, EventDefinition, SpecialEvent, ParameterChangeEvent } from './types';
import { CellCyclePhase } from './types';
import { ensureV1_1_0 } from './migration-v1.1';
import { ensureV1_2_0 } from './migration-v1.2';
import { ensureV1_3_0 } from './migration-v1.3';

// =============================================================================
// Default Events
// =============================================================================

/** Default events shared across all cell types (in general.default_events) */
const DEFAULT_GLOBAL_EVENTS: EventDefinition[] = [
  {
    type: 'special',
    id: 'default_cell_division',
    name: 'Cell Division',
    start: 0,
    end: Infinity,
    period: 0,
    probability: 'p_div_out',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Division,
    special_name: 'cell_division',
  } as SpecialEvent,
  {
    type: 'parameter_change',
    id: 'default_increase_R_hard',
    name: 'Increase R_hard',
    start: 0,
    end: Infinity,
    period: 0.1,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    target_parameter: 'R_hard',
    formula: 'old_value + 0.01 * dt',
  } as ParameterChangeEvent,
  {
    type: 'parameter_change',
    id: 'inm_contract_apical',
    name: 'INM: Contract Apical',
    start: 0,
    end: 0,
    period: 0,
    probability: 'INM',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.G2,
    target_parameter: 'apical_cytos_strain',
    formula: '-1',
  } as ParameterChangeEvent,
  {
    type: 'parameter_change',
    id: 'inm_extend_basal',
    name: 'INM: Extend Basal',
    start: 0,
    end: 0,
    period: 0,
    probability: '1',
    prereq: 'inm_contract_apical',
    cell_cycle_phase: CellCyclePhase.G2,
    target_parameter: 'basal_cytos_strain',
    formula: '2',
  } as ParameterChangeEvent,
];

/** Per-cell-type events for control cells (none) */
const DEFAULT_CONTROL_EVENTS_V2: EventDefinition[] = [];

/** Per-cell-type events for EMT cells (lose apical/basal adhesion with stiffness reduction) */
const DEFAULT_EMT_EVENTS_V2: EventDefinition[] = [
  {
    type: 'special',
    id: 'lose_apical',
    name: 'Lose Apical Adhesion',
    start: 3,
    end: 12,
    period: 0,
    probability: '0.7', // hetero = true means 30% skip
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    special_name: 'lose_apical_adhesion',
  },
  {
    type: 'parameter_change',
    id: 'reduce_apical_stiffness',
    name: 'Reduce Apical Stiffness',
    start: 3,
    end: 12,
    period: 0,
    probability: '1',
    prereq: 'lose_apical',
    cell_cycle_phase: CellCyclePhase.Any,
    target_parameter: 'stiffness_nuclei_apical',
    formula: 'old_value * 0.1',
  },
  {
    type: 'special',
    id: 'lose_basal',
    name: 'Lose Basal Adhesion',
    start: 3,
    end: 12,
    period: 0,
    probability: '0.7',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    special_name: 'lose_basal_adhesion',
  },
  {
    type: 'parameter_change',
    id: 'reduce_basal_stiffness',
    name: 'Reduce Basal Stiffness',
    start: 3,
    end: 12,
    period: 0,
    probability: '1',
    prereq: 'lose_basal',
    cell_cycle_phase: CellCyclePhase.Any,
    target_parameter: 'stiffness_nuclei_basal',
    formula: 'old_value * 0.1',
  },
];

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
    time_AC_start: Infinity,
    time_AC_end: Infinity,
  },
  events_v2: DEFAULT_CONTROL_EVENTS_V2,
  apical_cytos_strain_init: 0,
  basal_cytos_strain_init: 0,
  skip_default_events: [],
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
    time_AC_start: Infinity,
    time_AC_end: Infinity,
  },
  events_v2: DEFAULT_EMT_EVENTS_V2,
  apical_cytos_strain_init: 0,
  basal_cytos_strain_init: 0,
  skip_default_events: [],
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
    version: '1.3.0',
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
    default_events: DEFAULT_GLOBAL_EVENTS,
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
 * Also applies v1.0.0 to v1.1.0 migration if needed.
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

  // Apply migration chain: v1.0.0 → v1.1.0 → v1.2.0 → v1.3.0
  return ensureV1_3_0(ensureV1_2_0(ensureV1_1_0(base)));
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

// =============================================================================
// Default Event Presets for v1.2.0
// =============================================================================

/** Preset default events that can be quickly added to general.default_events */
export const DEFAULT_EVENT_PRESETS: Record<string, EventDefinition> = {
  cell_division: {
    type: 'special',
    id: 'default_cell_division',
    name: 'Cell Division',
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Division,
    special_name: 'cell_division',
  } as SpecialEvent,
  increase_R_hard: {
    type: 'parameter_change',
    id: 'default_increase_R_hard',
    name: 'Increase R_hard',
    start: 0,
    end: Infinity,
    period: 0.1,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    target_parameter: 'R_hard',
    formula: 'old_value + 0.01 * dt',
  } as ParameterChangeEvent,
  change_apical_strain: {
    type: 'parameter_change',
    id: 'default_change_apical_strain',
    name: 'Change Apical Strain',
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    target_parameter: 'apical_cytos_strain',
    formula: '-1',
  } as ParameterChangeEvent,
  change_basal_strain: {
    type: 'parameter_change',
    id: 'default_change_basal_strain',
    name: 'Change Basal Strain',
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    target_parameter: 'basal_cytos_strain',
    formula: '-1',
  } as ParameterChangeEvent,
  inm_contract_apical: {
    type: 'parameter_change',
    id: 'inm_contract_apical',
    name: 'INM: Contract Apical',
    start: 0,
    end: 0,
    period: 0,
    probability: 'INM',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.G2,
    target_parameter: 'apical_cytos_strain',
    formula: '-1',
  } as ParameterChangeEvent,
  inm_extend_basal: {
    type: 'parameter_change',
    id: 'inm_extend_basal',
    name: 'INM: Extend Basal',
    start: 0,
    end: 0,
    period: 0,
    probability: '1',
    prereq: 'inm_contract_apical',
    cell_cycle_phase: CellCyclePhase.G2,
    target_parameter: 'basal_cytos_strain',
    formula: '2',
  } as ParameterChangeEvent,
};

// Legacy exports for backwards compatibility
export const DEFAULT_PARAMS = DEFAULT_EHT_PARAMS;
export const PARAM_PRESETS = EHT_PRESETS;
export const createDefaultParams = createDefaultEHTParams;
