/**
 * EHT model cell division logic.
 * Handles cell division and link management.
 */

import { Vector2 } from '@/core/math/vector2';
import { SeededRandom } from '@/core/math/random';
import type { EHTSimulationState } from '../types';
import { CellPhase } from '../types';
import type { EHTParams } from '../params/types';
import { createCell, getCellType, type CreateCellInput } from './cell';

/**
 * Process cell divisions for all cells in Division phase.
 * Returns the number of divisions that occurred.
 */
export function processCellDivisions(
  state: EHTSimulationState,
  params: EHTParams,
  rng: SeededRandom
): number {
  let divisionCount = 0;

  // Process divisions (iterate with index since array may grow)
  for (let i = 0; i < state.cells.length; i++) {
    const cell = state.cells[i];

    if (cell.phase !== CellPhase.Division) continue;

    const cellType = getCellType(params, cell);

    // Build input from parent cell's current positions
    const cellInput: CreateCellInput = {
      basalPoint: Vector2.from(cell.B),
      apicalPoint: Vector2.from(cell.A),
      nucleusPosition: Vector2.from(cell.pos),
    };

    if (cell.typeIndex === 'emt') {
      // EMT cells just reset their cycle (no actual division)
      const newCell = createCell(
        params,
        state,
        rng,
        cellInput,
        cellType,
        cell.typeIndex,
        cell
      );
      // Preserve the cell's ID
      newCell.id = cell.id;
      state.cells[i] = newCell;
    } else {
      // Control cells can divide
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
        state.cells[i] = newCell;
      } else {
        // Two offspring - create a new cell
        divisionCount++;

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
        state.cells[i] = cell1;

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

        // Offset positions slightly
        const offset = 0.05 * cell1.R_soft;
        cell1.pos.x -= offset;
        cell2.pos.x += offset;
        cell1.A.x -= offset;
        cell2.A.x += offset;
        cell1.B.x -= offset;
        cell2.B.x += offset;

        // Add the new cell
        const newCellIndex = state.cells.length;
        state.cells.push(cell2);

        // Update apical links
        updateApicalLinksAfterDivision(state, params, i, newCellIndex);

        // Update basal links
        updateBasalLinksAfterDivision(state, params, i, newCellIndex);
      }
    }
  }

  return divisionCount;
}

/**
 * Update apical links after a cell division.
 * The new cell takes over the right connection of the original cell.
 */
function updateApicalLinksAfterDivision(
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

  // Add new link between original and new cell
  state.ap_links.push({
    l: originalIndex,
    r: newIndex,
    rl: params.cell_prop.apical_junction_init,
  });
}

/**
 * Update basal links after a cell division.
 * Similar to apical links.
 */
function updateBasalLinksAfterDivision(
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
