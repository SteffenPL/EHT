/**
 * Zod schemas for EHT parameter validation.
 * Provides runtime validation for loaded parameters.
 */

import { z } from 'zod';

/** Metadata schema */
export const metadataSchema = z.object({
  model: z.string(),
  version: z.string(),
});

/** RGB color schema */
export const rgbColorSchema = z.object({
  r: z.number().min(0).max(255),
  g: z.number().min(0).max(255),
  b: z.number().min(0).max(255),
});

/** Range schema */
export const rangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

/** EMT event times schema */
export const emtEventTimesSchema = z.object({
  time_A_start: z.number(),
  time_A_end: z.number(),
  time_B_start: z.number(),
  time_B_end: z.number(),
  time_S_start: z.number(),
  time_S_end: z.number(),
  time_P_start: z.number(),
  time_P_end: z.number(),
});

/** Cell type schema */
export const ehtCellTypeSchema = z.object({
  N_init: z.number().int().nonnegative(),
  location: z.string(),
  R_hard: z.number().positive(),
  R_hard_div: z.number().positive(),
  R_soft: z.number().positive(),
  color: rgbColorSchema,
  dur_G2: z.number().nonnegative(),
  dur_mitosis: z.number().nonnegative(),
  k_apical_junction: z.number().nonnegative(),
  k_cytos: z.number().nonnegative(),
  max_cytoskeleton_length: z.number().nonnegative(),
  run: z.number().min(0).max(1),
  running_speed: z.number().nonnegative(),
  running_mode: z.number().int().min(0).max(3),
  stiffness_apical_apical: z.number().nonnegative(),
  stiffness_apical_apical_div: z.number().nonnegative(),
  stiffness_nuclei_apical: z.number().nonnegative(),
  stiffness_nuclei_basal: z.number().nonnegative(),
  stiffness_repulsion: z.number().nonnegative(),
  stiffness_straightness: z.number().nonnegative(),
  lifespan_start: z.number(),
  lifespan_end: z.number(),
  INM: z.number().min(0).max(1),
  hetero: z.boolean(),
  events: emtEventTimesSchema,
  // Per-cell-type properties
  diffusion: z.number().nonnegative(),
  basal_damping_ratio: z.number().nonnegative(),
  max_basal_junction_dist: z.number().positive(),
  cytos_init: z.number().nonnegative(),
  basal_membrane_repulsion: z.number().nonnegative(),
  apical_junction_init: z.number().nonnegative(),
});

/** General params schema */
export const ehtGeneralParamsSchema = z.object({
  t_end: z.number().positive(),
  dt: z.number().positive(),
  random_seed: z.number().int(),
  full_circle: z.boolean(),
  w_init: z.number().positive(),
  h_init: z.number().positive(),
  mu: z.number().positive(),
  n_substeps: z.number().int().positive(),
  alg_dt: z.number().positive(),
  w_screen: z.number().positive(),
  h_screen: z.number().positive(),
  p_div_out: z.number().min(0).max(1),
  perimeter: z.number().positive(),           // Ellipse perimeter (only used when aspect != 0)
  aspect_ratio: z.number(),                   // 0=line, >0=curve above, <0=curve below; |aspect|=b/a
});

/** Cell property params schema (legacy - empty, properties moved to cell types) */
export const ehtCellPropertyParamsSchema = z.object({
  // All properties moved to per-cell-type in ehtCellTypeSchema
});

/** Cell types map schema - any keys allowed */
export const ehtCellTypesMapSchema = z.record(z.string(), ehtCellTypeSchema);

/** Complete EHT simulation params schema */
export const ehtParamsSchema = z.object({
  metadata: metadataSchema,
  general: ehtGeneralParamsSchema,
  cell_prop: ehtCellPropertyParamsSchema,
  cell_types: ehtCellTypesMapSchema,
});

/** Partial schemas for input validation (allows missing fields) */
export const partialMetadataSchema = metadataSchema.partial();
export const partialEhtGeneralParamsSchema = ehtGeneralParamsSchema.partial();
export const partialEhtCellPropertyParamsSchema = ehtCellPropertyParamsSchema.partial();
export const partialEhtCellTypeSchema = ehtCellTypeSchema.partial();
export const partialEhtParamsSchema = z.object({
  metadata: partialMetadataSchema.optional(),
  general: partialEhtGeneralParamsSchema.optional(),
  cell_prop: partialEhtCellPropertyParamsSchema.optional(),
  cell_types: z.record(z.string(), partialEhtCellTypeSchema).optional(),
});

/** Type inference from schemas */
export type ValidatedEHTParams = z.infer<typeof ehtParamsSchema>;
export type ValidatedPartialEHTParams = z.infer<typeof partialEhtParamsSchema>;

/**
 * Validate complete EHT simulation parameters.
 * @throws ZodError if validation fails
 */
export function validateEHTParams(params: unknown): ValidatedEHTParams {
  return ehtParamsSchema.parse(params);
}

/**
 * Validate partial EHT parameters (for loading from TOML).
 * @throws ZodError if validation fails
 */
export function validatePartialEHTParams(params: unknown): ValidatedPartialEHTParams {
  return partialEhtParamsSchema.parse(params);
}

/**
 * Safe validation that returns result object instead of throwing.
 */
export function safeValidateEHTParams(params: unknown) {
  return ehtParamsSchema.safeParse(params);
}

export function safeValidatePartialEHTParams(params: unknown) {
  return partialEhtParamsSchema.safeParse(params);
}

// Legacy exports for backwards compatibility
export const cellTypeSchema = ehtCellTypeSchema;
export const generalParamsSchema = ehtGeneralParamsSchema;
export const cellPropertyParamsSchema = ehtCellPropertyParamsSchema;
export const cellTypesMapSchema = ehtCellTypesMapSchema;
export const simulationParamsSchema = ehtParamsSchema;
export const validateParams = validateEHTParams;
export const validatePartialParams = validatePartialEHTParams;
export const safeValidateParams = safeValidateEHTParams;
export const safeValidatePartialParams = safeValidatePartialEHTParams;
