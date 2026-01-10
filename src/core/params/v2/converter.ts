/**
 * Converter between v2 params and old format params.
 * Allows gradual migration while keeping simulation code working.
 */

import type { EHTParamsV2, ToyParamsV2, EHTCellParams } from './types';
import type { EHTParams } from '@/models/eht/params/types';
import type { ToyParams } from '@/models/toy/params/types';
import { resolveEHTCellParams } from './defaults';
import { hexToRgb, eventTimingToStartEnd, runningModeToNumber } from './parser';

// =============================================================================
// V2 to Old Format Conversion
// =============================================================================

/**
 * Convert v2 EHT params to old format for simulation.
 */
export function ehtParamsV2ToOld(params: EHTParamsV2): EHTParams {
  // Build cell types map
  const cell_types: EHTParams['cell_types'] = {};

  for (const [name, partial] of Object.entries(params.cells)) {
    if (name === 'default') continue;

    const resolved = resolveEHTCellParams(partial, params.cells.default);
    const apicalTiming = eventTimingToStartEnd(resolved.emt_lose_apical);
    const basalTiming = eventTimingToStartEnd(resolved.emt_lose_basal);
    const straightTiming = eventTimingToStartEnd(resolved.emt_lose_straightness);
    const polarizedTiming = eventTimingToStartEnd(resolved.emt_polarized_running);

    cell_types[name] = {
      N_init: resolved.count,
      location: typeof resolved.location === 'number' ? String(resolved.location) : resolved.location || '',
      R_hard: resolved.radius_hard,
      R_hard_div: resolved.radius_hard_div,
      R_soft: resolved.radius_soft,
      color: hexToRgb(resolved.color),
      dur_G2: resolved.g2_duration,
      dur_mitosis: resolved.mitosis_duration,
      k_apical_junction: resolved.k_junction,
      k_cytos: resolved.k_cytoskeleton,
      max_cytoskeleton_length: resolved.max_cytoskeleton_length,
      run: resolved.p_running,
      running_speed: resolved.running_speed,
      running_mode: runningModeToNumber(resolved.running_mode),
      stiffness_apical_apical: resolved.k_apical,
      stiffness_apical_apical_div: resolved.k_apical_div,
      stiffness_nuclei_apical: resolved.k_nuclei_apical,
      stiffness_nuclei_basal: resolved.k_nuclei_basal,
      stiffness_repulsion: resolved.k_repulsion,
      stiffness_straightness: resolved.k_straightness,
      lifespan_start: resolved.lifespan[0],
      lifespan_end: resolved.lifespan[1],
      INM: resolved.p_inm,
      hetero: resolved.heterogeneous,
      events: {
        time_A_start: apicalTiming.start,
        time_A_end: apicalTiming.end,
        time_B_start: basalTiming.start,
        time_B_end: basalTiming.end,
        time_S_start: straightTiming.start,
        time_S_end: straightTiming.end,
        time_P_start: polarizedTiming.start,
        time_P_end: polarizedTiming.end,
      },
      diffusion: resolved.diffusion,
      basal_damping_ratio: resolved.basal_damping,
      max_basal_junction_dist: resolved.max_basal_junction_dist,
      cytos_init: resolved.cytoskeleton_init,
      basal_membrane_repulsion: resolved.basal_membrane_repulsion,
      apical_junction_init: resolved.apical_junction_init,
    };
  }

  return {
    metadata: {
      model: 'EHT',
      version: '1.0.0',
    },
    general: {
      t_end: params.t_end,
      dt: params.dt,
      random_seed: params.seed,
      full_circle: params.full_circle,
      w_init: params.tissue_width,
      h_init: params.tissue_height,
      mu: params.friction,
      n_substeps: params.substeps,
      alg_dt: params.alg_dt,
      w_screen: params.view_width ?? 50,
      h_screen: params.view_height ?? 25,
      p_div_out: params.p_division_in_plane,
      perimeter: params.perimeter,
      aspect_ratio: params.aspect_ratio,
      hard_sphere_nuclei: params.hard_sphere_nuclei,
    },
    cell_prop: {},
    cell_types,
  };
}

/**
 * Convert v2 Toy params to old format for simulation.
 */
export function toyParamsV2ToOld(params: ToyParamsV2): ToyParams {
  return {
    metadata: {
      model: 'Toy',
      version: '1.0.0',
    },
    general: {
      t_end: params.t_end,
      dt: params.dt,
      random_seed: params.seed,
      n_substeps: params.substeps,
      w_screen: params.view_width ?? 100,
      h_screen: params.view_height ?? 100,
      mu: params.friction,
      N: params.count,
      soft_radius: params.radius,
      repulsion_strength: params.repulsion,
      running_speed: params.running_speed,
      tumble_speed: params.tumble_speed,
      running_duration: params.running_duration,
      tumbling_duration: params.tumbling_duration,
      tumbling_period: params.tumbling_period,
      boundary_type: params.boundary,
      domain_size: params.domain,
    },
  };
}

// =============================================================================
// Old to V2 Format Conversion (for export)
// =============================================================================

/**
 * Convert old EHT params to v2 format.
 */
export function ehtParamsOldToV2(params: EHTParams): EHTParamsV2 {
  const cells: EHTParamsV2['cells'] = {};

  for (const [name, oldCell] of Object.entries(params.cell_types)) {
    const cellParams: Partial<EHTCellParams> = {
      count: oldCell.N_init,
      location: oldCell.location as EHTCellParams['location'],
      color: `#${oldCell.color.r.toString(16).padStart(2, '0')}${oldCell.color.g.toString(16).padStart(2, '0')}${oldCell.color.b.toString(16).padStart(2, '0')}`,

      radius_hard: oldCell.R_hard,
      radius_hard_div: oldCell.R_hard_div,
      radius_soft: oldCell.R_soft,

      lifespan: [oldCell.lifespan_start, oldCell.lifespan_end],
      g2_duration: oldCell.dur_G2,
      mitosis_duration: oldCell.dur_mitosis,

      k_apical: oldCell.stiffness_apical_apical,
      k_apical_div: oldCell.stiffness_apical_apical_div,
      k_nuclei_apical: oldCell.stiffness_nuclei_apical,
      k_nuclei_basal: oldCell.stiffness_nuclei_basal,
      k_repulsion: oldCell.stiffness_repulsion,
      k_straightness: oldCell.stiffness_straightness,
      k_junction: oldCell.k_apical_junction,
      k_cytoskeleton: oldCell.k_cytos,

      p_running: oldCell.run,
      running_speed: oldCell.running_speed,
      running_mode: (['none', 'after_extrusion', 'retain_length', 'immediate'] as const)[oldCell.running_mode] ?? 'none',

      p_inm: oldCell.INM,

      emt_lose_apical: oldCell.events.time_A_start >= 1e100 ? 'never' : [oldCell.events.time_A_start, oldCell.events.time_A_end],
      emt_lose_basal: oldCell.events.time_B_start >= 1e100 ? 'never' : [oldCell.events.time_B_start, oldCell.events.time_B_end],
      emt_lose_straightness: oldCell.events.time_S_start >= 1e100 ? 'never' : [oldCell.events.time_S_start, oldCell.events.time_S_end],
      emt_polarized_running: oldCell.events.time_P_start >= 1e100 ? 'never' : [oldCell.events.time_P_start, oldCell.events.time_P_end],

      heterogeneous: oldCell.hetero,
      diffusion: oldCell.diffusion,
      basal_damping: oldCell.basal_damping_ratio,
      max_basal_junction_dist: oldCell.max_basal_junction_dist,
      cytoskeleton_init: oldCell.cytos_init,
      basal_membrane_repulsion: oldCell.basal_membrane_repulsion,
      apical_junction_init: oldCell.apical_junction_init,
      max_cytoskeleton_length: oldCell.max_cytoskeleton_length,
    };

    cells[name] = cellParams;
  }

  return {
    model: 'EHT',
    t_end: params.general.t_end,
    dt: params.general.dt,
    seed: params.general.random_seed,
    substeps: params.general.n_substeps,
    alg_dt: params.general.alg_dt,
    tissue_width: params.general.w_init,
    tissue_height: params.general.h_init,
    perimeter: params.general.perimeter,
    aspect_ratio: params.general.aspect_ratio,
    full_circle: params.general.full_circle,
    friction: params.general.mu,
    p_division_in_plane: params.general.p_div_out,
    hard_sphere_nuclei: params.general.hard_sphere_nuclei ?? false,
    view_width: params.general.w_screen,
    view_height: params.general.h_screen,
    cells,
  };
}

/**
 * Convert old Toy params to v2 format.
 */
export function toyParamsOldToV2(params: ToyParams): ToyParamsV2 {
  return {
    model: 'Toy',
    t_end: params.general.t_end,
    dt: params.general.dt,
    seed: params.general.random_seed,
    substeps: params.general.n_substeps,
    domain: params.general.domain_size,
    boundary: params.general.boundary_type,
    count: params.general.N,
    radius: params.general.soft_radius,
    repulsion: params.general.repulsion_strength,
    friction: params.general.mu,
    running_speed: params.general.running_speed,
    tumble_speed: params.general.tumble_speed,
    running_duration: params.general.running_duration,
    tumbling_duration: params.general.tumbling_duration,
    tumbling_period: params.general.tumbling_period,
    view_width: params.general.w_screen,
    view_height: params.general.h_screen,
  };
}
