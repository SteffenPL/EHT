/**
 * Migration utilities for EHT params v1.2.0 → v1.3.0.
 * - Converts INM probability to strain-based default events
 * - Adds cell division and increase R_hard as default events
 * - INM behavior is now controlled entirely through the event system
 *   rather than direct rest-length overrides in updateCytoskeleton.
 */

import type { EHTParams, EHTCellTypeParams, EventDefinition, ParameterChangeEvent, SpecialEvent } from './types';
import { CellCyclePhase } from './types';

/**
 * Check if params need migration to v1.3.0.
 */
export function needsV1_3_0Migration(params: EHTParams): boolean {
  const version = params.metadata?.version;
  if (version === '1.3.0') {
    return false;
  }
  // Only migrate from v1.2.0
  return version === '1.2.0';
}

/**
 * Migrate EHT params from v1.2.0 to v1.3.0.
 * Adds default events to general.default_events:
 * - Cell division (probability = p_div_out)
 * - Increase R_hard (periodic)
 * - INM contract apical (probability = INM, phase-gated to G2)
 * - INM extend basal (prereq on apical)
 */
export function migrateV1_2_0toV1_3_0(params: EHTParams): EHTParams {
  const migrated = structuredClone(params);

  // Update metadata version
  migrated.metadata.version = '1.3.0';

  // Initialize default_events if missing
  if (!migrated.general.default_events) {
    (migrated.general as any).default_events = [];
  }

  const defaultEvents = migrated.general.default_events as EventDefinition[];

  // Add cell division if not present
  if (!defaultEvents.some(e => e.id === 'default_cell_division')) {
    defaultEvents.push({
      type: 'special',
      id: 'default_cell_division',

      start: 0,
      end: Infinity,
      period: 0,
      probability: 'p_div_out',
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Division,
      special_name: 'cell_division',
    } as SpecialEvent);
  }

  // Add increase R_hard if not present
  if (!defaultEvents.some(e => e.id === 'default_increase_R_hard')) {
    defaultEvents.push({
      type: 'parameter_change',
      id: 'default_increase_R_hard',

      start: 0,
      end: Infinity,
      period: 0.1,
      probability: '1',
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Any,
      target_parameter: 'R_hard',
      formula: 'old_value + 0.01 * dt',
    } as ParameterChangeEvent);
  }

  // Add INM events as default events if not present
  if (!defaultEvents.some(e => e.id === 'inm_contract_apical')) {
    defaultEvents.push({
      type: 'parameter_change',
      id: 'inm_contract_apical',

      start: 0,
      end: 0,
      period: 0,
      probability: 'INM',
      prereq: null,
      cell_cycle_phase: CellCyclePhase.G2,
      target_parameter: 'apical_cytos_strain',
      formula: '-1',
    } as ParameterChangeEvent);
  }

  if (!defaultEvents.some(e => e.id === 'inm_extend_basal')) {
    defaultEvents.push({
      type: 'parameter_change',
      id: 'inm_extend_basal',

      start: 0,
      end: 0,
      period: 0,
      probability: '1',
      prereq: 'inm_contract_apical',
      cell_cycle_phase: CellCyclePhase.G2,
      target_parameter: 'basal_cytos_strain',
      formula: '2',
    } as ParameterChangeEvent);
  }

  // Remove per-cell-type INM events (now handled by default events)
  for (const cellType of Object.values(migrated.cell_types)) {
    const ct = cellType as EHTCellTypeParams;
    if (ct.events_v2) {
      ct.events_v2 = ct.events_v2.filter(
        e => e.id !== 'inm_contract_apical' && e.id !== 'inm_extend_basal'
      );
    }
  }

  return migrated;
}

/**
 * Ensure params are in v1.3.0 format.
 * If already v1.3.0+, returns as-is. Otherwise, migrates from v1.2.0.
 */
export function ensureV1_3_0(params: EHTParams): EHTParams {
  if (needsV1_3_0Migration(params)) {
    console.log('[Migration] Converting EHT params from v1.2.0 to v1.3.0');
    return migrateV1_2_0toV1_3_0(params);
  }
  return params;
}
