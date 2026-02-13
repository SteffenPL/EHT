/**
 * Migration utilities for EHT params v1.1.0 → v1.2.0.
 * Adds strain parameters, skip_default_events, and default_events.
 */

import type { EHTParams, EHTCellTypeParams } from './types';

/**
 * Check if params need migration to v1.2.0.
 */
export function needsV1_2_0Migration(params: EHTParams): boolean {
  // Already at v1.2.0 or later
  if (params.metadata?.version === '1.2.0') {
    return false;
  }

  // Check if general has default_events (v1.2.0 field)
  if ('default_events' in params.general) {
    return false;
  }

  return true;
}

/**
 * Migrate EHT params from v1.1.0 to v1.2.0.
 * Adds:
 * - general.default_events: []
 * - cell_type.apical_cytos_strain_init: 0
 * - cell_type.basal_cytos_strain_init: 0
 * - cell_type.skip_default_events: []
 */
export function migrateV1_1_0toV1_2_0(params: EHTParams): EHTParams {
  const migrated = structuredClone(params);

  // Update metadata version
  migrated.metadata.version = '1.2.0';

  // Add default_events to general
  if (!('default_events' in migrated.general)) {
    (migrated.general as any).default_events = [];
  }

  // Add strain inits and skip_default_events to each cell type
  for (const cellType of Object.values(migrated.cell_types)) {
    const ct = cellType as EHTCellTypeParams;

    if (!('apical_cytos_strain_init' in ct)) {
      (ct as any).apical_cytos_strain_init = 0;
    }
    if (!('basal_cytos_strain_init' in ct)) {
      (ct as any).basal_cytos_strain_init = 0;
    }
    if (!('skip_default_events' in ct)) {
      (ct as any).skip_default_events = [];
    }
  }

  return migrated;
}

/**
 * Ensure params are in v1.2.0 format.
 * If already v1.2.0+, returns as-is. Otherwise, migrates from v1.1.0.
 */
export function ensureV1_2_0(params: EHTParams): EHTParams {
  if (needsV1_2_0Migration(params)) {
    console.log('[Migration] Converting EHT params from v1.1.0 to v1.2.0');
    return migrateV1_1_0toV1_2_0(params);
  }
  return params;
}
