/**
 * Toy model statistics definitions.
 *
 * Statistics API follows the same pattern as the EHT model:
 * - TOY_STATISTICS: Static array of statistic definitions
 * - generateToyStatistics(params): Returns statistics (for Toy, params are not used)
 * - computeToyStatistics(state): Computes all statistics for a given state
 */

import type { StatisticDefinition } from '@/core/registry/types';
import type { ToySimulationState } from './simulation/types';
import type { ToyParams } from './params/types';

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** All Toy model statistics */
export const TOY_STATISTICS: StatisticDefinition<ToySimulationState>[] = [
  {
    id: 'n_cells',
    label: 'Cell Count',
    description: 'Total number of cells',
    compute: (s) => s.cells.length,
  },
  {
    id: 'running_fraction',
    label: 'Running Fraction',
    description: 'Fraction of cells currently in running phase',
    compute: (s) => s.cells.filter(c => c.phase === 'running').length / (s.cells.length || 1),
  },
  {
    id: 'avg_x',
    label: 'Avg X Position',
    description: 'Average X position of all cells',
    compute: (s) => mean(s.cells.map((c) => c.position.x)),
  },
  {
    id: 'avg_y',
    label: 'Avg Y Position',
    description: 'Average Y position of all cells',
    compute: (s) => mean(s.cells.map((c) => c.position.y)),
  },
];

/**
 * Generate statistics definitions for the Toy model.
 * For Toy, statistics are static and don't depend on params.
 * This function exists for API consistency with models like EHT
 * that generate dynamic statistics based on cell types.
 */
export function generateToyStatistics(_params?: ToyParams): StatisticDefinition<ToySimulationState>[] {
  return TOY_STATISTICS;
}

/** Compute statistics for current state */
export function computeToyStatistics(
  state: ToySimulationState,
  _params?: ToyParams
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const stat of TOY_STATISTICS) {
    result[stat.id] = stat.compute(state);
  }
  return result;
}
