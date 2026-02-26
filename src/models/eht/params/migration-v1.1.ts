/**
 * Migration utilities for EHT params v1.0.0 → v1.1.0.
 * Converts legacy EMTEventTimes format to the new events_v2 array format.
 */

import type { EHTParams, EHTCellTypeParams, EMTEventTimes, EventDefinition, SpecialEvent, ParameterChangeEvent } from './types';
import { CellCyclePhase } from './types';

/**
 * Convert legacy EMT event times to new v1.1.0 event definitions.
 *
 * Migration rules:
 * - time_A_start/end → special event (lose_apical_adhesion) — stiffness reduction is automatic
 * - time_B_start/end → special event (lose_basal_adhesion) — stiffness reduction is automatic
 * - time_S_start/end → param event (stiffness_straightness = 1.0)
 * - time_P_start/end → special event (start_running) [only if run > 0]
 * - time_AC_start/end → special event (lose_apical_interface)
 * - hetero: true → probability: 0.7 on each event
 * - hetero: false → probability: 1.0 on each event
 */
export function convertLegacyEventsToV2(
  events: EMTEventTimes,
  hetero: boolean,
  run: number
): EventDefinition[] {
  const result: EventDefinition[] = [];
  const probability = hetero ? '0.7' : '1';

  // Helper to check if event is active (at least start must be finite)
  const isActive = (start: number, end: number) =>
    isFinite(start) || isFinite(end);

  // Time A: Lose apical adhesion (stiffness reduction is hardcoded in the handler)
  if (isActive(events.time_A_start, events.time_A_end)) {
    const loseApical: SpecialEvent = {
      type: 'special',
      id: 'lose_apical',
      name: 'Lose Apical Adhesion',
      start: events.time_A_start,
      end: Infinity,
      period: 0,
      probability,
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Any,
      special_name: 'lose_apical_adhesion',
    };
    result.push(loseApical);
  }

  // Time B: Lose basal adhesion (stiffness reduction is hardcoded in the handler)
  if (isActive(events.time_B_start, events.time_B_end)) {
    const loseBasal: SpecialEvent = {
      type: 'special',
      id: 'lose_basal',
      name: 'Lose Basal Adhesion',
      start: events.time_B_start,
      end: Infinity,
      period: 0,
      probability,
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Any,
      special_name: 'lose_basal_adhesion',
    };
    result.push(loseBasal);
  }

  // Time S: Lose straightness (parameter change only)
  if (isActive(events.time_S_start, events.time_S_end)) {
    const loseStraightness: ParameterChangeEvent = {
      type: 'parameter_change',
      id: 'lose_straightness',
      name: 'Lose Straightness',
      start: events.time_S_start,
      end: events.time_S_end,
      period: 0,
      probability,
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Any,
      target_parameter: 'stiffness_straightness',
      formula: '1.0',
    };
    result.push(loseStraightness);
  }

  // Time P: Start running (uses cell type's run probability)
  if (isActive(events.time_P_start, events.time_P_end) && run > 0) {
    const startRunning: SpecialEvent = {
      type: 'special',
      id: 'start_running',
      name: 'Start Running',
      start: events.time_P_start,
      end: events.time_P_end,
      period: 0,
      probability: String(run), // Use the run probability directly
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Any,
      special_name: 'start_running',
    };
    result.push(startRunning);
  }

  // Time AC: Lose apical interface (formerly apical constriction)
  if (isActive(events.time_AC_start, events.time_AC_end)) {
    const loseApicalInterface: SpecialEvent = {
      type: 'special',
      id: 'lose_apical_interface',
      name: 'Lose Apical Interface',
      start: events.time_AC_start,
      end: events.time_AC_end,
      period: 0,
      probability,
      prereq: null,
      cell_cycle_phase: CellCyclePhase.Any,
      special_name: 'lose_apical_interface',
    };
    result.push(loseApicalInterface);
  }

  return result;
}

/**
 * Check if params are using legacy v1.0.0 format (no events_v2).
 */
export function isLegacyParams(params: EHTParams): boolean {
  // Check metadata version
  if (params.metadata?.version === '1.1.0') {
    return false;
  }

  // Check if any cell type has events_v2
  for (const cellType of Object.values(params.cell_types)) {
    if ((cellType as EHTCellTypeParams).events_v2 !== undefined) {
      return false;
    }
  }

  return true;
}

/**
 * Migrate EHT params from v1.0.0 to v1.1.0.
 * Converts legacy EMTEventTimes to new events_v2 array format.
 *
 * This function does NOT mutate the input - it returns a new params object.
 */
export function migrateV1_0_0toV1_1_0(params: EHTParams): EHTParams {
  // Deep clone to avoid mutations
  const migrated = structuredClone(params);

  // Update metadata version
  migrated.metadata.version = '1.1.0';

  // Convert each cell type's legacy events to new format
  for (const [key, cellType] of Object.entries(migrated.cell_types)) {
    const ct = cellType as EHTCellTypeParams;

    // Skip if already has events_v2
    if (ct.events_v2 !== undefined) {
      continue;
    }

    // Convert legacy events to v2 format
    ct.events_v2 = convertLegacyEventsToV2(ct.events, ct.hetero, ct.run);

    migrated.cell_types[key] = ct;
  }

  return migrated;
}

/**
 * Ensure params are in v1.1.0 format.
 * If already v1.1.0+, returns as-is. Otherwise, migrates from v1.0.0.
 */
export function ensureV1_1_0(params: EHTParams): EHTParams {
  if (isLegacyParams(params)) {
    console.log('[Migration] Converting EHT params from v1.0.0 to v1.1.0');
    return migrateV1_0_0toV1_1_0(params);
  }
  return params;
}
