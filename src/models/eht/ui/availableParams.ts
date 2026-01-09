/**
 * EHT model available parameters for batch sweeps.
 * Generates a flat list of all numeric parameters from the current params.
 */

import type { BatchParameterDefinition } from '@/core/registry/types';
import type { EHTParams } from '../params/types';

/**
 * Generate batch parameters dynamically from the current EHT params.
 * Creates a flat list of all numeric parameters that can be swept.
 */
export function generateEHTBatchParameters(params: EHTParams): BatchParameterDefinition[] {
  const batchParams: BatchParameterDefinition[] = [];

  // General parameters
  batchParams.push(
    { path: 'general.t_end', label: 't_end (End time)' },
    { path: 'general.dt', label: 'dt (Time step)' },
    { path: 'general.random_seed', label: 'Random seed', isInteger: true },
    { path: 'general.w_init', label: 'w_init (Initial width)' },
    { path: 'general.h_init', label: 'h_init (Initial height)' },
    { path: 'general.mu', label: 'mu (Friction)' },
    { path: 'general.n_substeps', label: 'n_substeps', isInteger: true },
    { path: 'general.alg_dt', label: 'alg_dt (Algorithm dt)' },
    { path: 'general.p_div_out', label: 'p_div_out (Division probability)' },
    { path: 'general.perimeter', label: 'Perimeter' },
    { path: 'general.aspect_ratio', label: 'Aspect ratio' },
  );

  // Cell property parameters
  batchParams.push(
    { path: 'cell_prop.apical_junction_init', label: 'Apical junction init' },
    { path: 'cell_prop.max_basal_junction_dist', label: 'Max basal junction dist' },
    { path: 'cell_prop.basal_daming_ratio', label: 'Basal damping ratio' },
    { path: 'cell_prop.basal_membrane_repulsion', label: 'Basal membrane repulsion' },
    { path: 'cell_prop.cytos_init', label: 'Cytos init' },
    { path: 'cell_prop.diffusion', label: 'Diffusion' },
  );

  // Cell type parameters - generated dynamically from actual cell types
  for (const [typeKey, _cellType] of Object.entries(params.cell_types)) {
    const prefix = `cell_types.${typeKey}`;
    const label = typeKey;

    batchParams.push(
      { path: `${prefix}.N_init`, label: `${label}: N_init`, isInteger: true },
      { path: `${prefix}.location`, label: `${label}: location` },
      { path: `${prefix}.R_hard`, label: `${label}: R_hard` },
      { path: `${prefix}.R_hard_div`, label: `${label}: R_hard_div` },
      { path: `${prefix}.R_soft`, label: `${label}: R_soft` },
      { path: `${prefix}.dur_G2`, label: `${label}: dur_G2` },
      { path: `${prefix}.dur_mitosis`, label: `${label}: dur_mitosis` },
      { path: `${prefix}.k_apical_junction`, label: `${label}: k_apical_junction` },
      { path: `${prefix}.k_cytos`, label: `${label}: k_cytos` },
      { path: `${prefix}.max_cytoskeleton_length`, label: `${label}: max_cytos_length` },
      { path: `${prefix}.run`, label: `${label}: run probability` },
      { path: `${prefix}.running_speed`, label: `${label}: running_speed` },
      { path: `${prefix}.running_mode`, label: `${label}: running_mode`, isInteger: true },
      { path: `${prefix}.stiffness_apical_apical`, label: `${label}: stiff_apical_apical` },
      { path: `${prefix}.stiffness_apical_apical_div`, label: `${label}: stiff_apical_apical_div` },
      { path: `${prefix}.stiffness_nuclei_apical`, label: `${label}: stiff_nuclei_apical` },
      { path: `${prefix}.stiffness_nuclei_basal`, label: `${label}: stiff_nuclei_basal` },
      { path: `${prefix}.stiffness_repulsion`, label: `${label}: stiff_repulsion` },
      { path: `${prefix}.stiffness_straightness`, label: `${label}: stiff_straightness` },
      { path: `${prefix}.lifespan_start`, label: `${label}: lifespan start` },
      { path: `${prefix}.lifespan_end`, label: `${label}: lifespan end` },
      { path: `${prefix}.INM`, label: `${label}: INM probability` },
      { path: `${prefix}.events.time_A_start`, label: `${label}: time_A start` },
      { path: `${prefix}.events.time_A_end`, label: `${label}: time_A end` },
      { path: `${prefix}.events.time_B_start`, label: `${label}: time_B start` },
      { path: `${prefix}.events.time_B_end`, label: `${label}: time_B end` },
      { path: `${prefix}.events.time_S_start`, label: `${label}: time_S start` },
      { path: `${prefix}.events.time_S_end`, label: `${label}: time_S end` },
      { path: `${prefix}.events.time_P_start`, label: `${label}: time_P start` },
      { path: `${prefix}.events.time_P_end`, label: `${label}: time_P end` },
    );
  }

  return batchParams;
}

/** Static fallback batch parameters (used when params not available) */
export const EHT_BATCH_PARAMETERS: BatchParameterDefinition[] = [
  // General parameters
  { path: 'general.perimeter', label: 'Perimeter' },
  { path: 'general.aspect_ratio', label: 'Aspect ratio' },
  { path: 'general.random_seed', label: 'Random seed', isInteger: true },
  { path: 'general.t_end', label: 't_end (End time)' },

  // Cell property parameters
  { path: 'cell_prop.apical_junction_init', label: 'Apical junction init' },
  { path: 'cell_prop.max_basal_junction_dist', label: 'Max basal junction dist' },
  { path: 'cell_prop.diffusion', label: 'Diffusion' },
];

// Legacy export for backwards compatibility
export const AVAILABLE_PARAMS = EHT_BATCH_PARAMETERS;
