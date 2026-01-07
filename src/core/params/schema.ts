/**
 * Zod schemas for parameter validation.
 *
 * This file re-exports from the EHT model for backwards compatibility.
 * For new code, prefer importing directly from @/models/eht.
 */

// Re-export everything from the EHT model schema
export {
  rgbColorSchema,
  rangeSchema,
  emtEventTimesSchema,
  ehtCellTypeSchema as cellTypeSchema,
  ehtGeneralParamsSchema as generalParamsSchema,
  ehtCellPropertyParamsSchema as cellPropertyParamsSchema,
  ehtCellTypesMapSchema as cellTypesMapSchema,
  ehtParamsSchema as simulationParamsSchema,
  partialEhtParamsSchema as partialSimulationParamsSchema,
  validateEHTParams as validateParams,
  validatePartialEHTParams as validatePartialParams,
  safeValidateEHTParams as safeValidateParams,
  safeValidatePartialEHTParams as safeValidatePartialParams,
  type ValidatedEHTParams as ValidatedSimulationParams,
  type ValidatedPartialEHTParams as ValidatedPartialParams,
} from '@/models/eht/params/schema';
