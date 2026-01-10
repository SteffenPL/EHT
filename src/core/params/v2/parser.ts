/**
 * Parser for the new v2 TOML format.
 * Supports both old and new formats with automatic detection.
 */

import TOML from '@iarna/toml';
import type {
  EHTParamsV2,
  ToyParamsV2,
  EHTCellParams,
  EventTiming,
  RunningMode,
  BatchConfigV2,
} from './types';
import {
  DEFAULT_EHT_PARAMS_V2,
  DEFAULT_TOY_PARAMS_V2,
  DEFAULT_EHT_CELL,
} from './defaults';

// =============================================================================
// Format Detection
// =============================================================================

/**
 * Detect if TOML content uses the new v2 format.
 * New format has 'model' at root level, old format has it under [metadata].
 */
export function isV2Format(parsed: Record<string, unknown>): boolean {
  return typeof parsed.model === 'string';
}

// =============================================================================
// Color Parsing
// =============================================================================

/**
 * Parse color from hex string or RGB object.
 */
export function parseColor(
  value: string | { r: number; g: number; b: number } | undefined,
  defaultColor: string
): string {
  if (!value) return defaultColor;

  if (typeof value === 'string') {
    // Already hex format
    if (value.startsWith('#')) return value;
    // Could be rgb(r,g,b) format - convert to hex
    return value;
  }

  // RGB object to hex
  const r = Math.round(value.r).toString(16).padStart(2, '0');
  const g = Math.round(value.g).toString(16).padStart(2, '0');
  const b = Math.round(value.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Convert hex color to RGB object.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// =============================================================================
// Event Timing Parsing
// =============================================================================

/**
 * Parse event timing from various formats.
 */
export function parseEventTiming(
  value: unknown
): EventTiming {
  if (value === 'never' || value === undefined || value === null) {
    return 'never';
  }

  if (Array.isArray(value) && value.length === 2) {
    return [Number(value[0]), Number(value[1])];
  }

  // Handle old format with _start/_end
  if (typeof value === 'number') {
    // Single number means Infinity (never)
    if (value >= 1e100) return 'never';
    return [value, value]; // Same start/end
  }

  return 'never';
}

/**
 * Parse event timing from old format start/end values.
 */
export function parseEventTimingFromStartEnd(
  start: number | undefined,
  end: number | undefined
): EventTiming {
  if (start === undefined || end === undefined) return 'never';
  if (start >= 1e100 || end >= 1e100) return 'never';
  return [start, end];
}

/**
 * Convert EventTiming to old format start/end values.
 */
export function eventTimingToStartEnd(
  timing: EventTiming
): { start: number; end: number } {
  if (timing === 'never') {
    return { start: Infinity, end: Infinity };
  }
  return { start: timing[0], end: timing[1] };
}

// =============================================================================
// Running Mode Parsing
// =============================================================================

const RUNNING_MODE_MAP: Record<number, RunningMode> = {
  0: 'none',
  1: 'after_extrusion',
  2: 'retain_length',
  3: 'immediate',
};

const RUNNING_MODE_REVERSE: Record<RunningMode, number> = {
  'none': 0,
  'after_extrusion': 1,
  'retain_length': 2,
  'immediate': 3,
};

/**
 * Parse running mode from string or number.
 */
export function parseRunningMode(value: unknown): RunningMode {
  if (typeof value === 'string') {
    if (value in RUNNING_MODE_REVERSE) {
      return value as RunningMode;
    }
  }
  if (typeof value === 'number') {
    return RUNNING_MODE_MAP[value] ?? 'none';
  }
  return 'none';
}

/**
 * Convert running mode to number (old format).
 */
export function runningModeToNumber(mode: RunningMode): number {
  return RUNNING_MODE_REVERSE[mode];
}

// =============================================================================
// V2 Format Parsing
// =============================================================================

/**
 * Parse EHT parameters from v2 TOML format.
 */
export function parseEHTParamsV2(
  parsed: Record<string, unknown>
): EHTParamsV2 {
  const result: EHTParamsV2 = { ...DEFAULT_EHT_PARAMS_V2 };

  // Root-level params
  if (parsed.t_end !== undefined) result.t_end = Number(parsed.t_end);
  if (parsed.dt !== undefined) result.dt = Number(parsed.dt);
  if (parsed.seed !== undefined) result.seed = Number(parsed.seed);
  if (parsed.substeps !== undefined) result.substeps = Number(parsed.substeps);
  if (parsed.alg_dt !== undefined) result.alg_dt = Number(parsed.alg_dt);

  // Geometry
  if (parsed.tissue_width !== undefined) result.tissue_width = Number(parsed.tissue_width);
  if (parsed.tissue_height !== undefined) result.tissue_height = Number(parsed.tissue_height);
  if (parsed.perimeter !== undefined) result.perimeter = Number(parsed.perimeter);
  if (parsed.aspect_ratio !== undefined) result.aspect_ratio = Number(parsed.aspect_ratio);
  if (parsed.full_circle !== undefined) result.full_circle = Boolean(parsed.full_circle);

  // Physics
  if (parsed.friction !== undefined) result.friction = Number(parsed.friction);
  if (parsed.p_division_in_plane !== undefined) result.p_division_in_plane = Number(parsed.p_division_in_plane);
  if (parsed.hard_sphere_nuclei !== undefined) result.hard_sphere_nuclei = Boolean(parsed.hard_sphere_nuclei);

  // Display
  if (parsed.view_width !== undefined) result.view_width = Number(parsed.view_width);
  if (parsed.view_height !== undefined) result.view_height = Number(parsed.view_height);

  // Cell types
  const cells = parsed.cells as Record<string, Record<string, unknown>> | undefined;
  if (cells) {
    result.cells = {};

    for (const [name, cellData] of Object.entries(cells)) {
      if (!cellData || typeof cellData !== 'object') continue;

      const cellParams: Partial<EHTCellParams> = {};

      // Basic properties
      if (cellData.count !== undefined) cellParams.count = Number(cellData.count);
      if (cellData.location !== undefined) cellParams.location = cellData.location as EHTCellParams['location'];
      if (cellData.color !== undefined) cellParams.color = parseColor(cellData.color as string, DEFAULT_EHT_CELL.color);

      // Geometry
      if (cellData.radius_hard !== undefined) cellParams.radius_hard = Number(cellData.radius_hard);
      if (cellData.radius_hard_div !== undefined) cellParams.radius_hard_div = Number(cellData.radius_hard_div);
      if (cellData.radius_soft !== undefined) cellParams.radius_soft = Number(cellData.radius_soft);

      // Cell cycle
      if (cellData.lifespan !== undefined && Array.isArray(cellData.lifespan)) {
        cellParams.lifespan = [Number(cellData.lifespan[0]), Number(cellData.lifespan[1])];
      }
      if (cellData.g2_duration !== undefined) cellParams.g2_duration = Number(cellData.g2_duration);
      if (cellData.mitosis_duration !== undefined) cellParams.mitosis_duration = Number(cellData.mitosis_duration);

      // Stiffness
      if (cellData.k_apical !== undefined) cellParams.k_apical = Number(cellData.k_apical);
      if (cellData.k_apical_div !== undefined) cellParams.k_apical_div = Number(cellData.k_apical_div);
      if (cellData.k_nuclei_apical !== undefined) cellParams.k_nuclei_apical = Number(cellData.k_nuclei_apical);
      if (cellData.k_nuclei_basal !== undefined) cellParams.k_nuclei_basal = Number(cellData.k_nuclei_basal);
      if (cellData.k_repulsion !== undefined) cellParams.k_repulsion = Number(cellData.k_repulsion);
      if (cellData.k_straightness !== undefined) cellParams.k_straightness = Number(cellData.k_straightness);
      if (cellData.k_junction !== undefined) cellParams.k_junction = Number(cellData.k_junction);
      if (cellData.k_cytoskeleton !== undefined) cellParams.k_cytoskeleton = Number(cellData.k_cytoskeleton);

      // Movement
      if (cellData.p_running !== undefined) cellParams.p_running = Number(cellData.p_running);
      if (cellData.running_speed !== undefined) cellParams.running_speed = Number(cellData.running_speed);
      if (cellData.running_mode !== undefined) cellParams.running_mode = parseRunningMode(cellData.running_mode);

      // INM
      if (cellData.p_inm !== undefined) cellParams.p_inm = Number(cellData.p_inm);

      // EMT events
      if (cellData.emt_lose_apical !== undefined) cellParams.emt_lose_apical = parseEventTiming(cellData.emt_lose_apical);
      if (cellData.emt_lose_basal !== undefined) cellParams.emt_lose_basal = parseEventTiming(cellData.emt_lose_basal);
      if (cellData.emt_lose_straightness !== undefined) cellParams.emt_lose_straightness = parseEventTiming(cellData.emt_lose_straightness);
      if (cellData.emt_polarized_running !== undefined) cellParams.emt_polarized_running = parseEventTiming(cellData.emt_polarized_running);

      // Other
      if (cellData.heterogeneous !== undefined) cellParams.heterogeneous = Boolean(cellData.heterogeneous);
      if (cellData.diffusion !== undefined) cellParams.diffusion = Number(cellData.diffusion);
      if (cellData.basal_damping !== undefined) cellParams.basal_damping = Number(cellData.basal_damping);
      if (cellData.max_basal_junction_dist !== undefined) cellParams.max_basal_junction_dist = Number(cellData.max_basal_junction_dist);
      if (cellData.cytoskeleton_init !== undefined) cellParams.cytoskeleton_init = Number(cellData.cytoskeleton_init);
      if (cellData.basal_membrane_repulsion !== undefined) cellParams.basal_membrane_repulsion = Number(cellData.basal_membrane_repulsion);
      if (cellData.apical_junction_init !== undefined) cellParams.apical_junction_init = Number(cellData.apical_junction_init);
      if (cellData.max_cytoskeleton_length !== undefined) cellParams.max_cytoskeleton_length = Number(cellData.max_cytoskeleton_length);

      result.cells[name] = cellParams;
    }
  }

  return result;
}

/**
 * Parse Toy parameters from v2 TOML format.
 */
export function parseToyParamsV2(
  parsed: Record<string, unknown>
): ToyParamsV2 {
  const result: ToyParamsV2 = { ...DEFAULT_TOY_PARAMS_V2 };

  // Root-level params
  if (parsed.t_end !== undefined) result.t_end = Number(parsed.t_end);
  if (parsed.dt !== undefined) result.dt = Number(parsed.dt);
  if (parsed.seed !== undefined) result.seed = Number(parsed.seed);
  if (parsed.substeps !== undefined) result.substeps = Number(parsed.substeps);

  // Domain
  if (parsed.domain !== undefined && Array.isArray(parsed.domain)) {
    result.domain = [Number(parsed.domain[0]), Number(parsed.domain[1])];
  }
  if (parsed.boundary !== undefined) result.boundary = parsed.boundary as ToyParamsV2['boundary'];

  // Cells
  if (parsed.count !== undefined) result.count = Number(parsed.count);
  if (parsed.radius !== undefined) result.radius = Number(parsed.radius);
  if (parsed.repulsion !== undefined) result.repulsion = Number(parsed.repulsion);
  if (parsed.friction !== undefined) result.friction = Number(parsed.friction);

  // Run-and-tumble
  if (parsed.running_speed !== undefined) result.running_speed = Number(parsed.running_speed);
  if (parsed.tumble_speed !== undefined) result.tumble_speed = Number(parsed.tumble_speed);
  if (parsed.running_duration !== undefined) result.running_duration = Number(parsed.running_duration);
  if (parsed.tumbling_duration !== undefined) result.tumbling_duration = Number(parsed.tumbling_duration);
  if (parsed.tumbling_period !== undefined) result.tumbling_period = Number(parsed.tumbling_period);

  // Display
  if (parsed.view_width !== undefined) result.view_width = Number(parsed.view_width);
  if (parsed.view_height !== undefined) result.view_height = Number(parsed.view_height);

  return result;
}

/**
 * Parse batch configuration.
 */
export function parseBatchConfig(
  parsed: Record<string, unknown>
): BatchConfigV2 | undefined {
  const batch = parsed.batch as Record<string, unknown> | undefined;
  if (!batch) return undefined;

  const config: BatchConfigV2 = {};

  if (batch.seeds !== undefined) config.seeds = Number(batch.seeds);
  if (batch.sample_interval !== undefined) config.sample_interval = Number(batch.sample_interval);
  if (batch.sample_times !== undefined && Array.isArray(batch.sample_times)) {
    config.sample_times = batch.sample_times.map(Number);
  }
  if (batch.sweep !== undefined && Array.isArray(batch.sweep)) {
    config.sweep = batch.sweep.map((s: Record<string, unknown>) => ({
      param: String(s.param),
      values: s.values as (number | string | boolean)[] | undefined,
      range: s.range as [number, number] | undefined,
      steps: s.steps !== undefined ? Number(s.steps) : undefined,
    }));
  }

  return config;
}

// =============================================================================
// Main Parse Function
// =============================================================================

export interface ParsedParams {
  params: EHTParamsV2 | ToyParamsV2;
  batch?: BatchConfigV2;
  isV2: boolean;
}

/**
 * Parse TOML string to parameters.
 * Automatically detects format version.
 */
export function parseParamsToml(tomlString: string): ParsedParams {
  const parsed = TOML.parse(tomlString) as Record<string, unknown>;

  const isV2 = isV2Format(parsed);
  const model = isV2 ? String(parsed.model) : String((parsed.metadata as Record<string, unknown>)?.model ?? 'EHT');

  let params: EHTParamsV2 | ToyParamsV2;

  if (model === 'Toy') {
    params = isV2 ? parseToyParamsV2(parsed) : convertOldToyParams(parsed);
  } else {
    params = isV2 ? parseEHTParamsV2(parsed) : convertOldEHTParams(parsed);
  }

  const batch = parseBatchConfig(parsed);

  return { params, batch, isV2 };
}

// =============================================================================
// Old Format Conversion
// =============================================================================

/**
 * Convert old EHT format to v2.
 */
export function convertOldEHTParams(
  parsed: Record<string, unknown>
): EHTParamsV2 {
  const general = parsed.general as Record<string, unknown> | undefined ?? {};
  const cellTypes = parsed.cell_types as Record<string, Record<string, unknown>> | undefined ?? {};

  const result: EHTParamsV2 = {
    ...DEFAULT_EHT_PARAMS_V2,
    model: 'EHT',

    // Map old general params to new flat structure
    t_end: Number(general.t_end ?? DEFAULT_EHT_PARAMS_V2.t_end),
    dt: Number(general.dt ?? DEFAULT_EHT_PARAMS_V2.dt),
    seed: Number(general.random_seed ?? DEFAULT_EHT_PARAMS_V2.seed),
    substeps: Number(general.n_substeps ?? DEFAULT_EHT_PARAMS_V2.substeps),
    alg_dt: Number(general.alg_dt ?? DEFAULT_EHT_PARAMS_V2.alg_dt),

    tissue_width: Number(general.w_init ?? DEFAULT_EHT_PARAMS_V2.tissue_width),
    tissue_height: Number(general.h_init ?? DEFAULT_EHT_PARAMS_V2.tissue_height),
    perimeter: Number(general.perimeter ?? DEFAULT_EHT_PARAMS_V2.perimeter),
    aspect_ratio: Number(general.aspect_ratio ?? DEFAULT_EHT_PARAMS_V2.aspect_ratio),
    full_circle: Boolean(general.full_circle ?? DEFAULT_EHT_PARAMS_V2.full_circle),

    friction: Number(general.mu ?? DEFAULT_EHT_PARAMS_V2.friction),
    p_division_in_plane: Number(general.p_div_out ?? DEFAULT_EHT_PARAMS_V2.p_division_in_plane),
    hard_sphere_nuclei: Boolean(general.hard_sphere_nuclei ?? DEFAULT_EHT_PARAMS_V2.hard_sphere_nuclei),

    view_width: Number(general.w_screen ?? DEFAULT_EHT_PARAMS_V2.view_width),
    view_height: Number(general.h_screen ?? DEFAULT_EHT_PARAMS_V2.view_height),

    cells: {},
  };

  // Convert cell types
  for (const [name, oldCell] of Object.entries(cellTypes)) {
    const events = oldCell.events as Record<string, unknown> | undefined ?? {};

    const cellParams: Partial<EHTCellParams> = {
      count: Number(oldCell.N_init ?? 0),
      location: oldCell.location as EHTCellParams['location'] ?? '',
      color: parseColor(oldCell.color as { r: number; g: number; b: number } | undefined, DEFAULT_EHT_CELL.color),

      radius_hard: Number(oldCell.R_hard ?? DEFAULT_EHT_CELL.radius_hard),
      radius_hard_div: Number(oldCell.R_hard_div ?? DEFAULT_EHT_CELL.radius_hard_div),
      radius_soft: Number(oldCell.R_soft ?? DEFAULT_EHT_CELL.radius_soft),

      lifespan: [
        Number(oldCell.lifespan_start ?? DEFAULT_EHT_CELL.lifespan[0]),
        Number(oldCell.lifespan_end ?? DEFAULT_EHT_CELL.lifespan[1]),
      ],
      g2_duration: Number(oldCell.dur_G2 ?? DEFAULT_EHT_CELL.g2_duration),
      mitosis_duration: Number(oldCell.dur_mitosis ?? DEFAULT_EHT_CELL.mitosis_duration),

      k_apical: Number(oldCell.stiffness_apical_apical ?? DEFAULT_EHT_CELL.k_apical),
      k_apical_div: Number(oldCell.stiffness_apical_apical_div ?? DEFAULT_EHT_CELL.k_apical_div),
      k_nuclei_apical: Number(oldCell.stiffness_nuclei_apical ?? DEFAULT_EHT_CELL.k_nuclei_apical),
      k_nuclei_basal: Number(oldCell.stiffness_nuclei_basal ?? DEFAULT_EHT_CELL.k_nuclei_basal),
      k_repulsion: Number(oldCell.stiffness_repulsion ?? DEFAULT_EHT_CELL.k_repulsion),
      k_straightness: Number(oldCell.stiffness_straightness ?? DEFAULT_EHT_CELL.k_straightness),
      k_junction: Number(oldCell.k_apical_junction ?? DEFAULT_EHT_CELL.k_junction),
      k_cytoskeleton: Number(oldCell.k_cytos ?? DEFAULT_EHT_CELL.k_cytoskeleton),

      p_running: Number(oldCell.run ?? DEFAULT_EHT_CELL.p_running),
      running_speed: Number(oldCell.running_speed ?? DEFAULT_EHT_CELL.running_speed),
      running_mode: parseRunningMode(oldCell.running_mode),

      p_inm: Number(oldCell.INM ?? DEFAULT_EHT_CELL.p_inm),

      emt_lose_apical: parseEventTimingFromStartEnd(
        events.time_A_start as number | undefined,
        events.time_A_end as number | undefined
      ),
      emt_lose_basal: parseEventTimingFromStartEnd(
        events.time_B_start as number | undefined,
        events.time_B_end as number | undefined
      ),
      emt_lose_straightness: parseEventTimingFromStartEnd(
        events.time_S_start as number | undefined,
        events.time_S_end as number | undefined
      ),
      emt_polarized_running: parseEventTimingFromStartEnd(
        events.time_P_start as number | undefined,
        events.time_P_end as number | undefined
      ),

      heterogeneous: Boolean(oldCell.hetero ?? DEFAULT_EHT_CELL.heterogeneous),
      diffusion: Number(oldCell.diffusion ?? DEFAULT_EHT_CELL.diffusion),
      basal_damping: Number(oldCell.basal_damping_ratio ?? DEFAULT_EHT_CELL.basal_damping),
      max_basal_junction_dist: Number(oldCell.max_basal_junction_dist ?? DEFAULT_EHT_CELL.max_basal_junction_dist),
      cytoskeleton_init: Number(oldCell.cytos_init ?? DEFAULT_EHT_CELL.cytoskeleton_init),
      basal_membrane_repulsion: Number(oldCell.basal_membrane_repulsion ?? DEFAULT_EHT_CELL.basal_membrane_repulsion),
      apical_junction_init: Number(oldCell.apical_junction_init ?? DEFAULT_EHT_CELL.apical_junction_init),
      max_cytoskeleton_length: Number(oldCell.max_cytoskeleton_length ?? DEFAULT_EHT_CELL.max_cytoskeleton_length),
    };

    result.cells[name] = cellParams;
  }

  return result;
}

/**
 * Convert old Toy format to v2.
 */
export function convertOldToyParams(
  parsed: Record<string, unknown>
): ToyParamsV2 {
  const general = parsed.general as Record<string, unknown> | undefined ?? {};

  return {
    ...DEFAULT_TOY_PARAMS_V2,
    model: 'Toy',

    t_end: Number(general.t_end ?? DEFAULT_TOY_PARAMS_V2.t_end),
    dt: Number(general.dt ?? DEFAULT_TOY_PARAMS_V2.dt),
    seed: Number(general.random_seed ?? DEFAULT_TOY_PARAMS_V2.seed),
    substeps: Number(general.n_substeps ?? DEFAULT_TOY_PARAMS_V2.substeps),

    domain: Array.isArray(general.domain_size)
      ? [Number(general.domain_size[0]), Number(general.domain_size[1])]
      : DEFAULT_TOY_PARAMS_V2.domain,
    boundary: (general.boundary_type as ToyParamsV2['boundary']) ?? DEFAULT_TOY_PARAMS_V2.boundary,

    count: Number(general.N ?? DEFAULT_TOY_PARAMS_V2.count),
    radius: Number(general.soft_radius ?? DEFAULT_TOY_PARAMS_V2.radius),
    repulsion: Number(general.repulsion_strength ?? DEFAULT_TOY_PARAMS_V2.repulsion),
    friction: Number(general.mu ?? DEFAULT_TOY_PARAMS_V2.friction),

    running_speed: Number(general.running_speed ?? DEFAULT_TOY_PARAMS_V2.running_speed),
    tumble_speed: Number(general.tumble_speed ?? DEFAULT_TOY_PARAMS_V2.tumble_speed),
    running_duration: Number(general.running_duration ?? DEFAULT_TOY_PARAMS_V2.running_duration),
    tumbling_duration: Number(general.tumbling_duration ?? DEFAULT_TOY_PARAMS_V2.tumbling_duration),
    tumbling_period: Number(general.tumbling_period ?? DEFAULT_TOY_PARAMS_V2.tumbling_period),

    view_width: Number(general.w_screen ?? DEFAULT_TOY_PARAMS_V2.view_width),
    view_height: Number(general.h_screen ?? DEFAULT_TOY_PARAMS_V2.view_height),
  };
}
