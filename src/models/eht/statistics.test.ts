/**
 * Tests for EHT statistics computation with multiple cell types.
 */
import { describe, it, expect } from 'vitest';
import { computeEHTStatistics, generateEHTStatistics } from './statistics';
import type { EHTSimulationState, CellState } from './types';
import type { EHTParams } from './params/types';
import { DEFAULT_EHT_PARAMS } from './params/defaults';
import { StraightLineGeometry } from '@/core/math';

/**
 * Create a minimal test state with cells of different types.
 */
function createTestState(cellTypes: string[]): EHTSimulationState {
  const cells: CellState[] = [];

  // Create 10 cells per type at different positions
  cellTypes.forEach((typeKey, typeIndex) => {
    for (let i = 0; i < 10; i++) {
      const x = typeIndex * 10 + i;
      const y = 30;
      cells.push({
        id: cells.length,
        typeIndex: typeKey,
        pos: { x, y },
        A: { x, y: 28 },
        B: { x, y: 33 },
        R_soft: 1.2,
        R_hard: 0.4,
        eta_A: 2.5,
        eta_B: 2.5,
        has_A: true,
        has_B: true,
        phase: 0,
        birth_time: 0,
        division_time: 10,
        is_running: false,
        running_mode: 0,
        has_inm: false,
        time_A: Infinity,
        time_B: Infinity,
        time_S: Infinity,
        time_P: Infinity,
        stiffness_apical_apical: 1.0,
        stiffness_straightness: 100.0,
        stiffness_nuclei_apical: 1.0,
        stiffness_nuclei_basal: 1.0,
      });
    }
  });

  return {
    cells,
    ap_links: [],
    ba_links: [],
    t: 0,
    step_count: 0,
    geometry: {
      curvature_1: 0.06,
      curvature_2: 0.06,
    },
    basalGeometry: new StraightLineGeometry(),
    rngSeed: 'test-seed',
  };
}

/**
 * Create test params with specified cell types.
 */
function createTestParams(cellTypeKeys: string[]): EHTParams {
  const params = structuredClone(DEFAULT_EHT_PARAMS);

  // Clear default cell types and add custom ones
  params.cell_types = {};
  const baseType = DEFAULT_EHT_PARAMS.cell_types.control;

  cellTypeKeys.forEach(key => {
    params.cell_types[key] = {
      ...structuredClone(baseType),
      N_init: 10,
    };
  });

  return params;
}

describe('EHT Statistics - Cell Type Pairs', () => {
  it('should compute statistics for 2 cell types and their pair', () => {
    const cellTypes = ['control', 'emt'];
    const state = createTestState(cellTypes);
    const params = createTestParams(cellTypes);

    const stats = computeEHTStatistics(state, params);
    const statKeys = Object.keys(stats);

    // Check for "all" group
    expect(statKeys).toContain('ab_distance_all');

    // Check for individual types
    expect(statKeys).toContain('ab_distance_control');
    expect(statKeys).toContain('ab_distance_emt');

    // Check for pair
    expect(statKeys).toContain('ab_distance_control+emt');

    // Verify non-zero values
    expect(stats['ab_distance_all']).toBeGreaterThan(0);
    expect(stats['ab_distance_control']).toBeGreaterThan(0);
    expect(stats['ab_distance_emt']).toBeGreaterThan(0);
    expect(stats['ab_distance_control+emt']).toBeGreaterThan(0);
  });

  it('should compute statistics for 3 cell types and all 3 pairs', () => {
    const cellTypes = ['control', 'emt', 'counter_control'];
    const state = createTestState(cellTypes);
    const params = createTestParams(cellTypes);

    const stats = computeEHTStatistics(state, params);
    const statKeys = Object.keys(stats);

    // Check for "all" group
    expect(statKeys).toContain('ab_distance_all');

    // Check for individual types
    expect(statKeys).toContain('ab_distance_control');
    expect(statKeys).toContain('ab_distance_emt');
    expect(statKeys).toContain('ab_distance_counter_control');

    // Check for all 3 pairs
    expect(statKeys).toContain('ab_distance_control+emt');
    expect(statKeys).toContain('ab_distance_control+counter_control');
    expect(statKeys).toContain('ab_distance_emt+counter_control');

    // Verify non-zero values
    expect(stats['ab_distance_all']).toBeGreaterThan(0);
    expect(stats['ab_distance_control']).toBeGreaterThan(0);
    expect(stats['ab_distance_emt']).toBeGreaterThan(0);
    expect(stats['ab_distance_counter_control']).toBeGreaterThan(0);
    expect(stats['ab_distance_control+emt']).toBeGreaterThan(0);
    expect(stats['ab_distance_control+counter_control']).toBeGreaterThan(0);
    expect(stats['ab_distance_emt+counter_control']).toBeGreaterThan(0);
  });

  it('should generate correct statistic definitions for 3 cell types', () => {
    const cellTypes = ['control', 'emt', 'counter_control'];
    const params = createTestParams(cellTypes);

    const statDefs = generateEHTStatistics(params);
    const statIds = statDefs.map(s => s.id);

    // Expected groups: all, control, emt, counter_control, control+emt, control+counter_control, emt+counter_control
    const expectedGroups = [
      'all',
      'control',
      'emt',
      'counter_control',
      'control+emt',
      'control+counter_control',
      'emt+counter_control',
    ];

    // Check that ab_distance exists for all groups
    expectedGroups.forEach(group => {
      expect(statIds).toContain(`ab_distance_${group}`);
    });

    // Count total stats: 9 metrics × 7 groups = 63 statistics
    expect(statDefs).toHaveLength(9 * 7);
  });

  it('should compute correct values for each group', () => {
    const cellTypes = ['control', 'emt', 'counter_control'];
    const state = createTestState(cellTypes);
    const params = createTestParams(cellTypes);

    const stats = computeEHTStatistics(state, params);

    // All group should have 30 cells (10 per type)
    expect(stats['ab_distance_all']).toBeCloseTo(5, 0);

    // Individual groups should each have 10 cells
    expect(stats['ab_distance_control']).toBeCloseTo(5, 0);
    expect(stats['ab_distance_emt']).toBeCloseTo(5, 0);
    expect(stats['ab_distance_counter_control']).toBeCloseTo(5, 0);

    // Pair groups should each have 20 cells
    expect(stats['ab_distance_control+emt']).toBeCloseTo(5, 0);
    expect(stats['ab_distance_control+counter_control']).toBeCloseTo(5, 0);
    expect(stats['ab_distance_emt+counter_control']).toBeCloseTo(5, 0);
  });

  it('should list all groups correctly for debugging', () => {
    const cellTypes = ['control', 'emt', 'counter_control'];
    const params = createTestParams(cellTypes);

    console.log('Cell types in params:', Object.keys(params.cell_types));

    const stats = generateEHTStatistics(params);

    // The stat IDs are in format: "metric_group" where metric can have underscores
    // Known metrics: ab_distance, AX, BX, ax, bx, x, below_basal, above_apical, below_neighbours
    // Extract groups by removing known metric prefixes
    const knownMetrics = ['ab_distance', 'AX', 'BX', 'ax', 'bx', 'x', 'below_basal', 'above_apical', 'below_neighbours'];
    const groups = new Set<string>();

    for (const stat of stats) {
      for (const metric of knownMetrics) {
        if (stat.id.startsWith(metric + '_')) {
          const group = stat.id.substring(metric.length + 1);
          groups.add(group);
          break;
        }
      }
    }

    const groupsArray = Array.from(groups).sort();
    console.log('All unique groups:', groupsArray);
    console.log('Total statistics:', stats.length);
    console.log('Expected:', 9, 'metrics ×', 7, 'groups =', 63);

    // Should have 7 groups: all + 3 individuals + 3 pairs
    expect(groupsArray).toEqual([
      'all',
      'control',
      'control+counter_control',
      'control+emt',
      'counter_control',
      'emt',
      'emt+counter_control'
    ]);

    // Verify count
    expect(stats).toHaveLength(9 * 7);
  });

  it('should dynamically update when cell type names change', () => {
    // Start with default params (control, emt)
    const params1 = structuredClone(DEFAULT_EHT_PARAMS) as EHTParams;
    const stats1 = generateEHTStatistics(params1);
    const groups1 = new Set<string>();

    const knownMetrics = ['ab_distance', 'AX', 'BX', 'ax', 'bx', 'x', 'below_basal', 'above_apical', 'below_neighbours'];
    for (const stat of stats1) {
      for (const metric of knownMetrics) {
        if (stat.id.startsWith(metric + '_')) {
          const group = stat.id.substring(metric.length + 1);
          groups1.add(group);
          break;
        }
      }
    }

    expect(Array.from(groups1).sort()).toContain('control');
    expect(Array.from(groups1).sort()).toContain('emt');
    expect(Array.from(groups1).sort()).toContain('control+emt');

    // Now rename emt to emt2 and add a third type
    const params2 = structuredClone(DEFAULT_EHT_PARAMS) as EHTParams;
    params2.cell_types = {
      control: params2.cell_types.control,
      emt2: { ...params2.cell_types.emt },
      counter_control: { ...params2.cell_types.control, N_init: 15 },
    };

    const stats2 = generateEHTStatistics(params2);
    const groups2 = new Set<string>();

    for (const stat of stats2) {
      for (const metric of knownMetrics) {
        if (stat.id.startsWith(metric + '_')) {
          const group = stat.id.substring(metric.length + 1);
          groups2.add(group);
          break;
        }
      }
    }

    const groups2Array = Array.from(groups2).sort();

    // Should NOT contain "emt"
    expect(groups2Array).not.toContain('emt');
    expect(groups2Array).not.toContain('control+emt');

    // Should contain new names
    expect(groups2Array).toContain('control');
    expect(groups2Array).toContain('emt2');
    expect(groups2Array).toContain('counter_control');
    expect(groups2Array).toContain('control+emt2');
    expect(groups2Array).toContain('control+counter_control');
    expect(groups2Array).toContain('emt2+counter_control');

    // Should have 7 groups total
    expect(groups2Array).toHaveLength(7);
  });
});
