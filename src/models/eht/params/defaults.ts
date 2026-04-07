/**
 * Default parameter values for the EHT model.
 */

import { cloneDeep, merge } from 'lodash-es';
import TOML from '@iarna/toml';
import { restoreInfinityValues } from '@/core/params/toml';
import type { EHTParams, EHTCellTypeParams, PartialEHTParams, EventDefinition, SpecialEvent, ParameterChangeEvent } from './types';
import { CellCyclePhase } from './types';
import { ensureV1_1_0 } from './migration-v1.1';
import { ensureV1_2_0 } from './migration-v1.2';
import { ensureV1_3_0 } from './migration-v1.3';
import { ensureV1_4_0 } from './migration-v1.4';
import { ensureV1_5_0 } from './migration-v1.5';

// =============================================================================
// Default Events
// =============================================================================

/** Default events shared across all cell types (in general.default_events) */
const DEFAULT_GLOBAL_EVENTS: EventDefinition[] = [
  {
    type: 'special',
    id: 'default_cell_division',
    start: 0,
    end: Infinity,
    period: 0,
    probability: 'p_div_out',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Division,
    special_name: 'cell_division',
  } as SpecialEvent,
  {
    type: 'special',
    id: 'default_cell_cycle_reset',
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Division,
    special_name: 'cell_cycle_reset',
  } as SpecialEvent,
  {
    type: 'parameter_change',
    id: 'default_stiffness_apical_apical_g2',
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.G2,
    target_parameter: 'stiffness_apical_apical',
    formula: 'stiffness_apical_apical_div',
  } as ParameterChangeEvent,
  {
    type: 'parameter_change',
    id: 'default_R_hard_mitosis',
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Mitosis,
    target_parameter: 'R_hard',
    formula: 'R_hard_div',
  } as ParameterChangeEvent,
  {
    type: 'parameter_change',
    id: 'inm_contract_apical',
    start: 0,
    end: Infinity,
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
    start: 0,
    end: Infinity,
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

/** Per-cell-type events for EMT cells (lose apical/basal adhesion) */
const DEFAULT_EMT_EVENTS_V2: EventDefinition[] = [
  {
    type: 'special',
    id: 'lose_apical',
    start: 3,
    end: Infinity,
    period: 0,
    probability: '0.7', // hetero = true means 30% skip
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    special_name: 'lose_apical_adhesion',
  },
  {
    type: 'special',
    id: 'lose_basal',
    start: 3,
    end: Infinity,
    period: 0,
    probability: '0.7',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    special_name: 'lose_basal_adhesion',
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
  external_force: "0",
  formulas: {},
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
  skip_default_events: ['default_cell_division'],
  // Per-cell-type properties
  diffusion: 0.2,
  basal_damping_ratio: 1.0,
  max_basal_junction_dist: 4.0,
  cytos_init: 0.0,
  basal_membrane_repulsion: 0.0,
  apical_junction_init: 0.0,
  external_force: "0",
  formulas: {},
};

/** Default EHT simulation parameters */
export const DEFAULT_EHT_PARAMS: EHTParams = {
  metadata: {
    model: 'EHT',
    version: '1.5.0',
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
    global_events: [],
    formulas: {},
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
  group: string; // folder path relative to presets/, empty for root
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

  // Detect input version for migration-aware merging
  const presetVersion = partial.metadata?.version ?? '1.0.0';

  // Strip fields from defaults that only exist in later versions,
  // so the migration chain can add them properly
  if (presetVersion < '1.2.0') {
    delete (base.general as unknown as Record<string, unknown>).default_events;
  }

  // Merge cell types - each cell type gets merged with DEFAULT_CONTROL_CELL
  if (partial.cell_types) {
    // Remove default cell types not present in the preset
    for (const typeName of Object.keys(base.cell_types)) {
      if (!(typeName in partial.cell_types)) {
        delete base.cell_types[typeName];
      }
    }
    for (const [typeName, typeParams] of Object.entries(partial.cell_types)) {
      if (typeParams) {
        // Use existing cell type as base if it exists, otherwise use DEFAULT_CONTROL_CELL
        const baseType = base.cell_types[typeName] ?? cloneDeep(DEFAULT_CONTROL_CELL);
        // For pre-v1.1.0 presets, remove events_v2 and skip_default_events from the base
        // so migration can convert the legacy v1 events properly
        if (presetVersion < '1.1.0') {
          delete (baseType as unknown as Record<string, unknown>).events_v2;
          delete (baseType as unknown as Record<string, unknown>).skip_default_events;
        }
        base.cell_types[typeName] = merge(baseType, typeParams);
      }
    }
  }

  // Apply migration chain: v1.0.0 → v1.1.0 → v1.2.0 → v1.3.0 → v1.4.0 → v1.5.0
  return ensureV1_5_0(ensureV1_4_0(ensureV1_3_0(ensureV1_2_0(ensureV1_1_0(base)))));
}

// Load all TOML presets at build time using Vite's import.meta.glob
// This MUST be at module level (not inside a function) for Vite to transform it
// In non-Vite environments (Node.js CLI, tests), this will be an empty object
let presetModules: Record<string, string> = {};
try {
  presetModules = import.meta.glob('./presets/**/*.toml', {
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
    // Extract group from folder path: ./presets/eric/subfolder/file.toml → eric/subfolder
    const relativePath = path.replace(/^\.\/presets\//, '');
    const parts = relativePath.split('/');
    const filename = parts.pop()?.replace('.toml', '') ?? '';
    const group = parts.join('/'); // empty for root-level presets
    const key = (group ? group + '/' : '') + filename.replace(/-/g, '_').replace(/\s+/g, '_');

    try {
      const parsed = restoreInfinityValues(TOML.parse(raw)) as { label?: string } & PartialEHTParams;
      const label = parsed.label ?? filename;
      // Remove label from params (it's metadata, not a param)
      delete (parsed as Record<string, unknown>).label;

      presets.push({ key, label, group, params: parsed });
    } catch (e) {
      console.error(`Failed to parse preset ${path}:`, e);
    }
  }

  // Sort by group then label for consistent ordering
  return presets.sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
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
  group: string;
  create: () => EHTParams;
}> = [
  {
    key: 'default',
    label: 'Default',
    group: '',
    create: () => cloneDeep(DEFAULT_EHT_PARAMS),
  },
  ...loadedPresets.map(preset => ({
    key: preset.key,
    label: preset.label,
    group: preset.group,
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
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Division,
    special_name: 'cell_division',
  } as SpecialEvent,
  cell_cycle_reset: {
    type: 'special',
    id: 'default_cell_cycle_reset',
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Division,
    special_name: 'cell_cycle_reset',
  } as SpecialEvent,
  change_apical_strain: {
    type: 'parameter_change',
    id: 'default_change_apical_strain',
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
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    target_parameter: 'basal_cytos_strain',
    formula: '-1',
  } as ParameterChangeEvent,
  stiffness_apical_apical_g2: {
    type: 'parameter_change',
    id: 'default_stiffness_apical_apical_g2',
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.G2,
    target_parameter: 'stiffness_apical_apical',
    formula: 'stiffness_apical_apical_div',
  } as ParameterChangeEvent,
  R_hard_mitosis: {
    type: 'parameter_change',
    id: 'default_R_hard_mitosis',
    start: 0,
    end: Infinity,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Mitosis,
    target_parameter: 'R_hard',
    formula: 'R_hard_div',
  } as ParameterChangeEvent,
  inm_contract_apical: {
    type: 'parameter_change',
    id: 'inm_contract_apical',
    start: 0,
    end: Infinity,
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
    start: 0,
    end: Infinity,
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
