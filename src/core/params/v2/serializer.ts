/**
 * Serialize v2 params to TOML format.
 */

import type {
  EHTParamsV2,
  ToyParamsV2,
  EHTCellParams,
  EventTiming,
  BatchConfigV2,
} from './types';
import { DEFAULT_EHT_CELL } from './defaults';

// =============================================================================
// TOML Generation Helpers
// =============================================================================

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return value.toFixed(6).replace(/\.?0+$/, '') || '0';
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(', ')}]`;
  }
  return String(value);
}

function formatEventTiming(timing: EventTiming): string {
  if (timing === 'never') {
    return '"never"';
  }
  return `[${timing[0]}, ${timing[1]}]`;
}

// =============================================================================
// EHT Serialization
// =============================================================================

/**
 * Serialize EHT params to v2 TOML string.
 */
export function serializeEHTParamsV2(params: EHTParamsV2): string {
  const lines: string[] = [];

  lines.push(`model = "EHT"`);
  lines.push('');

  // Simulation section
  lines.push('# === Simulation ===');
  lines.push(`t_end = ${formatValue(params.t_end)}`);
  lines.push(`dt = ${formatValue(params.dt)}`);
  lines.push(`seed = ${params.seed}`);
  lines.push(`substeps = ${params.substeps}`);
  lines.push(`alg_dt = ${formatValue(params.alg_dt)}`);
  lines.push('');

  // Geometry section
  lines.push('# === Tissue Geometry ===');
  lines.push(`tissue_width = ${params.tissue_width}`);
  lines.push(`tissue_height = ${params.tissue_height}`);
  lines.push(`perimeter = ${formatValue(params.perimeter)}`);
  lines.push(`aspect_ratio = ${formatValue(params.aspect_ratio)}`);
  lines.push(`full_circle = ${params.full_circle}`);
  lines.push('');

  // Physics section
  lines.push('# === Physics ===');
  lines.push(`friction = ${formatValue(params.friction)}`);
  lines.push(`p_division_in_plane = ${formatValue(params.p_division_in_plane)}`);
  if (params.hard_sphere_nuclei) {
    lines.push(`hard_sphere_nuclei = true`);
  }
  lines.push('');

  // Display section (optional, only if different from defaults)
  if (params.view_width || params.view_height) {
    lines.push('# === Display ===');
    if (params.view_width) lines.push(`view_width = ${formatValue(params.view_width)}`);
    if (params.view_height) lines.push(`view_height = ${formatValue(params.view_height)}`);
    lines.push('');
  }

  // Cell types
  lines.push('# === Cell Types ===');

  // Default cell type (if present)
  if (params.cells.default && Object.keys(params.cells.default).length > 0) {
    lines.push('');
    lines.push('[cells.default]');
    lines.push(...serializeCellParams(params.cells.default, undefined));
  }

  // Other cell types
  for (const [name, cellParams] of Object.entries(params.cells)) {
    if (name === 'default' || !cellParams) continue;

    lines.push('');
    lines.push(`[cells.${name}]`);
    lines.push(...serializeCellParams(cellParams, params.cells.default));
  }

  return lines.join('\n');
}

/**
 * Serialize cell params, only including values different from defaults.
 */
function serializeCellParams(
  cell: Partial<EHTCellParams>,
  defaults?: Partial<EHTCellParams>
): string[] {
  const lines: string[] = [];
  const base = { ...DEFAULT_EHT_CELL, ...defaults };

  // Helper to add line only if different from default
  const addIfDifferent = (key: keyof EHTCellParams, label?: string) => {
    const value = cell[key];
    if (value !== undefined && value !== base[key]) {
      lines.push(`${label ?? key} = ${formatValue(value)}`);
    }
  };

  // Basic properties
  if (cell.count !== undefined) lines.push(`count = ${cell.count}`);
  addIfDifferent('location');
  addIfDifferent('color');

  // Geometry
  addIfDifferent('radius_hard');
  addIfDifferent('radius_hard_div');
  addIfDifferent('radius_soft');

  // Cell cycle
  if (cell.lifespan !== undefined && (cell.lifespan[0] !== base.lifespan[0] || cell.lifespan[1] !== base.lifespan[1])) {
    lines.push(`lifespan = ${formatValue(cell.lifespan)}`);
  }
  addIfDifferent('g2_duration');
  addIfDifferent('mitosis_duration');

  // Stiffness
  addIfDifferent('k_apical');
  addIfDifferent('k_apical_div');
  addIfDifferent('k_nuclei_apical');
  addIfDifferent('k_nuclei_basal');
  addIfDifferent('k_repulsion');
  addIfDifferent('k_straightness');
  addIfDifferent('k_junction');
  addIfDifferent('k_cytoskeleton');

  // Movement
  addIfDifferent('p_running');
  addIfDifferent('running_speed');
  addIfDifferent('running_mode');

  // INM
  addIfDifferent('p_inm');

  // EMT events
  if (cell.emt_lose_apical !== undefined && cell.emt_lose_apical !== 'never') {
    lines.push(`emt_lose_apical = ${formatEventTiming(cell.emt_lose_apical)}`);
  }
  if (cell.emt_lose_basal !== undefined && cell.emt_lose_basal !== 'never') {
    lines.push(`emt_lose_basal = ${formatEventTiming(cell.emt_lose_basal)}`);
  }
  if (cell.emt_lose_straightness !== undefined && cell.emt_lose_straightness !== 'never') {
    lines.push(`emt_lose_straightness = ${formatEventTiming(cell.emt_lose_straightness)}`);
  }
  if (cell.emt_polarized_running !== undefined && cell.emt_polarized_running !== 'never') {
    lines.push(`emt_polarized_running = ${formatEventTiming(cell.emt_polarized_running)}`);
  }

  // Other
  addIfDifferent('heterogeneous');
  addIfDifferent('diffusion');
  addIfDifferent('basal_damping');
  addIfDifferent('max_basal_junction_dist');
  addIfDifferent('cytoskeleton_init');
  addIfDifferent('basal_membrane_repulsion');
  addIfDifferent('apical_junction_init');
  addIfDifferent('max_cytoskeleton_length');

  return lines;
}

// =============================================================================
// Toy Serialization
// =============================================================================

/**
 * Serialize Toy params to v2 TOML string.
 */
export function serializeToyParamsV2(params: ToyParamsV2): string {
  const lines: string[] = [];

  lines.push(`model = "Toy"`);
  lines.push('');

  // Simulation section
  lines.push('# === Simulation ===');
  lines.push(`t_end = ${formatValue(params.t_end)}`);
  lines.push(`dt = ${formatValue(params.dt)}`);
  lines.push(`seed = ${params.seed}`);
  lines.push(`substeps = ${params.substeps}`);
  lines.push('');

  // Domain section
  lines.push('# === Domain ===');
  lines.push(`domain = ${formatValue(params.domain)}`);
  lines.push(`boundary = "${params.boundary}"`);
  lines.push('');

  // Cells section
  lines.push('# === Cells ===');
  lines.push(`count = ${params.count}`);
  lines.push(`radius = ${formatValue(params.radius)}`);
  lines.push(`repulsion = ${formatValue(params.repulsion)}`);
  lines.push(`friction = ${formatValue(params.friction)}`);
  lines.push('');

  // Run-and-tumble section
  lines.push('# === Run-and-Tumble ===');
  lines.push(`running_speed = ${formatValue(params.running_speed)}`);
  lines.push(`tumble_speed = ${formatValue(params.tumble_speed)}`);
  lines.push(`running_duration = ${formatValue(params.running_duration)}`);
  lines.push(`tumbling_duration = ${formatValue(params.tumbling_duration)}`);
  lines.push(`tumbling_period = ${formatValue(params.tumbling_period)}`);

  // Display section (optional)
  if (params.view_width || params.view_height) {
    lines.push('');
    lines.push('# === Display ===');
    if (params.view_width) lines.push(`view_width = ${formatValue(params.view_width)}`);
    if (params.view_height) lines.push(`view_height = ${formatValue(params.view_height)}`);
  }

  return lines.join('\n');
}

// =============================================================================
// Batch Configuration Serialization
// =============================================================================

/**
 * Serialize batch configuration to TOML.
 */
export function serializeBatchConfig(config: BatchConfigV2): string {
  const lines: string[] = [];

  lines.push('[batch]');

  if (config.seeds !== undefined) {
    lines.push(`seeds = ${config.seeds}`);
  }
  if (config.sample_interval !== undefined) {
    lines.push(`sample_interval = ${formatValue(config.sample_interval)}`);
  }
  if (config.sample_times !== undefined) {
    lines.push(`sample_times = ${formatValue(config.sample_times)}`);
  }

  if (config.sweep && config.sweep.length > 0) {
    for (const sweep of config.sweep) {
      lines.push('');
      lines.push('[[batch.sweep]]');
      lines.push(`param = "${sweep.param}"`);
      if (sweep.values !== undefined) {
        lines.push(`values = ${formatValue(sweep.values)}`);
      }
      if (sweep.range !== undefined) {
        lines.push(`range = ${formatValue(sweep.range)}`);
      }
      if (sweep.steps !== undefined) {
        lines.push(`steps = ${sweep.steps}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Serialize params with optional batch config.
 */
export function serializeParamsV2(
  params: EHTParamsV2 | ToyParamsV2,
  batch?: BatchConfigV2
): string {
  let result = params.model === 'EHT'
    ? serializeEHTParamsV2(params as EHTParamsV2)
    : serializeToyParamsV2(params as ToyParamsV2);

  if (batch) {
    result += '\n\n' + serializeBatchConfig(batch);
  }

  return result;
}
