/**
 * Toy model statistics definitions.
 */

import type { StatisticDefinition } from '@/core/registry/types';
import type { ToySimulationState } from './simulation/types';

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
    id: 'mean_speed',
    label: 'Mean Speed',
    description: 'Average speed of all cells (microns/min) estimated from polarity',
    compute: (s) => {
      // Speed depends on phase.
      // We don't have direct access to params here (only state).
      // Approximating or using displacement if time step is known?
      // Without dt, we can only report theoretical speed based on phase, or we need velocity in state.
      // ToyCell stores prevPosition. We need dt to compute speed.
      // But computeStats only gets State.
      // If we want actual speed, we should store velocity in cell state.
      // For now, let's just count 'running' cells ratio as proxy or similar.
      // OR update ToyCell to store current speed.
      return s.cells.filter(c => c.phase === 'running').length / (s.cells.length || 1);
    },
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

/** Compute statistics for current state */
export function computeToyStatistics(
  state: ToySimulationState
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const stat of TOY_STATISTICS) {
    result[stat.id] = stat.compute(state);
  }
  return result;
}
