/**
 * Zod schemas for parameter validation.
 * Provides runtime validation for loaded parameters.
 */
import { z } from 'zod';

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
  time_A: rangeSchema,
  time_B: rangeSchema,
  time_S: rangeSchema,
  time_P: rangeSchema,
});

/** Cell type schema */
export const cellTypeSchema = z.object({
  name: z.string(),
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
  lifespan: rangeSchema,
  INM: z.number().min(0).max(1),
  hetero: z.boolean(),
  events: emtEventTimesSchema,
});

/** General params schema */
export const generalParamsSchema = z.object({
  t_end: z.number().positive(),
  dt: z.number().positive(),
  random_seed: z.number().int(),
  N_init: z.number().int().positive(),
  N_max: z.number().int().positive(),
  N_emt: z.number().int().nonnegative(),
  w_init: z.number().positive(),
  h_init: z.number().positive(),
  mu: z.number().positive(),
  n_substeps: z.number().int().positive(),
  alg_dt: z.number().positive(),
  w_screen: z.number().positive(),
  h_screen: z.number().positive(),
  p_div_out: z.number().min(0).max(1),
  curvature: z.number(),
});

/** Cell property params schema */
export const cellPropertyParamsSchema = z.object({
  apical_junction_init: z.number().nonnegative(),
  max_basal_junction_dist: z.number().positive(),
  basal_daming_ratio: z.number().nonnegative(),
  basal_membrane_repulsion: z.number().nonnegative(),
  cytos_init: z.number().nonnegative(),
  diffusion: z.number().nonnegative(),
});

/** Cell types map schema */
export const cellTypesMapSchema = z.object({
  control: cellTypeSchema,
  emt: cellTypeSchema,
}).catchall(cellTypeSchema);

/** Complete simulation params schema */
export const simulationParamsSchema = z.object({
  general: generalParamsSchema,
  cell_prop: cellPropertyParamsSchema,
  cell_types: cellTypesMapSchema,
});

/** Partial schemas for input validation (allows missing fields) */
export const partialGeneralParamsSchema = generalParamsSchema.partial();
export const partialCellPropertyParamsSchema = cellPropertyParamsSchema.partial();
export const partialCellTypeSchema = cellTypeSchema.partial();
export const partialSimulationParamsSchema = z.object({
  general: partialGeneralParamsSchema.optional(),
  cell_prop: partialCellPropertyParamsSchema.optional(),
  cell_types: z.record(z.string(), partialCellTypeSchema).optional(),
});

/** Type inference from schemas */
export type ValidatedSimulationParams = z.infer<typeof simulationParamsSchema>;
export type ValidatedPartialParams = z.infer<typeof partialSimulationParamsSchema>;

/**
 * Validate complete simulation parameters.
 * @throws ZodError if validation fails
 */
export function validateParams(params: unknown): ValidatedSimulationParams {
  return simulationParamsSchema.parse(params);
}

/**
 * Validate partial parameters (for loading from TOML).
 * @throws ZodError if validation fails
 */
export function validatePartialParams(params: unknown): ValidatedPartialParams {
  return partialSimulationParamsSchema.parse(params);
}

/**
 * Safe validation that returns result object instead of throwing.
 */
export function safeValidateParams(params: unknown) {
  return simulationParamsSchema.safeParse(params);
}

export function safeValidatePartialParams(params: unknown) {
  return partialSimulationParamsSchema.safeParse(params);
}
