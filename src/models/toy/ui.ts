/**
 * Toy model UI configuration.
 */

import type { BatchParameterDefinition } from '@/core/registry/types';

// Re-export UI components
export { toyUI, ToyParametersTab, ToySimulationTab } from './ui/index';

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
