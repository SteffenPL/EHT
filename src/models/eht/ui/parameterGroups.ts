/**
 * EHT model parameter groups for UI panel.
 * Defines how parameters are organized and displayed.
 */

import type { ParameterGroupDefinition } from '@/core/registry/types';

/** EHT parameter groups for the parameter panel */
export const EHT_PARAMETER_GROUPS: ParameterGroupDefinition[] = [
  {
    id: 'general',
    label: 'General',
    fields: [
      { path: 'general.t_end', label: 'End Time', type: 'number', step: 1 },
      { path: 'general.dt', label: 'Time Step', type: 'number', step: 0.01 },
      { path: 'general.random_seed', label: 'Random Seed', type: 'number', step: 1, isInteger: true },
      { path: 'general.full_circle', label: 'Full Circle', type: 'boolean' },
      { path: 'general.N_init', label: 'Initial Cells', type: 'number', step: 1, isInteger: true },
      { path: 'general.N_max', label: 'Max Cells', type: 'number', step: 1, isInteger: true },
      { path: 'general.N_emt', label: 'EMT Cells', type: 'number', step: 1, isInteger: true },
      { path: 'general.w_init', label: 'Initial Width', type: 'number', step: 1 },
      { path: 'general.h_init', label: 'Initial Height', type: 'number', step: 0.1 },
      { path: 'general.mu', label: 'Friction', type: 'number', step: 0.01 },
      { path: 'general.n_substeps', label: 'Substeps', type: 'number', step: 1, isInteger: true },
      { path: 'general.alg_dt', label: 'Algo Time Step', type: 'number', step: 0.001 },
      { path: 'general.w_screen', label: 'Screen Width', type: 'number', step: 10 },
      { path: 'general.h_screen', label: 'Screen Height', type: 'number', step: 10 },
      { path: 'general.p_div_out', label: 'Division Prob.', type: 'number', step: 0.01, min: 0, max: 1 },
      { path: 'general.curvature_1', label: 'Curvature 1', type: 'number', step: 0.001 },
      { path: 'general.curvature_2', label: 'Curvature 2', type: 'number', step: 0.001 },
    ],
  },
  {
    id: 'cell_prop',
    label: 'Cell Properties',
    collapsed: true,
    fields: [
      { path: 'cell_prop.apical_junction_init', label: 'Apical Junc Init', type: 'number', step: 0.1 },
      { path: 'cell_prop.max_basal_junction_dist', label: 'Max Basal Dist', type: 'number', step: 0.1 },
      { path: 'cell_prop.basal_daming_ratio', label: 'Basal Damping', type: 'number', step: 0.1 },
      { path: 'cell_prop.basal_membrane_repulsion', label: 'Basal Repulsion', type: 'number', step: 0.1 },
      { path: 'cell_prop.cytos_init', label: 'Cytos Init', type: 'number', step: 0.1 },
      { path: 'cell_prop.diffusion', label: 'Diffusion', type: 'number', step: 0.01 },
    ],
  },
  {
    id: 'control_cells',
    label: 'Control Cells',
    fields: [
      { path: 'cell_types.control.R_hard', label: 'R Hard', type: 'number', step: 0.1 },
      { path: 'cell_types.control.R_soft', label: 'R Soft', type: 'number', step: 0.1 },
      { path: 'cell_types.control.color', label: 'Color', type: 'color' },
      { path: 'cell_types.control.k_apical_junction', label: 'k Apical', type: 'number', step: 0.1 },
      { path: 'cell_types.control.k_cytos', label: 'k Cytos', type: 'number', step: 0.1 },
      { path: 'cell_types.control.stiffness_apical_apical', label: 'Stiff AA', type: 'number', step: 0.1 },
      { path: 'cell_types.control.stiffness_nuclei_apical', label: 'Stiff NA', type: 'number', step: 0.1 },
      { path: 'cell_types.control.stiffness_nuclei_basal', label: 'Stiff NB', type: 'number', step: 0.1 },
      { path: 'cell_types.control.stiffness_repulsion', label: 'Stiff Repulsion', type: 'number', step: 0.1 },
      { path: 'cell_types.control.stiffness_straightness', label: 'Stiff Straight', type: 'number', step: 0.1 },
      { path: 'cell_types.control.lifespan', label: 'Lifespan', type: 'range' },
    ],
  },
  {
    id: 'emt_cells',
    label: 'EMT Cells',
    fields: [
      { path: 'cell_types.emt.R_hard', label: 'R Hard', type: 'number', step: 0.1 },
      { path: 'cell_types.emt.R_soft', label: 'R Soft', type: 'number', step: 0.1 },
      { path: 'cell_types.emt.color', label: 'Color', type: 'color' },
      { path: 'cell_types.emt.k_apical_junction', label: 'k Apical', type: 'number', step: 0.1 },
      { path: 'cell_types.emt.k_cytos', label: 'k Cytos', type: 'number', step: 0.1 },
      { path: 'cell_types.emt.stiffness_apical_apical', label: 'Stiff AA', type: 'number', step: 0.1 },
      { path: 'cell_types.emt.stiffness_nuclei_apical', label: 'Stiff NA', type: 'number', step: 0.1 },
      { path: 'cell_types.emt.stiffness_nuclei_basal', label: 'Stiff NB', type: 'number', step: 0.1 },
      { path: 'cell_types.emt.stiffness_repulsion', label: 'Stiff Repulsion', type: 'number', step: 0.1 },
      { path: 'cell_types.emt.stiffness_straightness', label: 'Stiff Straight', type: 'number', step: 0.1 },
      { path: 'cell_types.emt.lifespan', label: 'Lifespan', type: 'range' },
      { path: 'cell_types.emt.events.time_A', label: 'Time A (lose apical)', type: 'range' },
      { path: 'cell_types.emt.events.time_B', label: 'Time B (lose basal)', type: 'range' },
      { path: 'cell_types.emt.events.time_S', label: 'Time S (lose straightness)', type: 'range' },
      { path: 'cell_types.emt.events.time_P', label: 'Time P (start running)', type: 'range' },
    ],
  },
];
