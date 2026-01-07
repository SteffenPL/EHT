/**
 * EHT model parameters module.
 */

// Types
export type {
  RGBColor,
  Range,
  EMTEventTimes,
  EHTCellTypeParams,
  EHTGeneralParams,
  EHTCellPropertyParams,
  EHTCellTypesMap,
  EHTParams,
  PartialEHTParams,
  // Legacy type aliases
  CellTypeParams,
  GeneralParams,
  CellPropertyParams,
  CellTypesMap,
  SimulationParams,
} from './types';

// Defaults
export {
  DEFAULT_CONTROL_CELL,
  DEFAULT_EMT_CELL,
  DEFAULT_EHT_PARAMS,
  createDefaultEHTParams,
  EHT_PRESETS,
  // Legacy exports
  DEFAULT_PARAMS,
  PARAM_PRESETS,
  createDefaultParams,
} from './defaults';

// Schema
export {
  metadataSchema,
  rgbColorSchema,
  rangeSchema,
  emtEventTimesSchema,
  ehtCellTypeSchema,
  ehtGeneralParamsSchema,
  ehtCellPropertyParamsSchema,
  ehtCellTypesMapSchema,
  ehtParamsSchema,
  partialEhtParamsSchema,
  validateEHTParams,
  validatePartialEHTParams,
  safeValidateEHTParams,
  safeValidatePartialEHTParams,
  // Legacy exports
  cellTypeSchema,
  generalParamsSchema,
  cellPropertyParamsSchema,
  cellTypesMapSchema,
  simulationParamsSchema,
  validateParams,
  validatePartialParams,
  safeValidateParams,
  safeValidatePartialParams,
} from './schema';
