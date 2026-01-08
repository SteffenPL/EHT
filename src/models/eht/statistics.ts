
/**
 * EHT model statistics definitions.
 * Computes statistics directly from EHTSimulationState.
 * Statistics are generated dynamically based on cell types in params.
 */

import type { StatisticDefinition } from '@/core/registry/types';
import type { EHTSimulationState, CellState } from './types';
import type { EHTParams } from './params/types';
import { Vector2 } from '@/core/math/vector2';

/**
 * Compute the apical-basal distance for a cell.
 */
function abDistance(cell: CellState): number {
  return Vector2.from(cell.A).dist(Vector2.from(cell.B));
}

/**
 * Compute mean of an array of numbers.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Generate statistics definitions dynamically based on cell types in params.
 * Returns one AB distance stat for each cell type, plus one for all cells.
 */
export function generateEHTStatistics(params: EHTParams): StatisticDefinition<EHTSimulationState>[] {
  const stats: StatisticDefinition<EHTSimulationState>[] = [];
  const cellTypeKeys = Object.keys(params.cell_types);

  // AB distance for all cells
  stats.push({
    id: 'ab_distance_all',
    label: 'AB Distance (all)',
    description: 'Average apical-basal distance for all cells',
    compute: (s) => mean(s.cells.map(abDistance)),
  });

  // AB distance per cell type
  for (const typeKey of cellTypeKeys) {
    const cellType = params.cell_types[typeKey];
    const displayName = cellType.name || typeKey;

    stats.push({
      id: `ab_distance_${typeKey}`,
      label: `AB Distance (${displayName})`,
      description: `Average apical-basal distance for ${displayName} cells`,
      compute: (s) => mean(
        s.cells
          .filter((c) => c.typeIndex === typeKey)
          .map(abDistance)
      ),
    });
  }

  return stats;
}

/**
 * Get the list of all available statistic IDs for the current params.
 */
export function getEHTStatisticIds(params: EHTParams): string[] {
  return generateEHTStatistics(params).map((s) => s.id);
}

/**
 * Compute statistics for current state using dynamically generated definitions.
 */
export function computeEHTStatistics(
  state: EHTSimulationState,
  params?: EHTParams
): Record<string, number> {
  const result: Record<string, number> = {};

  // If params not provided, compute just the basic AB distance for all cells
  if (!params) {
    result['ab_distance_all'] = mean(state.cells.map(abDistance));
    return result;
  }

  const stats = generateEHTStatistics(params);

  for (const stat of stats) {
    try {
      result[stat.id] = stat.compute(state);
    } catch (e) {
      console.error(`Failed to compute stat ${stat.id}`, e);
      result[stat.id] = NaN;
    }
  }

  return result;
}

/** Legacy export for backward compatibility */
export const EHT_STATISTICS: StatisticDefinition<EHTSimulationState>[] = [
  {
    id: 'ab_distance_all',
    label: 'AB Distance (all)',
    description: 'Average apical-basal distance for all cells',
    compute: (s) => mean(s.cells.map(abDistance)),
  },
];
