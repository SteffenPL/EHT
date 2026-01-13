/**
 * EHT model statistics definitions.
 * Computes comprehensive statistics for all cell groups.
 */

import type { StatisticDefinition } from '@/core/registry/types';
import type { EHTSimulationState, CellState } from './types';
import type { EHTParams } from './params/types';
import { Vector2 } from '@/core/math/vector2';
import { projectOntoApicalStrip, projectOntoBasalCurve } from './simulation/projections';

/**
 * Per-cell computed values for statistics.
 */
interface CellMetrics {
  cell: CellState;
  X: Vector2;    // Cell nucleus position
  A: Vector2;    // Apical point
  B: Vector2;    // Basal point
  a: Vector2;    // Projection of X onto apical line strip
  b: Vector2;    // Projection of X onto basal curve
  AX: number;    // Distance from A to X
  BX: number;    // Distance from B to X
  ax: number;    // Distance from X to projection a
  bx: number;    // Distance from X to projection b (also called xb)
  x: number;     // Position on b→a scale (0 at b, 1 at a)
  below_basal: boolean;         // x < 0
  above_apical: boolean;        // x > 1
  below_control_cells: boolean; // bx < lowest control cell's bx
}

/**
 * Compute per-cell metrics for all cells.
 */
function computeCellMetrics(state: EHTSimulationState, _params: EHTParams): CellMetrics[] {
  const cells = state.cells;
  const metrics: CellMetrics[] = [];

  // First pass: compute basic metrics for each cell and track lowest control cell bx
  let lowestControlBx = Infinity;

  for (const cell of cells) {
    const X = Vector2.from(cell.pos);
    const A = Vector2.from(cell.A);
    const B = Vector2.from(cell.B);

    // Project X onto apical strip and basal curve
    const a = projectOntoApicalStrip(X, state);
    const b = projectOntoBasalCurve(X, state);

    // Compute distances
    const AX = A.dist(X);
    const BX = B.dist(X);
    const ax = X.dist(a);
    const bx = X.dist(b);

    // Track lowest control cell bx
    if (cell.typeIndex === 'control' && bx < lowestControlBx) {
      lowestControlBx = bx;
    }

    // Compute x: position on b→a scale
    // If b and a are the same, x is undefined, set to 0.5
    const ba = a.sub(b);
    const baLengthSq = ba.magSq();
    let x = 0.5;
    if (baLengthSq > 1e-10) {
      const bX = X.sub(b);
      x = bX.dot(ba) / baLengthSq;
    }

    const below_basal = x < 0;
    const above_apical = x > 1;

    metrics.push({
      cell,
      X,
      A,
      B,
      a,
      b,
      AX,
      BX,
      ax,
      bx,
      x,
      below_basal,
      above_apical,
      below_control_cells: false, // Computed in second pass
    });
  }

  // Second pass: compute below_control_cells
  // A cell is below_control_cells if its bx < lowest control cell's bx
  const hasControlCells = lowestControlBx < Infinity;
  for (const m of metrics) {
    m.below_control_cells = hasControlCells && m.bx < lowestControlBx;
  }

  return metrics;
}

/**
 * Generate all cell groups for statistics.
 * Returns: individual types + pairs + "all"
 */
function generateCellGroups(params: EHTParams): string[] {
  const cellTypeKeys = Object.keys(params.cell_types);
  const groups: string[] = [];

  // Add "all"
  groups.push('all');

  // Add individual types
  for (const typeKey of cellTypeKeys) {
    groups.push(typeKey);
  }

  // Add pairs
  for (let i = 0; i < cellTypeKeys.length; i++) {
    for (let j = i + 1; j < cellTypeKeys.length; j++) {
      groups.push(`${cellTypeKeys[i]}+${cellTypeKeys[j]}`);
    }
  }

  return groups;
}

/**
 * Filter metrics by cell group.
 */
function filterByGroup(metrics: CellMetrics[], group: string): CellMetrics[] {
  if (group === 'all') {
    return metrics;
  }

  // Check if it's a combination (contains '+')
  if (group.includes('+')) {
    const types = group.split('+');
    return metrics.filter(m => types.includes(m.cell.typeIndex));
  }

  // Single type
  return metrics.filter(m => m.cell.typeIndex === group);
}

/**
 * Compute aggregated statistics for a group of cells.
 */
function aggregateMetrics(metrics: CellMetrics[]): Record<string, number> {
  if (metrics.length === 0) {
    return {
      ab_distance: 0,
      AX: 0,
      BX: 0,
      ax: 0,
      bx: 0,
      x: 0,
      below_basal: 0,
      above_apical: 0,
      below_control_cells: 0,
    };
  }

  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const fraction = (values: boolean[]) => values.filter(v => v).length / values.length;

  return {
    ab_distance: mean(metrics.map(m => m.A.dist(m.B))),
    AX: mean(metrics.map(m => m.AX)),
    BX: mean(metrics.map(m => m.BX)),
    ax: mean(metrics.map(m => m.ax)),
    bx: mean(metrics.map(m => m.bx)),
    x: mean(metrics.map(m => m.x)),
    below_basal: fraction(metrics.map(m => m.below_basal)),
    above_apical: fraction(metrics.map(m => m.above_apical)),
    below_control_cells: fraction(metrics.map(m => m.below_control_cells)),
  };
}

/**
 * Compute statistics for all groups.
 * Returns a flat record with keys like "ab_distance_all", "AX_control", etc.
 */
export function computeEHTStatistics(
  state: EHTSimulationState,
  params?: EHTParams
): Record<string, number> {
  const result: Record<string, number> = {};

  // If no params, return minimal stats
  if (!params) {
    const abDist = state.cells.length > 0
      ? state.cells.reduce((sum, c) => sum + Vector2.from(c.A).dist(Vector2.from(c.B)), 0) / state.cells.length
      : 0;
    result['ab_distance_all'] = abDist;
    return result;
  }

  try {
    // Compute per-cell metrics
    const cellMetrics = computeCellMetrics(state, params);

    // Generate all groups
    const groups = generateCellGroups(params);

    // Compute statistics for each group
    for (const group of groups) {
      const groupMetrics = filterByGroup(cellMetrics, group);
      const stats = aggregateMetrics(groupMetrics);

      // Add to result with group suffix
      for (const [statName, value] of Object.entries(stats)) {
        result[`${statName}_${group}`] = value;
      }
    }
  } catch (e) {
    console.error('Failed to compute EHT statistics', e);
  }

  return result;
}

/**
 * Export per-cell metrics as a flat array for full CSV export.
 */
export function exportCellMetrics(
  state: EHTSimulationState,
  params: EHTParams
): Array<Record<string, any>> {
  const cellMetrics = computeCellMetrics(state, params);

  return cellMetrics.map((m, idx) => ({
    cell_id: idx,
    cell_type: m.cell.typeIndex,
    X_x: m.X.x,
    X_y: m.X.y,
    A_x: m.A.x,
    A_y: m.A.y,
    B_x: m.B.x,
    B_y: m.B.y,
    a_x: m.a.x,
    a_y: m.a.y,
    b_x: m.b.x,
    b_y: m.b.y,
    ab_distance: m.A.dist(m.B),
    AX: m.AX,
    BX: m.BX,
    ax: m.ax,
    bx: m.bx,
    x: m.x,
    below_basal: m.below_basal ? 1 : 0,
    above_apical: m.above_apical ? 1 : 0,
    below_control_cells: m.below_control_cells ? 1 : 0,
  }));
}

/**
 * Generate statistics definitions for the model.
 * Returns metadata about available statistics.
 */
export function generateEHTStatistics(params: EHTParams): StatisticDefinition<EHTSimulationState>[] {
  const stats: StatisticDefinition<EHTSimulationState>[] = [];
  const groups = generateCellGroups(params);

  const statNames = [
    { id: 'ab_distance', label: 'AB Distance', description: 'Apical-basal distance' },
    { id: 'AX', label: 'AX Distance', description: 'Distance from A to X' },
    { id: 'BX', label: 'BX Distance', description: 'Distance from B to X' },
    { id: 'ax', label: 'ax Distance', description: 'Distance from X to apical projection' },
    { id: 'bx', label: 'bx Distance', description: 'Distance from X to basal projection' },
    { id: 'x', label: 'x Position', description: 'Position on basal-apical scale (0-1)' },
    { id: 'below_basal', label: 'Below Basal', description: 'Fraction of cells below basal layer' },
    { id: 'above_apical', label: 'Above Apical', description: 'Fraction of cells above apical layer' },
    { id: 'below_control_cells', label: 'Below Control Cells', description: 'Fraction of cells below the lowest control cell' },
  ];

  for (const group of groups) {
    for (const stat of statNames) {
      stats.push({
        id: `${stat.id}_${group}`,
        label: `${stat.label} (${group})`,
        description: `${stat.description} for ${group} cells`,
        compute: (s) => {
          const result = computeEHTStatistics(s, params);
          return result[`${stat.id}_${group}`] || 0;
        },
      });
    }
  }

  return stats;
}

/** Legacy export */
export const EHT_STATISTICS = generateEHTStatistics({
  metadata: {} as any,
  general: {} as any,
  cell_prop: {} as any,
  cell_types: { control: {} as any },
});
