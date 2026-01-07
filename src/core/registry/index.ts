/**
 * Model registry module.
 * Provides infrastructure for multi-model support with versioning.
 */

// Version utilities
export {
  type SemanticVersion,
  parseVersion,
  compareVersions,
  isCompatible,
  formatVersion,
} from './version';

// Type definitions
export {
  type ParamsMetadata,
  type RGBColor,
  type Range,
  type BaseGeneralParams,
  type BaseSimulationParams,
  type CellForces as ModelCellForces,  // Renamed to avoid conflict with simulation CellForces
  type ParameterFieldDefinition,
  type ParameterGroupDefinition,
  type BatchParameterDefinition,
  type StatisticDefinition,
  type ModelDefinition,
  type ModelRenderConfig,
  type DeepPartial,
  type PartialParams,
} from './types';

// Registry
export { modelRegistry } from './registry';

// Migration utilities
export {
  hasMetadata,
  getMetadata,
  migrateLegacyParams,
  getModelForParams,
  ensureMetadata,
} from './migration';
