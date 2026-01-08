/**
 * EHT model simulation initialization.
 * Sets up the initial state with cells and links.
 */

import { Vector2 } from '@/core/math/vector2';
import { SeededRandom } from '@/core/math/random';
import { createBasalGeometry } from '@/core/math';
import type { EHTSimulationState } from '../types';
import type { EHTParams } from '../params/types';
import { computeEllipseFromPerimeter, ramanujanPerimeter } from '../params/geometry';
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

  // Create pre-computed basal geometry representation
  state.basalGeometry = createBasalGeometry(curvature_1, curvature_2, 360);

  // Collect all cell type entries and compute total N
  const cellTypeEntries = Object.entries(params.cell_types);
  const totalN = cellTypeEntries.reduce((sum, [, ct]) => sum + ct.N_init, 0);

  // first we distribute cell positions along a periodic domain from [-1, 1] in x
  // later we will wrap it around to the curved basal membrane

  const locations: [number,string][] = [];
  for(let i = 0; i < totalN; i++) {
    
    locations.push([-1 + (2 * (i)) / totalN, ""]);
  }

  // sort cell type entried by weather or not they have a location specified
  cellTypeEntries.sort((a, b) => {
    const aHasLoc = a[1].location !== "" ? 1 : 0;
    const bHasLoc = b[1].location !== "" ? 1 : 0;
    return bHasLoc - aHasLoc;
  });

  // assign locations to cell types that have them specified
  for(const [typeKey, cellType] of cellTypeEntries) {
    if(cellType.location !== "") {
      let locValue: number;
      // console.log("Assigning locations for cell type", typeKey, "with location", cellType.location);
      if(cellType.location === "top") {
        locValue = 1;
      } else if(cellType.location === "bottom") {
        locValue = 0;
      } else {
        locValue = parseFloat(cellType.location);
        if(isNaN(locValue) || locValue < -1 || locValue > 1) {
          locValue = 0.0;
        }
      }

      // sort locations by closeness to desired location, using modulo on [-1, 1]
      locations.sort((a, b) => {
        return Math.min(Math.abs(a[0] - locValue),Math.abs(a[0] + 2 - locValue)) -
          Math.min(Math.abs(b[0] - locValue),Math.abs(b[0] + 2 - locValue));
      });

      // assign the closest unassigned locations to this cell type
      let assigned = 0;
      for(let i = 0; i < locations.length && assigned < cellType.N_init; i++) {
        if(locations[i][1] === "") {
          locations[i] = [locations[i][0], typeKey];
          console.log("Assigned location", locations[i][0], "to cell type", typeKey);
          assigned++;
        }
      }
    }
  }

  // sort locations again by x value
  locations.sort((a, b) => a[0] - b[0]);

  // fill in unassigned locations with remaining cell types
  let assignIndex = 0;
  for(let i = 0; i < locations.length; i++) {
    if(locations[i][1] !== "") continue; // Check if already assigned
    while(assignIndex < cellTypeEntries.length) {
      const [typeKey, cellType] = cellTypeEntries[assignIndex];
      const assignedCount = locations.filter(loc => loc[1] === typeKey).length; // Count in locations array
      if(assignedCount < cellType.N_init) {
        locations[i] = [locations[i][0], typeKey]; // Assign type key to location
        break;
      } else {
        assignIndex++;
      }
    }
  }

  // Sort locations back to original order
  locations.sort((a, b) => a[0] - b[0]);

  const perimeter = ramanujanPerimeter(
    Math.abs(1 / curvature_1),
    Math.abs(1 / curvature_2)
  );
  const w = pg.full_circle ? perimeter : pg.w_init;
  const h = pg.h_init;

  // Generate initial positions for all cells
  const positions: Vector2[] = [];
  const typeAssignments: string[] = [];
  for (let i = 0; i < totalN; i++) {
    const l = locations[i][0] * (w / 2) + perimeter/4;
    if( !pg.full_circle ) {

    }
    
    const height = rng.random(h / 3, (2 * h) / 3);
    const pos = state.basalGeometry.curvedToCartesian(l, height);
    positions.push(pos);
    typeAssignments.push(locations[i][1]);
  }



  // // Sort by position along the basal curve (arc length)
  // positions.sort((a, b) => {
  //   const la = basalArcLength(basalCurve(a, curvature_1, curvature_2), curvature_1, curvature_2);
  //   const lb = basalArcLength(basalCurve(b, curvature_1, curvature_2), curvature_1, curvature_2);
  //   return la - lb;
  // });

  // Shuffle type assignments to distribute types, then sort positions
  // Actually, keep contiguous for now (simpler, matches old behavior)
  // Create cells
  state.cells = [];
  for(let i = 0; i < positions.length; i++) {
    const typeKey = typeAssignments[i];
    const cellType = params.cell_types[typeKey];
    if(!cellType) {
      console.warn("No cell type found for key", typeKey);
      continue;
    }
    const cell = createCell(
      params,
      state,
      rng,
      positions[i],
      cellType,
      typeKey
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
