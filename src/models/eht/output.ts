
import type { EHTSimulationState, CellState, ApicalLink, BasalLink } from './types';
import type { EHTParams } from './params/types';
import { CellPhase } from './types';
import { createBasalGeometry } from '@/core/math';


/**
 * Get neighbor cell IDs from link array.
 */
function getNeighborIds(
    cellIndex: number,
    links: (ApicalLink | BasalLink)[],
    cells: CellState[]
): string {
    const neighborIndices: number[] = [];

    for (const link of links) {
        if (link.l === cellIndex) {
            neighborIndices.push(link.r);
        } else if (link.r === cellIndex) {
            neighborIndices.push(link.l);
        }
    }

    // Convert indices to cell IDs
    return neighborIndices.map((i) => cells[i]?.id ?? i).join(';');
}

/**
 * Serialize state to a list of flat objects (rows).
 */
export function getSnapshot(state: EHTSimulationState): Record<string, any>[] {
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < state.cells.length; i++) {
        const cell = state.cells[i];
        rows.push({
            // Identity
            id: cell.id,
            typeIndex: cell.typeIndex,

            // Time
            t: state.t,
            step_count: state.step_count,

            // Position / Geometry
            pos_x: cell.pos.x,
            pos_y: cell.pos.y,
            A_x: cell.A.x,
            A_y: cell.A.y,
            B_x: cell.B.x,
            B_y: cell.B.y,

            // Properties
            has_A: cell.has_A,
            has_B: cell.has_B,
            phase: cell.phase,
            age: state.t - cell.birth_time,
            is_running: cell.is_running,
            running_mode: cell.running_mode,
            has_inm: cell.has_inm,

            // Internal State
            eta_A: cell.eta_A,
            eta_B: cell.eta_B,
            R_soft: cell.R_soft,
            R_hard: cell.R_hard,

            // Events
            time_A: cell.time_A,
            time_B: cell.time_B,
            time_S: cell.time_S,
            time_P: cell.time_P,
            time_AC: cell.time_AC,

            // Network
            apical_neighbors: getNeighborIds(i, state.ap_links, state.cells),
            basal_neighbors: getNeighborIds(i, state.ba_links, state.cells),

            // Global Geometry
            curvature_1: state.geometry?.curvature_1 ?? 0,
            curvature_2: state.geometry?.curvature_2 ?? 0,
        });
    }
    return rows;
}

/**
 * Reconstruct state from rows.
 */
export function loadSnapshot(rows: Record<string, any>[], params: EHTParams): EHTSimulationState {
    if (rows.length === 0) {
        return {
            cells: [],
            ap_links: [],
            ba_links: [],
            t: 0,
            step_count: 0,
            basalGeometry: createBasalGeometry(0, 0, 360),
            rngSeed: String(params.general.random_seed)
        };
    }

    const firstRow = rows[0];
    const t = Number(firstRow.t);
    const step_count = Number(firstRow.step_count);
    const curvature_1 = Number(firstRow.curvature_1);
    const curvature_2 = Number(firstRow.curvature_2);

    const state: EHTSimulationState = {
        cells: [],
        ap_links: [],
        ba_links: [],
        t,
        step_count,
        geometry: { curvature_1, curvature_2 },
        basalGeometry: createBasalGeometry(curvature_1, curvature_2, 360),
        // Use seed from params since it's not saved in CSV (would require schema change)
        rngSeed: String(params.general.random_seed)
    };

    // Map from cell ID to array index
    const idMap = new Map<number, number>();

    // 1. Recreate cells
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const id = Number(row.id);
        idMap.set(id, i);

        const cell: CellState = {
            id,
            typeIndex: String(row.typeIndex),
            pos: { x: Number(row.pos_x), y: Number(row.pos_y) },
            A: { x: Number(row.A_x), y: Number(row.A_y) },
            B: { x: Number(row.B_x), y: Number(row.B_y) },

            has_A: Boolean(row.has_A),
            has_B: Boolean(row.has_B),
            // Handle legacy phase as number or enum
            phase: Number(row.phase) as CellPhase,
            birth_time: t - Number(row.age),
            division_time: 0, // Recalculate or store? Simplified: set to 0 and let update logic handle

            is_running: Boolean(row.is_running),
            running_mode: Number(row.running_mode),
            has_inm: Boolean(row.has_inm),

            eta_A: Number(row.eta_A),
            eta_B: Number(row.eta_B),
            R_soft: Number(row.R_soft),
            R_hard: Number(row.R_hard),

            time_A: Number(row.time_A),
            time_B: Number(row.time_B),
            time_S: Number(row.time_S),
            time_P: Number(row.time_P),
            time_AC: Number(row.time_AC ?? Infinity),

            // Stiffness constants - load from params (approximate for restart) 
            // or we'd need to save them all.
            // Since they are mostly constant per cell type (except dynamic changes), 
            // we'll reload initial from params for simplicity, 
            // BUT if stiffness changes (e.g. lose straightness), we need to handle that.
            stiffness_apical_apical: 1.0, // Default
            stiffness_straightness: Number(row.time_S) < t ? 1.0 : 100.0, // Approximation based on event time
            stiffness_nuclei_apical: !Boolean(row.has_A) ? 0.1 : 1.0,  // Approximation
            stiffness_nuclei_basal: !Boolean(row.has_B) ? 0.1 : 1.0,
        };

        // Fill in correct stiffness from params as baseline
        const cellType = params.cell_types[cell.typeIndex] || params.cell_types.control;
        cell.stiffness_apical_apical = cellType.stiffness_apical_apical;
        // Apply event modifiers logic roughly
        if (Boolean(row.has_A) === false) cell.stiffness_nuclei_apical = cellType.stiffness_nuclei_apical * 0.1;
        else cell.stiffness_nuclei_apical = cellType.stiffness_nuclei_apical;

        if (Boolean(row.has_B) === false) cell.stiffness_nuclei_basal = cellType.stiffness_nuclei_basal * 0.1;
        else cell.stiffness_nuclei_basal = cellType.stiffness_nuclei_basal;

        if (cell.time_S && t > cell.time_S) cell.stiffness_straightness = 1.0;
        else cell.stiffness_straightness = cellType.stiffness_straightness;

        // Recalculate division time
        cell.division_time = cell.birth_time + (cellType.lifespan_end + cellType.lifespan_start) / 2; // Approx

        state.cells.push(cell);
    }

    // 2. Recreate links
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cellIndex = i; // aligned because we pushed in order

        // Apical neighbors
        const apicalIds = String(row.apical_neighbors || '').split(';').filter(s => s !== '');
        for (const nIdStr of apicalIds) {
            const nId = Number(nIdStr);
            const neighborIndex = idMap.get(nId);
            if (neighborIndex !== undefined && neighborIndex > cellIndex) { // Avoid duplicates
                // Recalculate RL based on current distance to prevent snapping
                const c1 = state.cells[cellIndex];
                const c2 = state.cells[neighborIndex];
                const dist = Math.sqrt(Math.pow(c1.A.x - c2.A.x, 2) + Math.pow(c1.A.y - c2.A.y, 2));
                state.ap_links.push({
                    l: cellIndex,
                    r: neighborIndex,
                    rl: dist
                });
            }
        }

        // Basal neighbors
        const basalIds = String(row.basal_neighbors || '').split(';').filter(s => s !== '');
        for (const nIdStr of basalIds) {
            const nId = Number(nIdStr);
            const neighborIndex = idMap.get(nId);
            if (neighborIndex !== undefined && neighborIndex > cellIndex) {
                state.ba_links.push({
                    l: cellIndex,
                    r: neighborIndex
                });
            }
        }
    }

    return state;
}
