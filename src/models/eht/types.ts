/**
 * EHT Model specific state definitions.
 */

import type { BasalGeometry } from '@/core/math';
import { StraightLineGeometry } from '@/core/math';

/** Cell phase enum */
export enum CellPhase {
    G1 = 0,       // Normal growth
    G2 = 1,       // Pre-mitosis (moving to apical)
    Mitosis = 2,  // Dividing
    Division = 3, // Ready to divide (triggers division logic)
}

/**
 * Cell event state - tracks per-cell event status for v1.1.0 event system.
 */
export interface CellEventState {
    /** Event definition ID */
    event_id: string;
    /** Sampled trigger time (between event start/end, Infinity if skipped) */
    trigger_time: number;
    /** Whether the event has fired at least once */
    has_fired: boolean;
    /** Time of last fire (for periodic events) */
    last_fire_time: number;
    /** Number of times the event has fired */
    fire_count: number;
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

    // Cytoskeleton strain (-1 = inactive, 0 = no change, scales drl)
    apical_cytos_strain: number;
    basal_cytos_strain: number;

    // Cell cycle
    phase: CellPhase;
    birth_time: number;
    division_time: number;

    // Running/migration
    is_running: boolean;
    running_mode: number;

    // INM (interkinetic nuclear migration)
    has_inm: boolean;

    // EMT event times (sampled at cell creation) - legacy v1.0.0
    time_A: number;
    time_B: number;
    time_S: number;
    time_P: number;
    time_AC: number;

    // Stiffness values (can change dynamically)
    stiffness_apical_apical: number;
    stiffness_straightness: number;
    stiffness_nuclei_apical: number;
    stiffness_nuclei_basal: number;
    k_apical_junction: number;

    // New v1.1.0 event system
    /** Event states for v1.1.0 event system (keyed by event ID) */
    event_states?: Record<string, CellEventState>;
    /** True once cell has entered G2 phase (for cell_cycle_phase requirements) */
    has_reached_G2?: boolean;
    /** True once cell has entered Mitosis phase (for cell_cycle_phase requirements) */
    has_reached_mitosis?: boolean;
}

/** Geometry parameters computed at initialization */
export interface GeometryState {
    curvature_1: number; // Horizontal membrane curvature (1/a)
    curvature_2: number; // Vertical membrane curvature (1/b)
}

/** Complete simulation state for EHT */
export interface EHTSimulationState {
    cells: CellState[];
    ap_links: ApicalLink[];
    ba_links: BasalLink[];
    t: number;
    step_count: number;
    geometry?: GeometryState; // Computed geometry (model-specific)
    basalGeometry: BasalGeometry; // Pre-computed basal curve geometry
    /** RNG seed for reproducibility (stored for deterministic replay) */
    rngSeed: string;
}

/** Initial state for a new simulation */
export function createInitialEHTState(seed: string = 'default'): EHTSimulationState {
    return {
        cells: [],
        ap_links: [],
        ba_links: [],
        t: 0,
        step_count: 0,
        basalGeometry: new StraightLineGeometry(), // Placeholder, will be replaced during init
        rngSeed: seed,
    };
}
