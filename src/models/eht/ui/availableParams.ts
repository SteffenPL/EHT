/**
 * EHT model available parameters for batch sweeps.
 */

import type { BatchParameterDefinition } from '@/core/registry/types';

/** Available EHT parameters for batch sweeps */
export const EHT_BATCH_PARAMETERS: BatchParameterDefinition[] = [
  // General parameters
  { path: 'general.N_emt', label: 'N_emt (EMT cell count)', isInteger: true },
  { path: 'general.N_init', label: 'N_init (Initial cells)', isInteger: true },
  { path: 'general.curvature_1', label: 'Curvature 1 (horizontal)' },
  { path: 'general.curvature_2', label: 'Curvature 2 (vertical)' },
  { path: 'general.random_seed', label: 'Random seed', isInteger: true },
  { path: 'general.t_end', label: 't_end (End time)' },

  // Cell property parameters
  { path: 'cell_prop.apical_junction_init', label: 'Apical junction init' },
  { path: 'cell_prop.max_basal_junction_dist', label: 'Max basal junction dist' },
  { path: 'cell_prop.diffusion', label: 'Diffusion' },

  // EMT cell type parameters
  { path: 'cell_types.emt.k_apical_junction', label: 'EMT k_apical_junction' },
  { path: 'cell_types.emt.stiffness_repulsion', label: 'EMT repulsion stiffness' },
  { path: 'cell_types.emt.stiffness_straightness', label: 'EMT straightness stiffness' },
  { path: 'cell_types.emt.running_speed', label: 'EMT Running speed' },
  { path: 'cell_types.emt.events.time_A.min', label: 'EMT time_A min' },
  { path: 'cell_types.emt.events.time_A.max', label: 'EMT time_A max' },
  { path: 'cell_types.emt.events.time_B.min', label: 'EMT time_B min' },
  { path: 'cell_types.emt.events.time_B.max', label: 'EMT time_B max' },

  // Control cell type parameters
  { path: 'cell_types.control.k_apical_junction', label: 'Control k_apical_junction' },
  { path: 'cell_types.control.stiffness_repulsion', label: 'Control repulsion stiffness' },
  { path: 'cell_types.control.stiffness_straightness', label: 'Control straightness stiffness' },
];

// Legacy export for backwards compatibility
export const AVAILABLE_PARAMS = EHT_BATCH_PARAMETERS;
