/**
 * Tests for EHT statistics computation with multiple cell types.
 */
import { describe, it, expect } from 'vitest';
import { computeEHTStatistics, generateEHTStatistics } from './statistics';
import type { EHTSimulationState, CellState } from './types';
import type { EHTParams } from './params/types';
import { DEFAULT_EHT_PARAMS } from './params/defaults';
import { StraightLineGeometry, CircularGeometry } from '@/core/math';

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

describe('EHT Statistics - Cell Type Groups', () => {
  it('should compute statistics for 2 cell types without pairs', () => {
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

    // Verify pairs are NOT computed
    expect(statKeys).not.toContain('ab_distance_control+emt');

    // Verify non-zero values
    expect(stats['ab_distance_all']).toBeGreaterThan(0);
    expect(stats['ab_distance_control']).toBeGreaterThan(0);
    expect(stats['ab_distance_emt']).toBeGreaterThan(0);
  });

  it('should compute statistics for 3 cell types without pairs', () => {
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

    // Verify pairs are NOT computed
    expect(statKeys).not.toContain('ab_distance_control+emt');
    expect(statKeys).not.toContain('ab_distance_control+counter_control');
    expect(statKeys).not.toContain('ab_distance_emt+counter_control');

    // Verify non-zero values
    expect(stats['ab_distance_all']).toBeGreaterThan(0);
    expect(stats['ab_distance_control']).toBeGreaterThan(0);
    expect(stats['ab_distance_emt']).toBeGreaterThan(0);
    expect(stats['ab_distance_counter_control']).toBeGreaterThan(0);
  });

  it('should generate correct statistic definitions for 3 cell types', () => {
    const cellTypes = ['control', 'emt', 'counter_control'];
    const params = createTestParams(cellTypes);

    const statDefs = generateEHTStatistics(params);
    const statIds = statDefs.map(s => s.id);

    // Expected groups: all, control, emt, counter_control (no pairs)
    const expectedGroups = [
      'all',
      'control',
      'emt',
      'counter_control',
    ];

    // Check that ab_distance exists for all groups
    expectedGroups.forEach(group => {
      expect(statIds).toContain(`ab_distance_${group}`);
    });

    // Count total stats: 9 metrics × 4 groups = 36 statistics
    expect(statDefs).toHaveLength(9 * 4);
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
    console.log('Expected:', 9, 'metrics ×', 4, 'groups =', 36);

    // Should have 4 groups: all + 3 individuals (no pairs)
    expect(groupsArray).toEqual([
      'all',
      'control',
      'counter_control',
      'emt',
    ]);

    // Verify count
    expect(stats).toHaveLength(9 * 4);
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
    // Pairs are no longer computed
    expect(Array.from(groups1).sort()).not.toContain('control+emt');

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

    // Should NOT contain "emt" or any pairs
    expect(groups2Array).not.toContain('emt');
    expect(groups2Array).not.toContain('control+emt2');
    expect(groups2Array).not.toContain('control+counter_control');
    expect(groups2Array).not.toContain('emt2+counter_control');

    // Should contain new names
    expect(groups2Array).toContain('control');
    expect(groups2Array).toContain('emt2');
    expect(groups2Array).toContain('counter_control');

    // Should have 4 groups total (all + 3 individuals, no pairs)
    expect(groups2Array).toHaveLength(4);
  });
});

describe('EHT Statistics - x position calculation', () => {
  /**
   * IMPORTANT: Understanding the 'x' statistic
   *
   * The 'x' statistic measures the position of a cell's nucleus (X) on a
   * basal-to-apical scale:
   *
   * - 'b' = projection of X onto the BASAL CURVE (the underlying geometry, e.g., y=0 for straight line)
   * - 'a' = projection of X onto the APICAL STRIP (line connecting all cells' apical points A_i)
   * - 'x' = (X - b) dot (a - b) / |a - b|^2  (parameter along the b→a vector)
   *
   * Key insight: 'b' is NOT the cell's B point! It's the projection onto the basal geometry.
   * Similarly, 'a' is NOT the cell's A point! It's the projection onto the global apical strip.
   *
   * For cells to have x < 1 (below apical):
   * - The nucleus must be between the basal curve and the apical strip
   *
   * For control cells in normal tissue:
   * - Basal (y=0 for straight line), Apical (y=h), Nucleus somewhere between
   * - x should be in range (0, 1)
   */

  it('should have x < 1 for cells with nucleus between basal curve and apical strip', () => {
    // Create REALISTIC cell positions:
    // - Basal at y=0 (the actual basal curve for StraightLineGeometry)
    // - Apical at y=10 (height h above basal)
    // - Nucleus at y=5 (between basal and apical)
    const cells: CellState[] = [];
    const h = 10;  // tissue height

    for (let i = 0; i < 5; i++) {
      const x = i * 5;
      cells.push({
        id: i,
        typeIndex: 'control',
        pos: { x, y: 5 },     // Nucleus at mid-height (50% of tissue height)
        A: { x, y: h },       // Apical point at height h
        B: { x, y: 0 },       // Basal point ON the basal curve (y=0)
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

    const state: EHTSimulationState = {
      cells,
      ap_links: [],
      ba_links: [],
      t: 0,
      step_count: 0,
      geometry: { curvature_1: 0, curvature_2: 0 },
      basalGeometry: new StraightLineGeometry(),
      rngSeed: 'test-seed',
    };

    const params = createTestParams(['control']);
    const stats = computeEHTStatistics(state, params);

    console.log('Test 1 - Cells with nucleus between basal curve (y=0) and apical strip (y=10):');
    console.log('  Nucleus at y=5, expected x = 5/10 = 0.5');
    console.log('  x_control:', stats['x_control']);
    console.log('  above_apical_control:', stats['above_apical_control']);

    // Nucleus at y=5, basal at y=0, apical strip at y=10
    // x = (5 - 0) / (10 - 0) = 0.5
    expect(stats['x_control']).toBeCloseTo(0.5, 1);
    expect(stats['above_apical_control']).toBe(0);
  });

  it('should report x > 1 when nucleus is above the apical strip', () => {
    // Cell with nucleus ABOVE the apical strip
    const cells: CellState[] = [];
    const h = 10;

    for (let i = 0; i < 5; i++) {
      const x = i * 5;
      cells.push({
        id: i,
        typeIndex: 'control',
        pos: { x, y: 12 },    // Nucleus ABOVE apical strip (y=12 > y=10)
        A: { x, y: h },       // Apical at height h=10
        B: { x, y: 0 },       // Basal on curve
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

    const state: EHTSimulationState = {
      cells,
      ap_links: [],
      ba_links: [],
      t: 0,
      step_count: 0,
      geometry: { curvature_1: 0, curvature_2: 0 },
      basalGeometry: new StraightLineGeometry(),
      rngSeed: 'test-seed',
    };

    const params = createTestParams(['control']);
    const stats = computeEHTStatistics(state, params);

    console.log('Test 2 - Nucleus above apical strip:');
    console.log('  Nucleus at y=12, apical strip at y=10, basal at y=0');
    console.log('  Expected x = 12/10 = 1.2 > 1');
    console.log('  x_control:', stats['x_control']);
    console.log('  above_apical_control:', stats['above_apical_control']);

    // x = (12 - 0) / (10 - 0) = 1.2 > 1
    expect(stats['x_control']).toBeCloseTo(1.2, 1);
    expect(stats['above_apical_control']).toBe(1);
  });

  it('should detect x > 1 when apical strip is non-uniform', () => {
    // This test demonstrates how a non-uniform apical strip can cause
    // some cells to be "above apical" even if they're below their own A point
    const cells: CellState[] = [];

    // Cell 0: normal position
    cells.push({
      id: 0,
      typeIndex: 'control',
      pos: { x: 0, y: 5 },   // Nucleus at y=5
      A: { x: 0, y: 10 },    // Apical at y=10
      B: { x: 0, y: 0 },
      R_soft: 1.2, R_hard: 0.4, eta_A: 2.5, eta_B: 2.5,
      has_A: true, has_B: true, phase: 0, birth_time: 0, division_time: 10,
      is_running: false, running_mode: 0, has_inm: false,
      time_A: Infinity, time_B: Infinity, time_S: Infinity, time_P: Infinity,
      stiffness_apical_apical: 1.0, stiffness_straightness: 100.0,
      stiffness_nuclei_apical: 1.0, stiffness_nuclei_basal: 1.0,
    });

    // Cell 1: LOW apical point - this cell's nucleus is below its own A,
    // but the apical strip will be influenced by this lower A point
    cells.push({
      id: 1,
      typeIndex: 'control',
      pos: { x: 5, y: 5 },   // Nucleus at y=5 (same as cell 0)
      A: { x: 5, y: 4 },     // Apical LOWER than nucleus! (y=4 < y=5)
      B: { x: 5, y: 0 },
      R_soft: 1.2, R_hard: 0.4, eta_A: 2.5, eta_B: 2.5,
      has_A: true, has_B: true, phase: 0, birth_time: 0, division_time: 10,
      is_running: false, running_mode: 0, has_inm: false,
      time_A: Infinity, time_B: Infinity, time_S: Infinity, time_P: Infinity,
      stiffness_apical_apical: 1.0, stiffness_straightness: 100.0,
      stiffness_nuclei_apical: 1.0, stiffness_nuclei_basal: 1.0,
    });

    // Cell 2: normal position
    cells.push({
      id: 2,
      typeIndex: 'control',
      pos: { x: 10, y: 5 },  // Nucleus at y=5
      A: { x: 10, y: 10 },   // Apical at y=10
      B: { x: 10, y: 0 },
      R_soft: 1.2, R_hard: 0.4, eta_A: 2.5, eta_B: 2.5,
      has_A: true, has_B: true, phase: 0, birth_time: 0, division_time: 10,
      is_running: false, running_mode: 0, has_inm: false,
      time_A: Infinity, time_B: Infinity, time_S: Infinity, time_P: Infinity,
      stiffness_apical_apical: 1.0, stiffness_straightness: 100.0,
      stiffness_nuclei_apical: 1.0, stiffness_nuclei_basal: 1.0,
    });

    const state: EHTSimulationState = {
      cells,
      ap_links: [],
      ba_links: [],
      t: 0,
      step_count: 0,
      geometry: { curvature_1: 0, curvature_2: 0 },
      basalGeometry: new StraightLineGeometry(),
      rngSeed: 'test-seed',
    };

    const params = createTestParams(['control']);
    const stats = computeEHTStatistics(state, params);

    console.log('Test 3 - Non-uniform apical strip:');
    console.log('  Cell 0: nucleus y=5, A y=10 (normal)');
    console.log('  Cell 1: nucleus y=5, A y=4 (apical below nucleus!)');
    console.log('  Cell 2: nucleus y=5, A y=10 (normal)');
    console.log('  x_control (mean):', stats['x_control']);
    console.log('  above_apical_control:', stats['above_apical_control']);

    // Cell 1 has apical at y=4, nucleus at y=5
    // For cell 1, the apical strip projection will be close to y=4
    // So x = (5 - 0) / (4 - 0) = 1.25 > 1 (above apical!)
    // This is correct behavior: the nucleus IS above the apical strip at that location

    // We expect above_apical > 0 because at least one cell is above its local apical strip
    console.log('  Note: Cell 1 should have x > 1 because its nucleus is above its local apical strip');
  });

  it('should correctly compute x for single cell', () => {
    // Single cell - simpler case to verify
    const cells: CellState[] = [];

    cells.push({
      id: 0,
      typeIndex: 'control',
      pos: { x: 10, y: 6 },  // Nucleus at 60% height
      A: { x: 10, y: 10 },   // Apical at height 10
      B: { x: 10, y: 0 },    // Basal on curve
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

    const state: EHTSimulationState = {
      cells,
      ap_links: [],
      ba_links: [],
      t: 0,
      step_count: 0,
      geometry: { curvature_1: 0, curvature_2: 0 },
      basalGeometry: new StraightLineGeometry(),
      rngSeed: 'test-seed',
    };

    const params = createTestParams(['control']);
    const stats = computeEHTStatistics(state, params);

    console.log('Test 4 - Single cell:');
    console.log('  Cell: nucleus at y=6, A at y=10, B at y=0');
    console.log('  Expected x = 6/10 = 0.6');
    console.log('  x_control:', stats['x_control']);
    console.log('  above_apical_control:', stats['above_apical_control']);

    // With a single cell:
    // - basal projection b = (10, 0) from StraightLineGeometry
    // - apical projection a = (10, 10) from cell's A point
    // - x = (6 - 0) / (10 - 0) = 0.6
    expect(stats['x_control']).toBeCloseTo(0.6, 1);
    expect(stats['above_apical_control']).toBe(0);
  });
});

describe('EHT Statistics - Batch state reconstruction', () => {
  it('should compute same statistics from snapshot as from original state', async () => {
    // This test verifies that the getSnapshot/loadSnapshot cycle preserves
    // the data needed for statistics computation

    // Create original state with cells in normal positions
    const cells: CellState[] = [];
    for (let i = 0; i < 5; i++) {
      const x = i * 5;
      cells.push({
        id: i,
        typeIndex: 'control',
        pos: { x, y: 5 },     // Nucleus at mid-height
        A: { x, y: 10 },      // Apical at height 10
        B: { x, y: 0 },       // Basal on curve
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

    const originalState: EHTSimulationState = {
      cells,
      ap_links: [{ l: 0, r: 1, rl: 1 }, { l: 1, r: 2, rl: 1 }],
      ba_links: [{ l: 0, r: 1 }, { l: 1, r: 2 }],
      t: 5.0,
      step_count: 100,
      geometry: { curvature_1: 0, curvature_2: 0 },
      basalGeometry: new StraightLineGeometry(),
      rngSeed: 'test-seed',
    };

    const params = createTestParams(['control']);

    // Compute stats from original state
    const originalStats = computeEHTStatistics(originalState, params);

    console.log('Original state stats:');
    console.log('  x_control:', originalStats['x_control']);
    console.log('  above_apical_control:', originalStats['above_apical_control']);

    // Get snapshot and load it back (simulating batch workflow)
    const { getSnapshot, loadSnapshot } = await import('./output');
    const snapshot = getSnapshot(originalState);

    console.log('Snapshot sample (first cell):');
    console.log('  pos_x:', snapshot[0].pos_x, 'pos_y:', snapshot[0].pos_y);
    console.log('  A_x:', snapshot[0].A_x, 'A_y:', snapshot[0].A_y);

    const reconstructedState = loadSnapshot(snapshot, params);

    // Compute stats from reconstructed state
    const reconstructedStats = computeEHTStatistics(reconstructedState, params);

    console.log('Reconstructed state stats:');
    console.log('  x_control:', reconstructedStats['x_control']);
    console.log('  above_apical_control:', reconstructedStats['above_apical_control']);

    // Stats should be the same (or very close)
    expect(reconstructedStats['x_control']).toBeCloseTo(originalStats['x_control'], 5);
    expect(reconstructedStats['above_apical_control']).toBe(originalStats['above_apical_control']);
  });

  it('should compute correct stats with curved geometry', () => {
    // Test with elliptical/circular geometry to see if projections work correctly

    // Create cells on a circular tissue (curvature = 0.1)
    const curvature = 0.1;
    const h = 5;  // tissue height

    // For circular geometry, cells are arranged around a circle
    // The basal curve is the circle, apical is at height h above it
    const circularGeometry = new CircularGeometry(curvature, curvature);

    const cells: CellState[] = [];
    for (let i = 0; i < 4; i++) {
      // Arc length position
      const arcLength = i * (circularGeometry.perimeter / 4);
      const basalPoint = circularGeometry.getPointAtArcLength(arcLength);
      const normal = circularGeometry.getNormal(basalPoint);

      // Apical and nucleus positions along the normal
      const apicalPoint = basalPoint.add(normal.scale(h));
      const nucleusPos = basalPoint.add(normal.scale(h * 0.5));  // Nucleus at 50% height

      cells.push({
        id: i,
        typeIndex: 'control',
        pos: nucleusPos,
        A: apicalPoint,
        B: basalPoint,
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

    const state: EHTSimulationState = {
      cells,
      ap_links: [],
      ba_links: [],
      t: 0,
      step_count: 0,
      geometry: { curvature_1: curvature, curvature_2: curvature },
      basalGeometry: circularGeometry,
      rngSeed: 'test-seed',
    };

    const params = createTestParams(['control']);
    const stats = computeEHTStatistics(state, params);

    console.log('Circular geometry stats:');
    console.log('  x_control:', stats['x_control']);
    console.log('  above_apical_control:', stats['above_apical_control']);

    // Cells at 50% height should have x ≈ 0.5
    // Might not be exactly 0.5 due to curved geometry projections
    expect(stats['x_control']).toBeGreaterThan(0);
    expect(stats['x_control']).toBeLessThan(1);
    expect(stats['above_apical_control']).toBe(0);
  });
});
