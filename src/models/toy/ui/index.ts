/**
 * Toy model UI configuration module.
 */

// New model-specific UI components
export { ToyParametersTab } from './ParametersTab';
export { ToySimulationTab } from './SimulationTab';

// Model UI object for use in model definition
import type { ModelUI } from '@/core/registry';
import type { ToyParams } from '../params/types';
import { ToyParametersTab } from './ParametersTab';
import { ToySimulationTab } from './SimulationTab';

export const toyUI: ModelUI<ToyParams> = {
  ParametersTab: ToyParametersTab,
  // Toy model doesn't have multiple cell types, so no CellTypesTab
  SimulationTab: ToySimulationTab,
};
