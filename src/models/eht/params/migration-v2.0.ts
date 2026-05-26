/**
 * Migration utilities for EHT params v1.x → v2.0.0.
 * Public v2 parameter files store length-like fields in microns while the
 * current simulation engine continues to run legacy-scaled values internally.
 */

import type { EHTParams, EventDefinition, ParameterChangeEvent } from './types';
import {
  EHT_PARAM_FORMAT_VERSION,
  isBeforeParamFormatV2,
  isCellTypeLengthField,
  isGeneralLengthField,
  isRuntimeCellLengthTarget,
  legacyParamsToMicrons,
} from './unit-conversion';
import { normalizeExternalForces } from './external-forces';

function appendUnique(existing: string[] | undefined, values: string[]): string[] {
  return Array.from(new Set([...(existing ?? []), ...values]));
}

function isParameterChangeEvent(event: EventDefinition): event is ParameterChangeEvent {
  return event.type === 'parameter_change';
}

function collectFormulaCurationWarnings(params: EHTParams): string[] {
  const warnings: string[] = [];

  for (const field of Object.keys(params.general.formulas ?? {})) {
    if (isGeneralLengthField(field)) {
      warnings.push(`Review formula for general.${field}; v2 stores this target in microns.`);
    }
  }

  for (const event of params.general.global_events ?? []) {
    if (event.id.startsWith('__formula_')) continue;
    if (event.target_parameter.startsWith('general.')) {
      const field = event.target_parameter.slice('general.'.length);
      if (isGeneralLengthField(field)) {
        warnings.push(`Review global event ${event.id}; ${event.target_parameter} is micron-facing in v2.`);
      }
    }
  }

  for (const [typeName, cellType] of Object.entries(params.cell_types)) {
    for (const field of Object.keys(cellType.formulas ?? {})) {
      if (isCellTypeLengthField(field)) {
        warnings.push(`Review formula for cell_types.${typeName}.${field}; v2 stores this target in microns.`);
      }
    }

    if (normalizeExternalForces(cellType).some((formula) => formula.trim() !== '0')) {
      warnings.push(`Review external_forces for cell_types.${typeName}; spatial variables may need manual unit curation.`);
    }

    for (const event of cellType.events_v2 ?? []) {
      if (!isParameterChangeEvent(event)) continue;
      if (event.id === 'default_R_hard_mitosis') continue;
      if (isRuntimeCellLengthTarget(event.target_parameter)) {
        warnings.push(`Review event ${event.id} on cell_types.${typeName}.${event.target_parameter}; target is length-like in v2.`);
      }
    }
  }

  return warnings;
}

export function needsV2_0Migration(params: EHTParams): boolean {
  return isBeforeParamFormatV2(params.metadata?.version);
}

export function migrateToV2_0(params: EHTParams): EHTParams {
  const sourceVersion = params.metadata?.version ?? '1.0.0';
  const alreadyMicronProfile = params.metadata?.unit_system === 'microns';
  const migrated = alreadyMicronProfile
    ? structuredClone(params)
    : legacyParamsToMicrons(params);

  migrated.metadata = {
    ...migrated.metadata,
    version: EHT_PARAM_FORMAT_VERSION,
    unit_system: 'microns',
    migrated_from: sourceVersion,
    migration_notes: appendUnique(
      migrated.metadata.migration_notes,
      alreadyMicronProfile
        ? ['Preserved curated micron-profile length values while advancing the parameter format to v2.']
        : ['Scaled length-like EHT parameters from legacy simulation units to microns using 5 microns per unit.']
    ),
  };

  const warnings = collectFormulaCurationWarnings(params);
  if (warnings.length > 0) {
    migrated.metadata.curation_warnings = appendUnique(
      migrated.metadata.curation_warnings,
      warnings
    );
  }

  return migrated;
}

export function ensureV2_0(params: EHTParams): EHTParams {
  if (needsV2_0Migration(params)) {
    console.log(`[Migration] Converting EHT params from ${params.metadata?.version ?? '1.0.0'} to ${EHT_PARAM_FORMAT_VERSION}`);
    return migrateToV2_0(params);
  }
  return params;
}
