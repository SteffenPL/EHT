/**
 * Migration utilities for EHT params v1.3.0 → v1.4.0.
 * - Adds default_cell_cycle_reset event to general.default_events
 * - EMT cell types skip default_cell_division (preserves reset-only behavior)
 */

import type { EHTParams, EHTCellTypeParams, SpecialEvent } from './types';
import { CellCyclePhase } from './types';

/**
 * Check if params need migration to v1.4.0.
 */
export function needsV1_4_0Migration(params: EHTParams): boolean {
  const version = params.metadata?.version;
  if (version === '1.4.0') {
    return false;
  }
  return version === '1.3.0';
}

/**
 * Migrate EHT params from v1.3.0 to v1.4.0.
 * - Adds cell_cycle_reset as a default event (fallback after cell_division)
 * - EMT cell types get 'default_cell_division' in skip_default_events
 */
export function migrateV1_3_0toV1_4_0(params: EHTParams): EHTParams {
  const migrated = structuredClone(params);

  migrated.metadata.version = '1.4.0';

  // Add default_cell_cycle_reset if not present
  const defaultEvents = migrated.general.default_events ?? [];
  if (!defaultEvents.some(e => e.id === 'default_cell_cycle_reset')) {
    defaultEvents.push({
      type: 'special',
      id: 'default_cell_cycle_reset',
      name: 'Cell Cycle Reset',
      start: 0,
      end: Infinity,
      period: 0,
      probability: '1',
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Division,
      special_name: 'cell_cycle_reset',
    } as SpecialEvent);
    migrated.general.default_events = defaultEvents;
  }

  // For cell types named 'emt', add 'default_cell_division' to skip_default_events
  for (const [typeName, cellType] of Object.entries(migrated.cell_types)) {
    const ct = cellType as EHTCellTypeParams;
    if (typeName === 'emt') {
      if (!ct.skip_default_events) {
        ct.skip_default_events = [];
      }
      if (!ct.skip_default_events.includes('default_cell_division')) {
        ct.skip_default_events.push('default_cell_division');
      }
    }
  }

  return migrated;
}

/**
 * Ensure params are in v1.4.0 format.
 * If already v1.4.0+, returns as-is. Otherwise, migrates from v1.3.0.
 */
export function ensureV1_4_0(params: EHTParams): EHTParams {
  if (needsV1_4_0Migration(params)) {
    console.log('[Migration] Converting EHT params from v1.3.0 to v1.4.0');
    return migrateV1_3_0toV1_4_0(params);
  }
  return params;
}
