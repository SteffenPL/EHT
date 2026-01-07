/**
 * Core parameter type definitions.
 *
 * This file re-exports types from the registry and EHT model for backwards compatibility.
 * For new code, prefer importing directly from @/core/registry or @/models/eht.
 */

// Re-export base types from registry
export type {
  RGBColor,
  Range,
  ParamsMetadata,
  BaseSimulationParams,
  BaseGeneralParams,
  DeepPartial,
} from '../registry/types';

// Re-export EHT-specific types for backwards compatibility
// These are the legacy type names that existing code uses
export type {
  EMTEventTimes,
  EHTCellTypeParams as CellTypeParams,
  EHTGeneralParams as GeneralParams,
  EHTCellPropertyParams as CellPropertyParams,
  EHTCellTypesMap as CellTypesMap,
  EHTParams as SimulationParams,
  PartialEHTParams as PartialSimulationParams,
} from '@/models/eht/params/types';
