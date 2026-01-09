/**
 * Legacy XLSX parameter file importer.
 *
 * Maps legacy parameter format to current EHTParams structure.
 *
 * ## Parameter Mapping
 *
 * ### Sheet: parameters → EHTParams
 * | Legacy Key                  | Current Path                    | Notes                                    |
 * |-----------------------------|---------------------------------|------------------------------------------|
 * | sim.t_end                   | general.t_end                   | Direct                                   |
 * | sim.dt                      | general.dt                      | Direct                                   |
 * | stat.random_seed            | general.random_seed             | Direct (int)                             |
 * | epi.basal_curvature         | general.perimeter/aspect_ratio  | 0 → perimeter=0, else compute            |
 * | epi.N_init                  | (scales cell_types N_init)      | Scale init_distr to match this total     |
 * | epi.prob_out_div            | general.p_div_out               | Direct                                   |
 * | epi.init_apical_junction_dist| cell_types[*].apical_junction_init | Applied to all cell types              |
 * | epi.init_zone.size.x        | general.w_init                  | Direct                                   |
 * | epi.init_zone.size.y        | general.h_init                  | Direct                                   |
 * | epi.mu                      | general.mu                      | Direct                                   |
 * | alg.n_substeps              | general.n_substeps              | Direct                                   |
 * | alg.dt                      | general.alg_dt                  | Direct                                   |
 * | stat.num_rep                | -                               | Ignored (batch config)                   |
 * | epi.init_distr              | -                               | Parsed for N_init per type               |
 * | epi.init_method             | -                               | Ignored                                  |
 * | epi.k_apical_healing        | -                               | Ignored (not implemented)                |
 * | epi.init_basal_junction_dist| cell_types[*].max_basal_junction_dist| Applied to all cell types            |
 *
 * ### Sheet: cell_type → cell_types[key]
 * | Legacy Parameter        | Current Property              | Notes                                    |
 * |-------------------------|-------------------------------|------------------------------------------|
 * | R_hard                  | R_hard                        | Direct                                   |
 * | R_soft                  | R_soft                        | Direct                                   |
 * | color                   | color                         | Parse CSS color name → RGB               |
 * | duration_G2             | dur_G2                        | Direct                                   |
 * | duration_mitosis        | dur_mitosis                   | Direct                                   |
 * | k_apical_junction       | k_apical_junction             | Direct (abs value)                       |
 * | k_cytoskeleton          | k_cytos                       | Direct                                   |
 * | running_mode            | running_mode                  | Direct                                   |
 * | running_speed           | running_speed                 | Direct                                   |
 * | stiffness_apical_apical | stiffness_apical_apical       | Direct                                   |
 * | stiffness_nuclei_apical | stiffness_nuclei_apical       | Direct                                   |
 * | stiffness_nuclei_basal  | stiffness_nuclei_basal        | Direct                                   |
 * | stiffness_repulsion     | stiffness_repulsion           | Direct                                   |
 * | stiffness_straightness  | stiffness_straightness        | Direct                                   |
 * | life_span.min           | lifespan_start                | Direct                                   |
 * | life_span.max           | lifespan_end                  | Direct                                   |
 * | diffusion               | cell_types[key].diffusion       | Per-cell-type (default if 0/missing)     |
 * | basal_damping_ratio     | cell_types[key].basal_damping_ratio| Per-cell-type (default if 0/missing)|
 * | max_basal_junction_dist | cell_types[key].max_basal_junction_dist| Per-cell-type (default if 0/missing)|
 * | cytoskeleton_init       | cell_types[key].cytos_init      | Per-cell-type                            |
 * | basal_repulsion         | cell_types[key].basal_membrane_repulsion| Per-cell-type                    |
 * | apical_junction_init    | cell_types[key].apical_junction_init| Per-cell-type                        |
 * | apical_cytos_strain     | -                             | Ignored (dynamic behavior)               |
 * | basal_cytos_strain      | -                             | Ignored (dynamic behavior)               |
 *
 * ### Sheet: special_cell_events → cell_types[key].events
 * | Legacy Event                | Current Event Field           | Notes                                    |
 * |-----------------------------|-------------------------------|------------------------------------------|
 * | loss_apical_adhesion        | events.time_A_start/end       | sim_time_start/end                       |
 * | loss_basal_adhesion         | events.time_B_start/end       | sim_time_start/end                       |
 * | loss_polarity (cell_events) | events.time_S_start/end       | From stiffness_straightness event        |
 * | divide_cell (Inf start)     | -                             | Indicates EMT-like (no division)         |
 *
 * ### Ignored Legacy Parameters
 * - sim.name (metadata only)
 * - epi.init_method (always use current method)
 * - epi.k_apical_healing (not implemented)
 * - alg.alg_name (always PBD)
 * - Most cell_events (handled differently now)
 */

import { cloneDeep } from 'lodash-es';
import type { EHTParams, EHTCellTypeParams, RGBColor } from './types';
import { DEFAULT_EHT_PARAMS, DEFAULT_CONTROL_CELL } from './defaults';

// Type for parsed XLSX data
export interface LegacyXLSXData {
  parameters: Record<string, string | number>;
  cell_type: {
    parameters: string[];
    types: Record<string, Record<string, string | number>>;
  };
  cell_events?: Array<{
    cell_type: string;
    name: string;
    symbol: string;
    factor: number;
    abs_value: number;
    sim_time_start: number | string;
    sim_time_end: number | string;
    cell_ref_time: string;
    cell_time_start: number;
  }>;
  special_cell_events?: Array<{
    cell_type: string;
    name: string;
    julia_function: string;
    sim_time_start: number | string;
    sim_time_end: number | string;
    cell_ref_time: string;
    cell_time_start: number;
  }>;
}

/**
 * Parse a numeric value, handling "Inf" strings.
 */
function parseNumber(value: string | number | undefined, defaultValue: number = 0): number {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'number') return value;
  const str = String(value).trim().toLowerCase();
  if (str === 'inf' || str === 'infinity') return Infinity;
  if (str === '-inf' || str === '-infinity') return -Infinity;
  const num = parseFloat(str);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Parse the epi.init_distr string to extract cell type counts.
 * Format: "control: 10, exp: 1, control: 10"
 * Returns: { control: 20, exp: 1 } (sums duplicates)
 */
function parseInitDistr(initDistr: string): Record<string, number> {
  const result: Record<string, number> = {};
  if (!initDistr) return result;

  const parts = initDistr.split(',');
  for (const part of parts) {
    const [name, countStr] = part.split(':').map(s => s.trim());
    if (name && countStr) {
      const count = parseInt(countStr, 10);
      if (!isNaN(count)) {
        result[name] = (result[name] || 0) + count;
      }
    }
  }
  return result;
}

/**
 * Import legacy XLSX data and convert to EHTParams.
 */
export function importLegacyXLSX(data: LegacyXLSXData): EHTParams {
  const params = cloneDeep(DEFAULT_EHT_PARAMS);
  const p = data.parameters;

  // === General Parameters ===
  if (p['sim.t_end'] !== undefined) {
    params.general.t_end = parseNumber(p['sim.t_end'], 48);
  }
  if (p['sim.dt'] !== undefined) {
    params.general.dt = parseNumber(p['sim.dt'], 0.1);
  }
  if (p['stat.random_seed'] !== undefined) {
    params.general.random_seed = Math.floor(parseNumber(p['stat.random_seed'], 0));
  }
  if (p['epi.prob_out_div'] !== undefined) {
    params.general.p_div_out = parseNumber(p['epi.prob_out_div'], 1.0);
  }
  if (p['epi.mu'] !== undefined) {
    params.general.mu = parseNumber(p['epi.mu'], 0.2);
  }
  if (p['alg.n_substeps'] !== undefined) {
    params.general.n_substeps = Math.floor(parseNumber(p['alg.n_substeps'], 30));
  }
  if (p['alg.dt'] !== undefined) {
    params.general.alg_dt = parseNumber(p['alg.dt'], 0.01);
  }
  if (p['epi.init_zone.size.x'] !== undefined) {
    params.general.w_init = parseNumber(p['epi.init_zone.size.x'], 80);
  }
  if (p['epi.init_zone.size.y'] !== undefined) {
    params.general.h_init = parseNumber(p['epi.init_zone.size.y'], 5);
  }

  // Handle curvature → perimeter conversion
  const curvature = parseNumber(p['epi.basal_curvature'], 0);
  if (curvature === 0) {
    // Straight line geometry
    params.general.perimeter = params.general.w_init * 2;
    params.general.aspect_ratio = 0; // 0 = straight line
    params.general.full_circle = false;
  } else {
    // Legacy curvature was 1/radius for a circle
    // Set perimeter to 2x initial width
    params.general.perimeter = params.general.w_init * 2;
    params.general.aspect_ratio = 1;
    params.general.full_circle = true;
  }

  // Set screen size to 2x initial width
  params.general.w_screen = params.general.w_init * 1.5;
  params.general.h_screen = 0;

  // Parse global cell property values (will be applied to all cell types below)
  const globalApicalJunctionInit = p['epi.init_apical_junction_dist'] !== undefined
    ? parseNumber(p['epi.init_apical_junction_dist'], 0)
    : undefined;
  const globalMaxBasalJunctionDist = p['epi.init_basal_junction_dist'] !== undefined
    ? parseNumber(p['epi.init_basal_junction_dist'], 4)
    : undefined;

  // === Cell Types ===
  // First, parse init_distr to get N_init values (ratios)
  const initDistr = parseInitDistr(String(p['epi.init_distr'] || ''));

  // Get the target total N_init from epi.N_init
  const targetTotalN = parseNumber(p['epi.N_init'], 0);

  // Calculate sum of init_distr values
  const initDistrSum = Object.values(initDistr).reduce((sum, n) => sum + n, 0);

  // Scale factor to reach target N_init (if both are specified)
  const scaleFactor = (targetTotalN > 0 && initDistrSum > 0) ? targetTotalN / initDistrSum : 1;

  // Clear existing cell types and create from XLSX
  params.cell_types = {};

  const cellTypeData = data.cell_type;
  const typeNames = Object.keys(cellTypeData.types);

  // Create cell types
  for (const typeName of typeNames) {
    const legacyType = cellTypeData.types[typeName];

    // Map legacy type name to current conventions
    // "exp" in legacy → "emt" in current
    const currentTypeName = typeName === 'exp' ? 'emt' : typeName;

    // Use green for control, magenta for all other types
    const cellColor: RGBColor = currentTypeName === 'control'
      ? { r: 0, g: 128, b: 0 }  // green
      : { r: 255, g: 0, b: 255 }; // magenta

    // Set location: 'bottom' for emt, empty for others
    const cellLocation = currentTypeName === 'emt' ? 'bottom' : '';

    // Scale N_init to match target total from epi.N_init
    const scaledNInit = Math.round((initDistr[typeName] || 0) * scaleFactor);

    const cellType: EHTCellTypeParams = {
      ...cloneDeep(DEFAULT_CONTROL_CELL),
      N_init: scaledNInit,
      location: cellLocation,
      R_hard: parseNumber(legacyType["R_hard"], 0.3),
      R_hard_div: (parseNumber(legacyType["R_hard"], 0.3) * 0.7) / 0.3, // Legacy used event to set this
      R_soft: parseNumber(legacyType["R_soft"], 1.2),
      color: cellColor,
      dur_G2: parseNumber(legacyType["duration_G2"], 0.5),
      dur_mitosis: parseNumber(legacyType["duration_mitosis"], 0.5),
      k_apical_junction: Math.abs(
        parseNumber(legacyType["k_apical_junction"], 5)
      ),
      k_cytos: parseNumber(legacyType["k_cytoskeleton"], 5),
      max_cytoskeleton_length: parseNumber(legacyType["max_cytoskeleton_length"], 0.0), // Default, not in legacy
      run: 0, // Default, not directly in legacy
      running_speed: parseNumber(legacyType["running_speed"], 1),
      running_mode: Math.floor(parseNumber(legacyType["running_mode"], 0)),
      stiffness_apical_apical: parseNumber(
        legacyType["stiffness_apical_apical"],
        2
      ),
      stiffness_apical_apical_div:
        parseNumber(legacyType["stiffness_apical_apical"], 2) * 2, // Legacy doubled during division
      stiffness_nuclei_apical: parseNumber(
        legacyType["stiffness_nuclei_apical"],
        3
      ),
      stiffness_nuclei_basal: parseNumber(
        legacyType["stiffness_nuclei_basal"],
        2
      ),
      stiffness_repulsion: parseNumber(legacyType["stiffness_repulsion"], 2),
      stiffness_straightness: parseNumber(
        legacyType["stiffness_straightness"],
        5
      ),
      lifespan_start: parseNumber(legacyType["life_span.min"], 5.5),
      lifespan_end: parseNumber(legacyType["life_span.max"], 6.5),
      INM: 0, // Default
      hetero: false, // Will be set based on events
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
      // Per-cell-type properties (use value from XLSX or global value or default if zero/missing)
      diffusion: parseNumber(legacyType["diffusion"], 0) || DEFAULT_CONTROL_CELL.diffusion,
      basal_damping_ratio: parseNumber(legacyType["basal_damping_ratio"], 0) || DEFAULT_CONTROL_CELL.basal_damping_ratio,
      max_basal_junction_dist: parseNumber(legacyType["max_basal_junction_dist"], 0) || globalMaxBasalJunctionDist || DEFAULT_CONTROL_CELL.max_basal_junction_dist,
      cytos_init: parseNumber(legacyType["cytoskeleton_init"], DEFAULT_CONTROL_CELL.cytos_init),
      basal_membrane_repulsion: parseNumber(legacyType["basal_repulsion"], DEFAULT_CONTROL_CELL.basal_membrane_repulsion),
      apical_junction_init: parseNumber(legacyType["apical_junction_init"], 0) || globalApicalJunctionInit || DEFAULT_CONTROL_CELL.apical_junction_init,
    };

    params.cell_types[currentTypeName] = cellType;
  }

  // === Process Special Cell Events ===
  if (data.special_cell_events) {
    for (const event of data.special_cell_events) {
      const typeName = event.cell_type === 'exp' ? 'emt' : event.cell_type;
      const cellType = params.cell_types[typeName];
      if (!cellType) continue;

      const startTime = parseNumber(event.sim_time_start, Infinity);
      const endTime = parseNumber(event.sim_time_end, Infinity);

      switch (event.name) {
        case 'loss_apical_adhesion':
        case 'local_loss_apical_adhesion':
          cellType.events.time_A_start = startTime;
          cellType.events.time_A_end = endTime;
          break;
        case 'loss_basal_adhesion':
          cellType.events.time_B_start = startTime;
          cellType.events.time_B_end = endTime;
          break;
        case 'divide_cell':
          // If divide_cell has Inf start, this is an EMT-like cell
          // (handled by the simulation already checking typeIndex)
          break;
      }
    }
  }

  // === Process Cell Events (for loss_polarity / stiffness_straightness) ===
  if (data.cell_events) {
    for (const event of data.cell_events) {
      const typeName = event.cell_type === 'exp' ? 'emt' : event.cell_type;
      const cellType = params.cell_types[typeName];
      if (!cellType) continue;

      if (event.name === 'loss_polarity' && event.symbol === 'stiffness_straightness') {
        cellType.events.time_S_start = parseNumber(event.sim_time_start, Infinity);
        cellType.events.time_S_end = parseNumber(event.sim_time_end, Infinity);
      }
    }
  }

  // Check if any cell type has events → set hetero flag
  for (const cellType of Object.values(params.cell_types)) {
    const hasEvents =
      isFinite(cellType.events.time_A_start) ||
      isFinite(cellType.events.time_B_start) ||
      isFinite(cellType.events.time_S_start);
    if (hasEvents) {
      cellType.hetero = true;
    }
  }

  return params;
}

/**
 * Parse XLSX file using SheetJS library.
 * Returns the structured legacy data format.
 */
export async function parseXLSXFile(file: File): Promise<LegacyXLSXData> {
  // Dynamically import xlsx library
  const XLSX = await import('xlsx');

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const result: LegacyXLSXData = {
    parameters: {},
    cell_type: {
      parameters: [],
      types: {},
    },
  };

  // Parse "parameters" sheet
  const paramsSheet = workbook.Sheets['parameters'];
  if (paramsSheet) {
    const rows = XLSX.utils.sheet_to_json<{ key: string; value: string | number }>(paramsSheet);
    for (const row of rows) {
      if (row.key) {
        result.parameters[row.key] = row.value;
      }
    }
  }

  // Parse "cell_type" sheet
  const cellTypeSheet = workbook.Sheets['cell_type'];
  if (cellTypeSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(cellTypeSheet);
    if (rows.length > 0) {
      // Get column headers (cell type names)
      const firstRow = rows[0];
      const typeNames = Object.keys(firstRow).filter(k => k !== 'parameter');

      // Initialize types
      for (const typeName of typeNames) {
        result.cell_type.types[typeName] = {};
      }

      // Fill in values
      for (const row of rows) {
        const param = String(row['parameter'] || '');
        if (!param) continue;
        result.cell_type.parameters.push(param);

        for (const typeName of typeNames) {
          result.cell_type.types[typeName][param] = row[typeName];
        }
      }
    }
  }

  // Parse "cell_events" sheet
  const cellEventsSheet = workbook.Sheets['cell_events'];
  if (cellEventsSheet) {
    result.cell_events = XLSX.utils.sheet_to_json(cellEventsSheet);
  }

  // Parse "special_cell_events" sheet
  const specialEventsSheet = workbook.Sheets['special_cell_events'];
  if (specialEventsSheet) {
    result.special_cell_events = XLSX.utils.sheet_to_json(specialEventsSheet);
  }

  return result;
}

/**
 * Full import: parse XLSX file and convert to EHTParams.
 */
export async function importXLSXToParams(file: File): Promise<EHTParams> {
  const data = await parseXLSXFile(file);
  return importLegacyXLSX(data);
}
