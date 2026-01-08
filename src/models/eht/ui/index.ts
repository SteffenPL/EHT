/**
 * EHT model UI configuration module.
 */

export { EHT_BATCH_PARAMETERS, AVAILABLE_PARAMS } from './availableParams';

// Model-specific UI components
export { EHTParametersTab } from './ParametersTab';
export { EHTCellTypesTab } from './CellTypesTab';
export { EHTSimulationTab } from './SimulationTab';
export { EHTWarningBanner } from './WarningBanner';

// Model UI object for use in model definition
import type { ModelUI } from '@/core/registry';
import type { EHTParams } from '../params/types';
import { EHTParametersTab } from './ParametersTab';
import { EHTCellTypesTab } from './CellTypesTab';
import { EHTSimulationTab } from './SimulationTab';
import { EHTWarningBanner } from './WarningBanner';

export const ehtUI: ModelUI<EHTParams> = {
  WarningBanner: EHTWarningBanner,
  ParametersTab: EHTParametersTab,
  CellTypesTab: EHTCellTypesTab,
  SimulationTab: EHTSimulationTab,
};
