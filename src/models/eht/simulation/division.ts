/**
 * EHT model cell division logic.
 * Handles cell division and link management.
 */

import { Vector2 } from '@/core/math/vector2';
import { SeededRandom } from '@/core/math/random';
import type { EHTSimulationState } from '../types';
import type { EHTParams } from '../params/types';
import { createCell, getCellType, type CreateCellInput } from './cell';

/**
 * Perform a single cell division (two offspring) for a cell at the given index.
 * Creates a daughter cell, offsets positions, and updates links.
 */
export function divideSingleCell(
  state: EHTSimulationState,
  params: EHTParams,
  rng: SeededRandom,
  cellIndex: number
): void {
  const cell = state.cells[cellIndex];
  const cellType = getCellType(params, cell);

  // Build input from parent cell's current positions
  const cellInput: CreateCellInput = {
    basalPoint: Vector2.from(cell.B),
    apicalPoint: Vector2.from(cell.A),
    nucleusPosition: Vector2.from(cell.pos),
  };

  const shouldDivideOut = rng.random() < params.general.p_div_out;

  if (shouldDivideOut) {
    // One offspring - just reset the cell
    const newCell = createCell(
      params,
      state,
      rng,
      cellInput,
      cellType,
      cell.typeIndex,
      cell
    );
    newCell.id = cell.id;
    state.cells[cellIndex] = newCell;
  } else {
    // Two offspring - create a new cell

    // Reset the original cell
    const cell1 = createCell(
      params,
      state,
      rng,
      cellInput,
      cellType,
      cell.typeIndex,
      cell
    );
    cell1.id = cell.id;
    state.cells[cellIndex] = cell1;

    // Create the second cell
    const cell2 = createCell(
      params,
      state,
      rng,
      cellInput,
      cellType,
      cell.typeIndex,
      cell1
    );

    // Offset positions slightly along tangent direction
    const offset = 0.005 * cell1.R_soft;

    // Get basal point and project onto curve to get normal
    const B = Vector2.from(cell1.B);
    const BProjected = state.basalGeometry.projectPoint(B);
    const N = state.basalGeometry.getNormal(BProjected);

    // Rotate normal 90° clockwise to get tangent: (nx, ny) -> (ny, -nx)
    const T = new Vector2(N.y, -N.x);

    // Offset along tangent direction
    cell1.pos.x -= offset * T.x;
    cell1.pos.y -= offset * T.y;
    cell2.pos.x += offset * T.x;
    cell2.pos.y += offset * T.y;

    cell1.A.x -= offset * T.x;
    cell1.A.y -= offset * T.y;
    cell2.A.x += offset * T.x;
    cell2.A.y += offset * T.y;

    cell1.B.x -= offset * T.x;
    cell1.B.y -= offset * T.y;
    cell2.B.x += offset * T.x;
    cell2.B.y += offset * T.y;

    // Add the new cell
    const newCellIndex = state.cells.length;
    state.cells.push(cell2);

    // Update apical links
    updateApicalLinksAfterDivision(state, params, cellIndex, newCellIndex);

    // Update basal links
    updateBasalLinksAfterDivision(state, params, cellIndex, newCellIndex);
  }
}

/**
 * Update apical links after a cell division.
 * The new cell takes over the right connection of the original cell.
 */
export function updateApicalLinksAfterDivision(
  state: EHTSimulationState,
  params: EHTParams,
  originalIndex: number,
  newIndex: number
): void {
  // Transfer right-side connections to the new cell
  for (const link of state.ap_links) {
    if (link.l === originalIndex) {
      link.l = newIndex;
    }
  }

  // Use the cell type's apical junction init (both cells are same type after division)
  const cellType = getCellType(params, state.cells[originalIndex]);

  // Add new link between original and new cell
  state.ap_links.push({
    l: originalIndex,
    r: newIndex,
    rl: cellType.apical_junction_init,
  });
}

/**
 * Update basal links after a cell division.
 * Similar to apical links.
 */
export function updateBasalLinksAfterDivision(
  state: EHTSimulationState,
  _params: EHTParams,
  originalIndex: number,
  newIndex: number
): void {
  // Transfer right-side connections to the new cell
  for (const link of state.ba_links) {
    if (link.l === originalIndex) {
      link.l = newIndex;
    }
  }

  // Add new link between original and new cell
  state.ba_links.push({
    l: originalIndex,
    r: newIndex,
  });
}
