/**
 * Core types - public API exports
 */

// Parameter types
// (These might need to be generic or moved, but keeping for now if file exists and is generic enough)
// Actually params definitions were likely EHT specific too if they had CellTypeParams etc.
// But I haven't deleted core/types/params.ts yet.

export type {
  RGBColor,
  Range,
  // EMTEventTimes, CellTypeParams etc heavily suggest EHT.
  // I should check params.ts content later.
  DeepPartial,
} from '@/core/registry/types'; // Using registry generic types instead if possible

// State types
export type {
  BaseSimulationState
} from './state';
