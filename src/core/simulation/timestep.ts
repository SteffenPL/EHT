/**
 * Time integration for the simulation.
 * Implements the timestep with substeps.
 */
import { Vector2 } from '../math/vector2';
import { SeededRandom } from '../math/random';
import type { SimulationState } from '../types/state';
import { CellPhase } from '../types/state';
import type { SimulationParams } from '../types/params';
import { getCellType, updateCellPhase } from './cell';
import { calcAllForces, CellForces } from './forces';
import { applyAllConstraints } from './constraints';
import { processEMTEvents } from './events';
import { processCellDivisions } from './division';

/**
 * Update cytoskeleton rest lengths (eta_A, eta_B).
 */
function updateCytoskeleton(
  state: SimulationState,
  params: SimulationParams,
  dt: number
): void {
  for (const cell of state.cells) {
    const cellType = getCellType(params, cell);

    const pos = Vector2.from(cell.pos);
    const A = Vector2.from(cell.A);
    const B = Vector2.from(cell.B);

    const distAX = pos.dist(A);
    const distBX = pos.dist(B);

    // Determine desired rest lengths based on phase and INM
    let apicalDrl = 0.0;
    let basalDrl = 0.0;

    const phaseMode = cell.phase + (cell.has_inm ? 0 : 10);

    switch (phaseMode) {
      case CellPhase.G2: // G2 with INM
      case CellPhase.Mitosis: // Mitosis with INM
        const distAB = A.dist(B);
        apicalDrl = 0.0;
        basalDrl = Math.max(0, distAB - 2 * cell.R_soft);
        break;

      default:
        apicalDrl = Math.max(0, distAX - cell.R_soft);
        basalDrl = Math.max(0, distBX - cell.R_soft);
    }

    // Update stiffness during G2
    if (cell.phase === CellPhase.G2) {
      cell.stiffness_apical_apical = cellType.stiffness_apical_apical_div;
    }

    // Update hard radius during mitosis
    if (cell.phase === CellPhase.Mitosis) {
      cell.R_hard = cellType.R_hard_div;
    }

    // Cells without adhesion have zero rest length
    if (!cell.has_A) apicalDrl = 0.0;
    if (!cell.has_B) basalDrl = 0.0;

    // Exponential relaxation toward desired rest length
    const expFactor = Math.exp(-dt * cellType.k_cytos);
    cell.eta_A = expFactor * (cell.eta_A - apicalDrl) + apicalDrl;

    if (cell.has_B) {
      cell.eta_B = expFactor * (cell.eta_B - basalDrl) + basalDrl;
    } else {
      if (cell.running_mode >= 2 && cell.B.y > 0) {
        cell.eta_B = Vector2.from(cell.B).dist(pos) - cell.R_soft;
      } else {
        cell.eta_B = expFactor * (cell.eta_B - basalDrl) + basalDrl;
      }
    }

    // Max cytoskeleton length constraint
    if (!cell.is_running || cell.has_B) {
      const maxLen = cellType.max_cytoskeleton_length;
      const tooLong = cell.eta_A + cell.eta_B - maxLen;

      if (maxLen > 0 && tooLong > 1) {
        const total = cell.eta_A + cell.eta_B;
        const targetA = (cell.eta_A * maxLen) / total;
        const targetB = (cell.eta_B * maxLen) / total;

        cell.eta_A = expFactor * (cell.eta_A - targetA) + targetA;
        cell.eta_B = expFactor * (cell.eta_B - targetB) + targetB;
      }
    }
  }
}

/**
 * Update apical junction rest lengths.
 */
function updateApicalJunctions(
  state: SimulationState,
  params: SimulationParams,
  dt: number
): void {
  for (const link of state.ap_links) {
    const ci = state.cells[link.l];
    const cj = state.cells[link.r];
    const ciType = getCellType(params, ci);
    const cjType = getCellType(params, cj);

    const kAvg = 0.5 * ciType.k_apical_junction + 0.5 * cjType.k_apical_junction;
    link.rl = link.rl * Math.exp(-dt * kAvg);
  }
}

/**
 * Integrate forces for one substep.
 */
function integrateForces(
  state: SimulationState,
  params: SimulationParams,
  forces: CellForces[],
  rng: SeededRandom,
  dt: number
): void {
  const mu = params.general.mu;
  const diffusion = params.cell_prop.diffusion;
  const sqrtDt = Math.sqrt(dt);

  for (let i = 0; i < state.cells.length; i++) {
    const cell = state.cells[i];
    const cellType = getCellType(params, cell);
    const f = forces[i];

    // Add diffusion noise
    cell.pos.x += sqrtDt * diffusion * rng.gaussian();
    cell.pos.y += sqrtDt * diffusion * rng.gaussian();

    // Integrate nucleus force
    cell.pos.x += (dt * f.f.x) / mu;
    cell.pos.y += (dt * f.f.y) / mu;

    // Integrate apical force
    cell.A.x += (dt * f.fA.x) / mu;
    cell.A.y += (dt * f.fA.y) / mu;

    // Integrate basal force or running motion
    if (cell.is_running) {
      const B = Vector2.from(cell.B);
      const pos = Vector2.from(cell.pos);

      if (B.dist(pos) < 5) {
        const dir = B.sub(pos).normalize();
        cell.B.x += dt * dir.x * cellType.running_speed;
        cell.B.y += dt * dir.y * cellType.running_speed;
      }
    } else {
      cell.B.x += (dt * f.fB.x) / mu;
      cell.B.y += (dt * f.fB.y) / mu;

      // Extra basal motion for cells without basal adhesion
      if (!cell.has_B) {
        cell.B.y += (dt * f.fB.y) / mu;
      }
    }
  }
}

/**
 * Perform one full timestep (with substeps).
 */
export function performTimestep(
  state: SimulationState,
  params: SimulationParams,
  rng: SeededRandom
): number {
  const pg = params.general;
  const fullDt = pg.dt;

  // Update cell phases
  for (const cell of state.cells) {
    const cellType = getCellType(params, cell);
    updateCellPhase(cell, cellType, state.t);
  }

  // Process cell divisions
  const divisions = processCellDivisions(state, params, rng);

  // Process EMT events
  processEMTEvents(state, params, fullDt);

  // Update cytoskeleton
  updateCytoskeleton(state, params, fullDt);

  // Update apical junctions
  updateApicalJunctions(state, params, fullDt);

  // Substep integration
  const substepDt = fullDt / pg.n_substeps;

  for (let step = 0; step < pg.n_substeps; step++) {
    state.t += substepDt;

    // Calculate forces
    const forces = calcAllForces(state, params);

    // Integrate
    integrateForces(state, params, forces, rng, substepDt);

    // Apply constraints
    applyAllConstraints(state, params);
  }

  state.step_count++;

  return divisions;
}
