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

  const N = pg.N_init;
  const w = pg.full_circle && curvature_1 !== 0 && curvature_1 === curvature_2
    ? 2 * Math.PI * Math.abs(1 / curvature_1)
    : pg.w_init;
  const h = pg.h_init;

  // Determine EMT cell indices (middle section)
  const iEmt = Math.round((N - pg.N_emt) / 2);
  const jEmt = iEmt + pg.N_emt;

  // Generate initial positions
  const positions: Vector2[] = [];
  for (let i = 0; i < N; i++) {
    const l = rng.random(-w, w);
    const height = rng.random(h / 3, (2 * h) / 3);
    const pos = curvedCoordsToPosition(l, height, curvature_1, curvature_2);

    positions.push(pos);
  }

  // Sort by position along the basal curve (arc length), not by x coordinate.
  // This preserves ordering for curved membranes.
  positions.sort((a, b) => {
    const la = basalArcLength(basalCurve(a, curvature_1, curvature_2), curvature_1, curvature_2);
    const lb = basalArcLength(basalCurve(b, curvature_1, curvature_2), curvature_1, curvature_2);
    return la - lb;
  });

  // Create cells
  for (let i = 0; i < N; i++) {
    const cellType =
      i >= iEmt && i < jEmt
        ? params.cell_types.emt
        : params.cell_types.control;

    const cell = createCell(
      params,
      state,
      rng,
      positions[i],
      cellType
    );

    state.cells.push(cell);
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
