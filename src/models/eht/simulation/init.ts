/**
 * EHT model simulation initialization.
 * Sets up the initial state with cells and links.
 */

import { Vector2 } from '@/core/math/vector2';
import { SeededRandom } from '@/core/math/random';
import { basalArcLength, basalCurve, curvedCoordsToPosition } from '@/core/math/geometry';
import type { EHTSimulationState } from '../types';
import type { EHTParams } from '../params/types';
import { computeEllipseFromPerimeter } from '../params/geometry';
import { createCell } from './cell';

/**
 * Initialize the EHT simulation with cells.
 * Creates initial cell positions, assigns cell types, and establishes links.
 */
export function initializeEHTSimulation(
  params: EHTParams,
  state: EHTSimulationState,
  rng: SeededRandom
): void {
  const pg = params.general;

  // Compute and store geometry from perimeter/aspect_ratio
  const geometry = computeEllipseFromPerimeter(pg.perimeter, pg.aspect_ratio);
  state.geometry = {
    curvature_1: geometry.curvature_1,
    curvature_2: geometry.curvature_2,
  };

  const { curvature_1, curvature_2 } = state.geometry;

  // Collect all cell type entries and compute total N
  const cellTypeEntries = Object.entries(params.cell_types);
  const totalN = cellTypeEntries.reduce((sum, [, ct]) => sum + ct.N_init, 0);

  const w = pg.full_circle && curvature_1 !== 0 && curvature_1 === curvature_2
    ? 2 * Math.PI * Math.abs(1 / curvature_1)
    : pg.w_init;
  const h = pg.h_init;

  // Generate initial positions for all cells
  const positions: Vector2[] = [];
  for (let i = 0; i < totalN; i++) {
    const l = rng.random(-w, w);
    const height = rng.random(h / 3, (2 * h) / 3);
    const pos = curvedCoordsToPosition(l, height, curvature_1, curvature_2);
    positions.push(pos);
  }

  // Sort by position along the basal curve (arc length)
  positions.sort((a, b) => {
    const la = basalArcLength(basalCurve(a, curvature_1, curvature_2), curvature_1, curvature_2);
    const lb = basalArcLength(basalCurve(b, curvature_1, curvature_2), curvature_1, curvature_2);
    return la - lb;
  });

  // Build a list of cell type keys for each position
  // Distribute cell types along the tissue (each type gets contiguous segment)
  const typeAssignments: string[] = [];
  for (const [typeKey, cellType] of cellTypeEntries) {
    for (let i = 0; i < cellType.N_init; i++) {
      typeAssignments.push(typeKey);
    }
  }

  // Shuffle type assignments to distribute types, then sort positions
  // Actually, keep contiguous for now (simpler, matches old behavior)
  // Create cells
  let positionIndex = 0;
  for (const [typeKey, cellType] of cellTypeEntries) {
    for (let i = 0; i < cellType.N_init; i++) {
      if (positionIndex >= positions.length) break;

      const cell = createCell(
        params,
        state,
        rng,
        positions[positionIndex],
        cellType,
        typeKey
      );

      state.cells.push(cell);
      positionIndex++;
    }
  }

  // Create initial links between adjacent cells
  for (let i = 0; i < state.cells.length - 1; i++) {
    state.ap_links.push({
      l: i,
      r: i + 1,
      rl: params.cell_prop.apical_junction_init,
    });
    state.ba_links.push({
      l: i,
      r: i + 1,
    });
  }

  // If simulating a closed ring, connect the last and first cells as well.
  if (pg.full_circle && state.cells.length > 2) {
    const last = state.cells.length - 1;
    state.ap_links.push({
      l: last,
      r: 0,
      rl: params.cell_prop.apical_junction_init,
    });
    state.ba_links.push({
      l: last,
      r: 0,
    });
  }
}
