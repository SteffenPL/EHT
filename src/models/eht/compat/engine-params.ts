import type { EHTParams } from '../params/types';
import { isV2OrLater, micronParamsToLegacy } from '../params/unit-conversion';

/**
 * Convert public EHT params into the legacy engine-unit view used by the
 * current mechanics. The returned object is always a clone and is safe to
 * mutate as simulation-local state.
 */
export function toEHTEngineParams(params: EHTParams): EHTParams {
  if (params.metadata?.unit_system === 'legacy-engine') {
    return structuredClone(params);
  }

  if (!isV2OrLater(params.metadata?.version)) {
    return structuredClone(params);
  }

  const engineParams = micronParamsToLegacy(params);
  engineParams.metadata = {
    ...engineParams.metadata,
    unit_system: 'legacy-engine' as EHTParams['metadata']['unit_system'],
  };
  return engineParams;
}

export function isPublicMicronParams(params: EHTParams): boolean {
  return isV2OrLater(params.metadata?.version)
    && params.metadata?.unit_system !== 'legacy-engine';
}
