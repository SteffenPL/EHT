/**
 * V2 Parameter System
 *
 * New simplified, flat parameter format for all models.
 */

// Types
export type {
  // Common types
  RunningMode,
  BoundaryType,
  EventTiming,
  CellLocation,
  BaseParams,

  // EHT types
  EHTParamsV2,
  EHTCellParams,
  EHTCellsConfig,

  // Toy types
  ToyParamsV2,

  // Batch types
  ParamSweep,
  BatchConfigV2,

  // Utility types
  ModelParamsV2,
  DeepPartial,
  PartialEHTParamsV2,
  PartialToyParamsV2,
} from './types';

// Defaults
export {
  DEFAULT_EHT_CELL,
  DEFAULT_EHT_PARAMS_V2,
  DEFAULT_TOY_PARAMS_V2,
  resolveEHTCellParams,
  getCellTypeNames,
  getResolvedCellParams,
} from './defaults';

// Parser
export {
  isV2Format,
  parseColor,
  hexToRgb,
  parseEventTiming,
  parseEventTimingFromStartEnd,
  eventTimingToStartEnd,
  parseRunningMode,
  runningModeToNumber,
  parseEHTParamsV2,
  parseToyParamsV2,
  parseBatchConfig,
  parseParamsToml,
  convertOldEHTParams,
  convertOldToyParams,
  type ParsedParams,
} from './parser';

// Converter
export {
  ehtParamsV2ToOld,
  toyParamsV2ToOld,
  ehtParamsOldToV2,
  toyParamsOldToV2,
} from './converter';

// Serializer
export {
  serializeEHTParamsV2,
  serializeToyParamsV2,
  serializeBatchConfig,
  serializeParamsV2,
} from './serializer';
