/**
 * EHT model statistics definitions.
 * Computes comprehensive statistics for all cell groups.
 */

import type { StatisticDefinition } from '@/core/registry/types';
import type { EHTSimulationState, CellState } from './types';
import type { EHTParams } from './params/types';
import { Vector2 } from '@/core/math/vector2';
import { createBasalGeometry } from '@/core/math';
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
  isBoundary: boolean;          // Is this control cell in the boundary (left/right 10%)
  effectiveType: string;        // Effective type for statistics ('control_boundary' for boundary cells)
}

/**
 * Get a working BasalGeometry instance from state.
 * Handles cases where state was cloned (structuredClone loses class methods).
 */
function getBasalGeometry(state: EHTSimulationState) {
  // If basalGeometry has working methods, use it directly
  if (typeof state.basalGeometry?.getArcLength === 'function') {
    return state.basalGeometry;
  }

  // Otherwise, recreate from curvatures stored in geometry or basalGeometry
  const curvature_1 = state.geometry?.curvature_1 ?? state.basalGeometry?.curvature_1 ?? 0;
  const curvature_2 = state.geometry?.curvature_2 ?? state.basalGeometry?.curvature_2 ?? 0;

  return createBasalGeometry(curvature_1, curvature_2, 360);
}

/**
 * Identify boundary control cells (left/right 10% when full_circle = false).
 * For ellipse/circle geometries, use arc length along the basal curve.
 * Returns a Set of cell indices that are boundary cells.
 */
function identifyBoundaryCells(
  state: EHTSimulationState,
  params: EHTParams
): Set<number> {
  const boundarySet = new Set<number>();

  // Only apply when full_circle is false
  if (params.general.full_circle) {
    return boundarySet;
  }

  // Get working geometry (handles cloned states)
  const geometry = getBasalGeometry(state);

  // Find all control cells with their arc lengths
  const controlCells: { index: number; arcLength: number }[] = [];

  for (let i = 0; i < state.cells.length; i++) {
    const cell = state.cells[i];
    if (cell.typeIndex === 'control') {
      // Get the basal point and find its arc length
      const B = Vector2.from(cell.B);
      const arcLength = geometry.getArcLength(B);
      controlCells.push({ index: i, arcLength });
    }
  }

  if (controlCells.length === 0) {
    return boundarySet;
  }

  // Sort by arc length to find leftmost and rightmost
  controlCells.sort((a, b) => a.arcLength - b.arcLength);

  // Calculate 10% boundary threshold
  const boundaryCount = Math.ceil(controlCells.length * 0.1);

  // Mark left 10% as boundary
  for (let i = 0; i < boundaryCount && i < controlCells.length; i++) {
    boundarySet.add(controlCells[i].index);
  }

  // Mark right 10% as boundary
  for (let i = Math.max(0, controlCells.length - boundaryCount); i < controlCells.length; i++) {
    boundarySet.add(controlCells[i].index);
  }

  return boundarySet;
}

/**
 * Compute per-cell metrics for all cells.
 */
function computeCellMetrics(state: EHTSimulationState, params: EHTParams): CellMetrics[] {
  const cells = state.cells;
  const metrics: CellMetrics[] = [];

  // Identify boundary control cells
  const boundaryCells = identifyBoundaryCells(state, params);

  // First pass: compute basic metrics for each cell and track lowest control cell bx
  let lowestControlBx = Infinity;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
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

    // Check if this is a boundary cell
    const isBoundary = boundaryCells.has(i);
    const effectiveType = (cell.typeIndex === 'control' && isBoundary)
      ? 'control_boundary'
      : cell.typeIndex;

    // Track lowest control cell bx (excluding boundary cells)
    if (cell.typeIndex === 'control' && !isBoundary && bx < lowestControlBx) {
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
      isBoundary,
      effectiveType,
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
 * Returns: individual types + "all"
 * Note: Pair combinations are not computed.
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

  return groups;
}

/**
 * Filter metrics by cell group.
 */
function filterByGroup(metrics: CellMetrics[], group: string): CellMetrics[] {
  if (group === 'all') {
    // Exclude control_boundary from 'all' group
    return metrics.filter(m => m.effectiveType !== 'control_boundary');
  }

  // Single type (use effectiveType for filtering)
  return metrics.filter(m => m.effectiveType === group);
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
    cell_type: m.effectiveType, // Use effectiveType instead of original typeIndex
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
