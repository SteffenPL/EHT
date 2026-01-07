/**
 * EHT model batch statistics definitions.
 * Each statistic computes a single number from a BatchSnapshot.
 */

import type { BatchSnapshot, CellSnapshotMinimal } from '@/core/batch/types';
import type { StatisticDefinition } from '@/core/registry/types';

// Helper functions for filtering cells
function controlCells(cells: CellSnapshotMinimal[]): CellSnapshotMinimal[] {
  return cells.filter((c) => c.type === 'control');
}

function emtCells(cells: CellSnapshotMinimal[]): CellSnapshotMinimal[] {
  return cells.filter((c) => c.type === 'emt');
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function parseNeighbors(s: string): number[] {
  if (!s || s.trim() === '') return [];
  return s.split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x));
}

/** All EHT-specific statistics */
export const EHT_STATISTICS: StatisticDefinition[] = [
  // Cell counts
  {
    id: 'n_cells_total',
    label: 'Cell Count (total)',
    description: 'Total number of cells',
    compute: (s) => s.cells.length,
  },
  {
    id: 'n_cells_control',
    label: 'Cell Count (control)',
    description: 'Number of control cells',
    compute: (s) => controlCells(s.cells).length,
  },
  {
    id: 'n_cells_emt',
    label: 'Cell Count (EMT)',
    description: 'Number of EMT cells',
    compute: (s) => emtCells(s.cells).length,
  },

  // Y positions
  {
    id: 'avg_y_all',
    label: 'Avg Y Position (all)',
    description: 'Average Y position of all cell nuclei',
    compute: (s) => mean(s.cells.map((c) => c.pos_y)),
  },
  {
    id: 'avg_y_control',
    label: 'Avg Y Position (control)',
    description: 'Average Y position of control cell nuclei',
    compute: (s) => mean(controlCells(s.cells).map((c) => c.pos_y)),
  },
  {
    id: 'avg_y_emt',
    label: 'Avg Y Position (EMT)',
    description: 'Average Y position of EMT cell nuclei',
    compute: (s) => mean(emtCells(s.cells).map((c) => c.pos_y)),
  },

  // X positions
  {
    id: 'avg_x_all',
    label: 'Avg X Position (all)',
    description: 'Average X position of all cell nuclei',
    compute: (s) => mean(s.cells.map((c) => c.pos_x)),
  },
  {
    id: 'avg_x_emt',
    label: 'Avg X Position (EMT)',
    description: 'Average X position of EMT cell nuclei',
    compute: (s) => mean(emtCells(s.cells).map((c) => c.pos_x)),
  },

  // Adhesion states
  {
    id: 'emt_with_apical',
    label: 'EMT with Apical Adhesion',
    description: 'Number of EMT cells that still have apical adhesion',
    compute: (s) => emtCells(s.cells).filter((c) => c.has_A).length,
  },
  {
    id: 'emt_with_basal',
    label: 'EMT with Basal Adhesion',
    description: 'Number of EMT cells that still have basal adhesion',
    compute: (s) => emtCells(s.cells).filter((c) => c.has_B).length,
  },
  {
    id: 'emt_escaped',
    label: 'EMT Escaped',
    description: 'Number of EMT cells that lost both apical and basal adhesion',
    compute: (s) => emtCells(s.cells).filter((c) => !c.has_A && !c.has_B).length,
  },
  {
    id: 'emt_fully_attached',
    label: 'EMT Fully Attached',
    description: 'Number of EMT cells with both apical and basal adhesion',
    compute: (s) => emtCells(s.cells).filter((c) => c.has_A && c.has_B).length,
  },

  // Apical-basal distance
  {
    id: 'avg_ab_distance_all',
    label: 'Avg Apical-Basal Distance (all)',
    description: 'Average distance between apical and basal points',
    compute: (s) =>
      mean(
        s.cells.map((c) =>
          Math.sqrt(Math.pow(c.A_x - c.B_x, 2) + Math.pow(c.A_y - c.B_y, 2))
        )
      ),
  },
  {
    id: 'avg_ab_distance_emt',
    label: 'Avg Apical-Basal Distance (EMT)',
    description: 'Average apical-basal distance for EMT cells',
    compute: (s) =>
      mean(
        emtCells(s.cells).map((c) =>
          Math.sqrt(Math.pow(c.A_x - c.B_x, 2) + Math.pow(c.A_y - c.B_y, 2))
        )
      ),
  },

  // Tissue dimensions
  {
    id: 'tissue_width',
    label: 'Tissue Width',
    description: 'Max X - Min X of all cell positions',
    compute: (s) => {
      if (s.cells.length === 0) return 0;
      const xs = s.cells.map((c) => c.pos_x);
      return Math.max(...xs) - Math.min(...xs);
    },
  },
  {
    id: 'tissue_height',
    label: 'Tissue Height',
    description: 'Max Y - Min Y of all cell positions',
    compute: (s) => {
      if (s.cells.length === 0) return 0;
      const ys = s.cells.map((c) => c.pos_y);
      return Math.max(...ys) - Math.min(...ys);
    },
  },

  // Neighbor counts
  {
    id: 'avg_apical_neighbors',
    label: 'Avg Apical Neighbors',
    description: 'Average number of apical neighbors per cell',
    compute: (s) =>
      mean(s.cells.map((c) => parseNeighbors(c.apical_neighbors).length)),
  },
  {
    id: 'avg_basal_neighbors',
    label: 'Avg Basal Neighbors',
    description: 'Average number of basal neighbors per cell',
    compute: (s) =>
      mean(s.cells.map((c) => parseNeighbors(c.basal_neighbors).length)),
  },

  // Age statistics
  {
    id: 'avg_age_all',
    label: 'Avg Cell Age (all)',
    description: 'Average age of all cells in hours',
    compute: (s) => mean(s.cells.map((c) => c.age)),
  },
  {
    id: 'avg_age_emt',
    label: 'Avg Cell Age (EMT)',
    description: 'Average age of EMT cells in hours',
    compute: (s) => mean(emtCells(s.cells).map((c) => c.age)),
  },

  // Phase distribution
  {
    id: 'cells_in_g1',
    label: 'Cells in G1 Phase',
    description: 'Number of cells in G1 (growth) phase',
    compute: (s) => s.cells.filter((c) => c.phase === 0).length,
  },
  {
    id: 'cells_in_g2',
    label: 'Cells in G2 Phase',
    description: 'Number of cells in G2 (pre-mitosis) phase',
    compute: (s) => s.cells.filter((c) => c.phase === 1).length,
  },
  {
    id: 'cells_in_mitosis',
    label: 'Cells in Mitosis',
    description: 'Number of cells in mitosis phase',
    compute: (s) => s.cells.filter((c) => c.phase === 2).length,
  },
];

/** Get EHT statistic by ID */
export function getEHTStatistic(id: string): StatisticDefinition | undefined {
  return EHT_STATISTICS.find((s) => s.id === id);
}

/** Get all EHT statistic IDs */
export function getAllEHTStatisticIds(): string[] {
  return EHT_STATISTICS.map((s) => s.id);
}

/** List all EHT statistics with their descriptions */
export function listEHTStatistics(): Array<{ id: string; label: string; description: string }> {
  return EHT_STATISTICS.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
  }));
}

/** Compute multiple EHT statistics for a snapshot */
export function computeEHTStatistics(
  snapshot: BatchSnapshot,
  statisticIds: string[]
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const id of statisticIds) {
    const stat = getEHTStatistic(id);
    if (stat) {
      result[id] = stat.compute(snapshot);
    }
  }

  return result;
}

// Legacy exports for backwards compatibility
export const AVAILABLE_STATISTICS = EHT_STATISTICS;
export const getStatistic = getEHTStatistic;
export const getAllStatisticIds = getAllEHTStatisticIds;
export const listStatistics = listEHTStatistics;
export const computeStatistics = computeEHTStatistics;
