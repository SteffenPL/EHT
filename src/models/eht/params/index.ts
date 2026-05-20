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
  LEGACY_DEFAULT_CONTROL_CELL,
  LEGACY_DEFAULT_EHT_PARAMS,
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

export {
  EHT_PARAM_FORMAT_VERSION,
  LEGACY_MICRONS_PER_UNIT,
  GENERAL_LENGTH_FIELDS,
  CELL_TYPE_LENGTH_FIELDS,
  RUNTIME_CELL_LENGTH_TARGETS,
  isBeforeParamFormatV2,
  isV2OrLater,
  isLengthParameterPath,
  legacyParamsToMicrons,
  micronParamsToLegacy,
} from './unit-conversion';

// Geometry utilities
export {
  type EllipseGeometry,
  ramanujanPerimeter,
  computeEllipseFromPerimeter,
} from './geometry';
