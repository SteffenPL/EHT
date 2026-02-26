/**
 * Migration utilities for EHT params v1.4.0 → v1.5.0.
 * - Converts old inactive sentinel (start=Infinity, end=Infinity) to new sentinel (end=-1)
 * - Renames 'apical_constriction' special event to 'lose_apical_interface'
 * - Applies to general.default_events and all cell_types[*].events_v2
 */

import type { EHTParams, EHTCellTypeParams, EventDefinition, SpecialEvent } from './types';

/**
 * Check if params need migration to v1.5.0.
 */
export function needsV1_5_0Migration(params: EHTParams): boolean {
  const version = params.metadata?.version;
  if (version === '1.5.0') {
    return false;
  }
  return version === '1.4.0';
}

/**
 * Convert old inactive sentinel values and rename deprecated events in an event list.
 * - Where start === Infinity && end === Infinity → set start: 0, end: -1
 * - Rename 'apical_constriction' → 'lose_apical_interface'
 */
function migrateEvents(events: EventDefinition[]): void {
  for (const event of events) {
    if (event.start === Infinity && event.end === Infinity) {
      event.start = 0;
      event.end = -1;
    }
    // Rename apical_constriction → lose_apical_interface
    if (event.type === 'special') {
      const special = event as SpecialEvent;
      if ((special.special_name as string) === 'apical_constriction') {
        special.special_name = 'lose_apical_interface';
        if (special.id === 'apical_constriction') {
          special.id = 'lose_apical_interface';
        }
        if (special.name === 'Apical Constriction') {
          special.name = 'Lose Apical Interface';
        }
      }
    }
  }
}

/**
 * Migrate EHT params from v1.4.0 to v1.5.0.
 * Converts old inactive sentinel (Infinity, Infinity) to new sentinel (end = -1).
 */
export function migrateV1_4_0toV1_5_0(params: EHTParams): EHTParams {
  const migrated = structuredClone(params);

  migrated.metadata.version = '1.5.0';

  // Migrate default events
  if (migrated.general.default_events) {
    migrateEvents(migrated.general.default_events);
  }

  // Migrate per-cell-type events
  for (const cellType of Object.values(migrated.cell_types)) {
    const ct = cellType as EHTCellTypeParams;
    if (ct.events_v2) {
      migrateEvents(ct.events_v2);
    }
  }

  return migrated;
}

/**
 * Ensure params are in v1.5.0 format.
 * If already v1.5.0+, returns as-is. Otherwise, migrates from v1.4.0.
 */
export function ensureV1_5_0(params: EHTParams): EHTParams {
  if (needsV1_5_0Migration(params)) {
    console.log('[Migration] Converting EHT params from v1.4.0 to v1.5.0');
    return migrateV1_4_0toV1_5_0(params);
  }
  return params;
}
