/**
 * Migration utilities for EHT params v1.2.0 → v1.3.0.
 * Converts INM probability to strain-based events.
 * INM behavior is now controlled entirely through the event system
 * rather than direct rest-length overrides in updateCytoskeleton.
 */

import type { EHTParams, EHTCellTypeParams, ParameterChangeEvent } from './types';
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
 * For each cell type with INM > 0, adds two events to events_v2:
 * - inm_contract_apical: sets apical_cytos_strain to -1 at G2
 * - inm_extend_basal: sets basal_cytos_strain to 2 at G2 (prereq on apical)
 */
export function migrateV1_2_0toV1_3_0(params: EHTParams): EHTParams {
  const migrated = structuredClone(params);

  // Update metadata version
  migrated.metadata.version = '1.3.0';

  for (const cellType of Object.values(migrated.cell_types)) {
    const ct = cellType as EHTCellTypeParams;

    if (ct.INM > 0) {
      // Ensure events_v2 array exists
      if (!ct.events_v2) {
        ct.events_v2 = [];
      }

      // Skip if INM events already exist
      const hasInmApical = ct.events_v2.some(e => e.id === 'inm_contract_apical');
      if (hasInmApical) {
        continue;
      }

      // INM apical contraction - fires at G2, probability = INM value
      const inmContractApical: ParameterChangeEvent = {
        type: 'parameter_change',
        id: 'inm_contract_apical',
        name: 'INM: Contract Apical',
        start: 0,
        end: 0,
        period: 0,
        probability: 'INM',
        prereq: null,
        cell_cycle_phase: CellCyclePhase.G2,
        target_parameter: 'apical_cytos_strain',
        formula: '-1',
      };

      // INM basal extension - fires at G2, prereq on apical (ensures correlation)
      const inmExtendBasal: ParameterChangeEvent = {
        type: 'parameter_change',
        id: 'inm_extend_basal',
        name: 'INM: Extend Basal',
        start: 0,
        end: 0,
        period: 0,
        probability: '1',
        prereq: 'inm_contract_apical',
        cell_cycle_phase: CellCyclePhase.G2,
        target_parameter: 'basal_cytos_strain',
        formula: '2',
      };

      ct.events_v2.push(inmContractApical, inmExtendBasal);
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
