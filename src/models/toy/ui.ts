/**
 * Toy model UI configuration.
 */

import type { ParameterGroupDefinition, BatchParameterDefinition } from '@/core/registry/types';

/** Parameter groups for the UI panel */
export const TOY_PARAMETER_GROUPS: ParameterGroupDefinition[] = [
  {
    id: 'general',
    label: 'General',
    collapsed: false,
    fields: [
      { path: 'general.N', label: 'Number of Cells', type: 'number', step: 1, isInteger: true },
      { path: 'general.soft_radius', label: 'Soft Radius', type: 'number', step: 0.5 },
      { path: 'general.repulsion_strength', label: 'Repulsion', type: 'number', step: 1 },
      { path: 'general.running_speed', label: 'Running Speed', type: 'number', step: 0.1 },
      { path: 'general.tumble_speed', label: 'Tumble Speed', type: 'number', step: 0.1 },
      { path: 'general.running_duration', label: 'Run Duration', type: 'number', step: 0.5 },
      { path: 'general.tumbling_duration', label: 'Tumble Duration', type: 'number', step: 0.5 },
      { path: 'general.tumbling_period', label: 'Tumble Period', type: 'number', step: 0.1 },
    ],
  },
  {
    id: 'domain',
    label: 'Domain',
    collapsed: true,
    fields: [
      { path: 'general.w_screen', label: 'Domain Width', type: 'number', step: 10 },
      { path: 'general.h_screen', label: 'Domain Height', type: 'number', step: 10 },
    ],
  },
  {
    id: 'simulation',
    label: 'Simulation',
    collapsed: true,
    fields: [
      { path: 'general.t_end', label: 'End Time', type: 'number', step: 1 },
      { path: 'general.dt', label: 'Time Step', type: 'number', step: 0.01 },
      { path: 'general.random_seed', label: 'Random Seed', type: 'number', step: 1, isInteger: true },
      { path: 'general.mu', label: 'Friction', type: 'number', step: 0.1 },
    ],
  },
];

/** Available parameters for batch sweeps */
export const TOY_BATCH_PARAMETERS: BatchParameterDefinition[] = [
  { path: 'general.N', label: 'Number of cells', isInteger: true },
  { path: 'general.soft_radius', label: 'Soft radius' },
  { path: 'general.repulsion_strength', label: 'Repulsion strength' },
  { path: 'general.running_speed', label: 'Running speed' },
  { path: 'general.tumble_speed', label: 'Tumble speed' },
  { path: 'general.running_duration', label: 'Running duration' },
  { path: 'general.tumbling_duration', label: 'Tumbling duration' },
  { path: 'general.tumbling_period', label: 'Tumbling period' },
  { path: 'general.random_seed', label: 'Random seed', isInteger: true },
  { path: 'general.t_end', label: 'End time' },
];
