/**
 * Parameters - public API exports
 */

export {
  DEFAULT_PARAMS,
  DEFAULT_CONTROL_CELL,
  DEFAULT_EMT_CELL,
  createDefaultParams,
  PARAM_PRESETS,
} from './defaults';

export {
  DEFAULT_TIME_SAMPLES,
  createDefaultSimulationConfig,
} from './config';
export type { SimulationConfig } from './config';

export {
  simulationParamsSchema,
  cellTypeSchema,
  generalParamsSchema,
  cellPropertyParamsSchema,
  validateParams,
  validatePartialParams,
  safeValidateParams,
  safeValidatePartialParams,
} from './schema';

export {
  mergeWithDefaults,
  getNestedValue,
  setNestedValue,
  applyOverrides,
} from './merge';

export {
  parseToml,
  parseTomlWithDefaults,
  parseAndValidateToml,
  safeParseToml,
  toToml,
  toMinimalToml,
  loadTomlFromUrl,
  parseTomlWithRanges,
  toTomlWithRanges,
  parseSimulationConfigToml,
  toSimulationConfigToml,
} from './toml';

export type { TomlParseResult } from './toml';
