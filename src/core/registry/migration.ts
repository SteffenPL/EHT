/**
 * Migration utilities for handling legacy parameters
 * that don't have model/version metadata.
 */

import type { BaseSimulationParams, ParamsMetadata } from './types';
import { modelRegistry } from './registry';

/** Default metadata for legacy params (pre-versioning) */
const LEGACY_METADATA: ParamsMetadata = {
  model: 'EHT',
  version: '1.0.0',
};

/**
 * Type guard to check if params have metadata.
 */
export function hasMetadata(params: unknown): params is { metadata: ParamsMetadata } {
  return (
    typeof params === 'object' &&
    params !== null &&
    'metadata' in params &&
    typeof (params as Record<string, unknown>).metadata === 'object' &&
    (params as Record<string, unknown>).metadata !== null &&
    typeof ((params as Record<string, unknown>).metadata as Record<string, unknown>).model === 'string' &&
    typeof ((params as Record<string, unknown>).metadata as Record<string, unknown>).version === 'string'
  );
}

/**
 * Extract metadata from params, returning default legacy metadata if not present.
 */
export function getMetadata(params: unknown): ParamsMetadata {
  if (hasMetadata(params)) {
    return params.metadata;
  }
  return LEGACY_METADATA;
}

/**
 * Migrate legacy params (pre-versioning) to versioned format.
 * Adds EHT v1.0.0 metadata if missing.
 */
export function migrateLegacyParams<T extends BaseSimulationParams>(
  params: unknown
): T {
  if (hasMetadata(params)) {
    return params as T;
  }

  // Legacy params without metadata are assumed to be EHT v1.0.0
  const legacyParams = params as Record<string, unknown>;

  return {
    metadata: { ...LEGACY_METADATA },
    ...legacyParams,
  } as T;
}

/**
 * Get the appropriate model for the given params.
 * Handles legacy migration and version compatibility.
 */
export function getModelForParams(params: unknown) {
  const metadata = getMetadata(params);
  return modelRegistry.findCompatibleModel(metadata);
}

/**
 * Ensure params have metadata, adding default if missing.
 * Returns a new object with metadata guaranteed.
 */
export function ensureMetadata<T extends BaseSimulationParams>(
  params: Partial<T> | unknown,
  defaultModel?: string,
  defaultVersion?: string
): T & { metadata: ParamsMetadata } {
  if (hasMetadata(params)) {
    return params as T & { metadata: ParamsMetadata };
  }

  return {
    ...(params as object),
    metadata: {
      model: defaultModel ?? LEGACY_METADATA.model,
      version: defaultVersion ?? LEGACY_METADATA.version,
    },
  } as T & { metadata: ParamsMetadata };
}
