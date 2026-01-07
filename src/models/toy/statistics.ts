/**
 * Toy model batch statistics definitions.
 *
 * Note: For Toy model, we repurpose some CellSnapshotMinimal fields:
 * - pos_x, pos_y: cell position
 * - A_x, A_y: cell velocity (dx/dt, dy/dt)
 * - phase: current speed magnitude
 */

import type { BatchSnapshot, CellSnapshotMinimal } from '@/core/batch/types';
import type { StatisticDefinition } from '@/core/registry/types';

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** All Toy model statistics */
export const TOY_STATISTICS: StatisticDefinition[] = [
  {
    id: 'n_cells',
    label: 'Cell Count',
    description: 'Total number of cells',
    compute: (s) => s.cells.length,
  },
  {
    id: 'mean_speed',
    label: 'Mean Speed',
    description: 'Average speed of all cells (microns/min)',
    compute: (s: BatchSnapshot) => {
      // Speed is stored in the phase field
      const speeds = s.cells.map((c) => c.phase);
      return mean(speeds);
    },
  },
  {
    id: 'group_speed',
    label: 'Group Speed',
    description: 'Speed of the center of mass (microns/min)',
    compute: (s: BatchSnapshot) => {
      if (s.cells.length === 0) return 0;
      // Group velocity is stored as average of individual velocities
      // We stored velocity in A_x, A_y
      const avgVx = mean(s.cells.map((c) => c.A_x));
      const avgVy = mean(s.cells.map((c) => c.A_y));
      return Math.sqrt(avgVx * avgVx + avgVy * avgVy);
    },
  },
  {
    id: 'avg_x',
    label: 'Avg X Position',
    description: 'Average X position of all cells',
    compute: (s) => mean(s.cells.map((c) => c.pos_x)),
  },
  {
    id: 'avg_y',
    label: 'Avg Y Position',
    description: 'Average Y position of all cells',
    compute: (s) => mean(s.cells.map((c) => c.pos_y)),
  },
];

/** Get a statistic by ID */
export function getToyStatistic(id: string): StatisticDefinition | undefined {
  return TOY_STATISTICS.find((s) => s.id === id);
}

/** Get all statistic IDs */
export function getAllToyStatisticIds(): string[] {
  return TOY_STATISTICS.map((s) => s.id);
}

/** List all statistics with metadata */
export function listToyStatistics(): Array<{ id: string; label: string; description: string }> {
  return TOY_STATISTICS.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
  }));
}

/** Compute multiple statistics for a snapshot */
export function computeToyStatistics(
  snapshot: BatchSnapshot,
  statisticIds: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const id of statisticIds) {
    const stat = getToyStatistic(id);
    if (stat) {
      result[id] = stat.compute(snapshot);
    }
  }
  return result;
}

/**
 * Convert Toy simulation state to CellSnapshotMinimal format.
 * This is used by the batch runner to create snapshots.
 */
export function toyCellToSnapshot(
  cell: { id: number; position: { x: number; y: number }; prevPosition: { x: number; y: number } },
  dt: number
): CellSnapshotMinimal {
  // Compute velocity from position change
  const vx = (cell.position.x - cell.prevPosition.x) / dt;
  const vy = (cell.position.y - cell.prevPosition.y) / dt;
  const speed = Math.sqrt(vx * vx + vy * vy);

  return {
    id: cell.id,
    type: 'toy',
    pos_x: cell.position.x,
    pos_y: cell.position.y,
    A_x: vx, // Store velocity in A fields
    A_y: vy,
    B_x: 0,
    B_y: 0,
    has_A: true,
    has_B: false,
    phase: speed, // Store speed in phase field
    age: 0,
    apical_neighbors: '',
    basal_neighbors: '',
  };
}
