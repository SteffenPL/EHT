/**
 * Simulation state type definitions.
 * Represents the runtime state of the simulation.
 */

/** Cell phase enum */
export enum CellPhase {
  G1 = 0,       // Normal growth
  G2 = 1,       // Pre-mitosis (moving to apical)
  Mitosis = 2,  // Dividing
  Division = 3, // Ready to divide (triggers division logic)
}

/** Apical link between neighboring cells */
export interface ApicalLink {
  l: number;  // Left cell index
  r: number;  // Right cell index
  rl: number; // Rest length
}

/** Basal link between neighboring cells */
export interface BasalLink {
  l: number;  // Left cell index
  r: number;  // Right cell index
}

/**
 * Cell state - runtime data for a single cell.
 * Note: Positions are stored as {x, y} objects, not Vector2 instances,
 * for easier serialization. Use Vector2 for calculations.
 */
export interface CellState {
  id: number;
  typeIndex: string;  // Key into cell_types map (e.g., 'control', 'emt')

  // Positions
  pos: { x: number; y: number };  // Nucleus position
  A: { x: number; y: number };    // Apical point
  B: { x: number; y: number };    // Basal point

  // Physical properties (may change during simulation)
  R_soft: number;
  R_hard: number;

  // Cytoskeleton rest lengths
  eta_A: number;
  eta_B: number;

  // Adhesion state
  has_A: boolean;  // Has apical adhesion
  has_B: boolean;  // Has basal adhesion

  // Cell cycle
  phase: CellPhase;
  birth_time: number;
  division_time: number;

  // Running/migration
  is_running: boolean;
  running_mode: number;

  // INM (interkinetic nuclear migration)
  has_inm: boolean;

  // EMT event times (sampled at cell creation)
  time_A: number;
  time_B: number;
  time_S: number;
  time_P: number;

  // Stiffness values (can change dynamically)
  stiffness_apical_apical: number;
  stiffness_straightness: number;
  stiffness_nuclei_apical: number;
  stiffness_nuclei_basal: number;
}

/** Complete simulation state */
export interface SimulationState {
  cells: CellState[];
  ap_links: ApicalLink[];
  ba_links: BasalLink[];
  t: number;
  step_count: number;
}

/** Initial state for a new simulation */
export function createInitialState(): SimulationState {
  return {
    cells: [],
    ap_links: [],
    ba_links: [],
    t: 0,
    step_count: 0,
  };
}
