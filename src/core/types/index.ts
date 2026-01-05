/**
 * Core types - public API exports
 */

// Parameter types
export type {
  RGBColor,
  Range,
  EMTEventTimes,
  CellTypeParams,
  GeneralParams,
  CellPropertyParams,
  CellTypesMap,
  SimulationParams,
  PartialSimulationParams,
  DeepPartial,
} from './params';

// State types
export {
  CellPhase,
} from './state';

export type {
  ApicalLink,
  BasalLink,
  CellState,
  SimulationState,
} from './state';

export {
  createInitialState,
} from './state';

// Output types
export type {
  CellSnapshot,
  TimeSnapshot,
  SimulationOutput,
} from './output';
