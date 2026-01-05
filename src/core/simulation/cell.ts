/**
 * Cell class for the simulation.
 * Manages cell state creation and initialization.
 */
import { Vector2 } from '../math/vector2';
import { basalCurve, basalNormal } from '../math/geometry';
import { SeededRandom } from '../math/random';
import type { CellState, SimulationState } from '../types/state';
import { CellPhase } from '../types/state';
import type { SimulationParams, CellTypeParams } from '../types/params';

/**
 * Create a new cell state.
 *
 * @param params - Simulation parameters
 * @param state - Current simulation state (for time reference)
 * @param rng - Seeded random number generator
 * @param position - Initial nucleus position
 * @param cellType - Cell type parameters
 * @param parent - Parent cell (for cell division)
 * @returns New cell state
 */
export function createCell(
  params: SimulationParams,
  state: SimulationState,
  rng: SeededRandom,
  position: Vector2,
  cellType: CellTypeParams,
  parent?: CellState
): CellState {
  const h = params.general.h_init;
  const curvature = params.general.curvature;

  // Calculate apical and basal positions
  const B = basalCurve(position, curvature);
  const normal = basalNormal(position, curvature);
  const A = B.add(normal.scale(h));

  // Determine lifespan
  const maxAge = rng.random(cellType.lifespan.min, cellType.lifespan.max);

  // Generate unique ID
  const id = state.cells.length > 0
    ? Math.max(...state.cells.map(c => c.id)) + 1
    : 0;

  if (parent === undefined) {
    // New cell (not from division)
    const birthTime = state.t - rng.random(0, maxAge);

    // Sample EMT event times
    let time_A = rng.random(cellType.events.time_A.min, cellType.events.time_A.max);
    let time_B = rng.random(cellType.events.time_B.min, cellType.events.time_B.max);
    let time_S = rng.random(cellType.events.time_S.min, cellType.events.time_S.max);
    const time_P = rng.random() <= cellType.run
      ? time_B
      : Infinity;

    // Heterogeneous EMT behavior
    if (cellType.hetero) {
      if (rng.random() > 0.7) time_A = Infinity;
      if (rng.random() > 0.7) time_B = Infinity;
      if (rng.random() > 0.7) time_S = Infinity;
    }

    return {
      id,
      typeIndex: cellType.name,
      pos: position.toObject(),
      A: A.toObject(),
      B: B.toObject(),
      R_soft: cellType.R_soft,
      R_hard: cellType.R_hard,
      eta_A: h / 2,
      eta_B: h / 2,
      has_A: true,
      has_B: true,
      phase: CellPhase.G1,
      birth_time: birthTime,
      division_time: birthTime + maxAge,
      is_running: false,
      running_mode: cellType.running_mode,
      has_inm: rng.random() <= cellType.INM,
      time_A,
      time_B,
      time_S,
      time_P,
      stiffness_apical_apical: cellType.stiffness_apical_apical,
      stiffness_straightness: cellType.stiffness_straightness,
      stiffness_nuclei_apical: cellType.stiffness_nuclei_apical,
      stiffness_nuclei_basal: cellType.stiffness_nuclei_basal,
    };
  } else {
    // Cell from division - inherit properties from parent
    return {
      id,
      typeIndex: cellType.name,
      pos: position.toObject(),
      A: { ...parent.A },
      B: { ...parent.B },
      R_soft: cellType.R_soft,
      R_hard: cellType.R_hard,
      eta_A: parent.eta_A,
      eta_B: parent.eta_B,
      has_A: parent.has_A,
      has_B: parent.has_B,
      phase: CellPhase.G1,
      birth_time: state.t,
      division_time: state.t + maxAge,
      is_running: parent.is_running,
      running_mode: parent.running_mode,
      has_inm: parent.has_inm,
      time_A: parent.time_A,
      time_B: parent.time_B,
      time_S: parent.time_S,
      time_P: parent.time_P,
      stiffness_apical_apical: cellType.stiffness_apical_apical,
      stiffness_straightness: parent.stiffness_straightness,
      stiffness_nuclei_apical: parent.stiffness_nuclei_apical,
      stiffness_nuclei_basal: parent.stiffness_nuclei_basal,
    };
  }
}

/**
 * Get the cell type parameters for a cell.
 */
export function getCellType(
  params: SimulationParams,
  cell: CellState
): CellTypeParams {
  return params.cell_types[cell.typeIndex] || params.cell_types.control;
}

/**
 * Update cell phase based on time.
 */
export function updateCellPhase(
  cell: CellState,
  cellType: CellTypeParams,
  t: number
): void {
  const divTime = cell.division_time;
  const g2Start = divTime - cellType.dur_G2 - cellType.dur_mitosis;
  const mitosisStart = divTime - cellType.dur_mitosis;

  if (t < g2Start) {
    cell.phase = CellPhase.G1;
  } else if (t < mitosisStart) {
    cell.phase = CellPhase.G2;
  } else if (t < divTime) {
    cell.phase = CellPhase.Mitosis;
  } else {
    cell.phase = CellPhase.Division;
  }
}
