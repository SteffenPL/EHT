/**
 * Toy model Zod validation schema.
 */

import { z } from 'zod';

/** Boundary type schema */
const boundaryTypeSchema = z.enum(['periodic', 'box', 'none']);

/** General params schema */
const toyGeneralSchema = z.object({
  // Toy-specific
  N: z.number().int().positive(),
  soft_radius: z.number().positive(),
  repulsion_strength: z.number().nonnegative(),
  running_speed: z.number().nonnegative(),
  tumble_speed: z.number().nonnegative(),
  running_duration: z.number().positive(),
  tumbling_duration: z.number().positive(),
  tumbling_period: z.number().positive(),
  boundary_type: boundaryTypeSchema,
  domain_size: z.tuple([z.number().positive(), z.number().positive()]),
  // Base params
  t_end: z.number().positive(),
  dt: z.number().positive(),
  random_seed: z.number().int(),
  mu: z.number().positive(),
  n_substeps: z.number().int().positive(),
  N_max: z.number().int().positive(),
  w_screen: z.number().positive(),
  h_screen: z.number().positive(),
});

/** Metadata schema */
const metadataSchema = z.object({
  model: z.literal('Toy'),
  version: z.string(),
});

/** Complete Toy params schema */
export const toyParamsSchema = z.object({
  metadata: metadataSchema,
  general: toyGeneralSchema,
});

export type ToyParamsSchema = z.infer<typeof toyParamsSchema>;
