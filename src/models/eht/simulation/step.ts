/**
 * Time integration for the EHT simulation.
 * Implements the timestep with substeps.
 */
import { SeededRandom } from '@/core/math/random';
import type { EHTSimulationState } from '../types';

import type { EHTParams } from '../params/types';
import { getCellType, updateCellPhase } from './cell';
import { calcAllForces, type CellForces } from './forces';
import { applyAllConstraints } from './constraints';
import { processAllEvents } from './events';
import { processGlobalEvents } from './global-events';
import { rebuildGeometryIfNeeded } from './rebuild-geometry';

/**
 * Update cytoskeleton rest lengths (eta_A, eta_B).
 */
function updateCytoskeleton(
    state: EHTSimulationState,
    params: EHTParams,
    dt: number
): void {
    for (const cell of state.cells) {
        const cellType = getCellType(params, cell);

        const ax = cell.pos.x - cell.A.x;
        const ay = cell.pos.y - cell.A.y;
        const bx = cell.pos.x - cell.B.x;
        const by = cell.pos.y - cell.B.y;
        const distAX = Math.sqrt(ax * ax + ay * ay);
        const distBX = Math.sqrt(bx * bx + by * by);

        // Determine desired rest lengths
        let apicalDrl = Math.max(0, distAX - cell.R_soft);
        let basalDrl = Math.max(0, distBX - cell.R_soft);

        // Apply cytoskeleton strain
        // strain === -1: inactive (drl = 0)
        // strain === 0: no change
        // otherwise: drl *= (1 + strain)
        if (cell.apical_cytos_strain === -1) {
            apicalDrl = 0.0;
        } else if (cell.apical_cytos_strain !== 0) {
            apicalDrl *= (1 + cell.apical_cytos_strain);
        }

        if (cell.basal_cytos_strain === -1) {
            basalDrl = 0.0;
        } else if (cell.basal_cytos_strain !== 0) {
            basalDrl *= (1 + cell.basal_cytos_strain);
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
                cell.eta_B = distBX - cell.R_soft;
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
    state: EHTSimulationState,
    _params: EHTParams,
    dt: number
): void {
    for (const link of state.ap_links) {
        const ci = state.cells[link.l];
        const cj = state.cells[link.r];

        const kAvg = 0.5 * ci.k_apical_junction + 0.5 * cj.k_apical_junction;
        link.rl = link.rl * Math.exp(-dt * kAvg);
    }
}

/**
 * Integrate forces for one substep.
 */
function integrateForces(
    state: EHTSimulationState,
    params: EHTParams,
    forces: CellForces[],
    rng: SeededRandom,
    dt: number
): void {
    const mu = params.general.mu;
    const sqrtDt = Math.sqrt(dt);

    for (let i = 0; i < state.cells.length; i++) {
        const cell = state.cells[i];
        const cellType = getCellType(params, cell);
        const f = forces[i];

        // Add diffusion noise (per-cell-type)
        const diffusion = cellType.diffusion;
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
            const dx = cell.B.x - cell.pos.x;
            const dy = cell.B.y - cell.pos.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < 25 && distSq > 0) {
                const scale = dt * cellType.running_speed / Math.sqrt(distSq);
                cell.B.x += dx * scale;
                cell.B.y += dy * scale;
            }
        } else {
            cell.B.x += (dt * f.fB.x) / mu;
            cell.B.y += (dt * f.fB.y) / mu;
        }
    }
}

/**
 * Perform one full timestep (with substeps).
 */
export function performTimestep(
    state: EHTSimulationState,
    params: EHTParams,
    rng: SeededRandom
): void {
    const effectiveParams = state.params ?? params;
    const pg = effectiveParams.general;
    const fullDt = pg.dt;

    // Process global events (may mutate state.params)
    processGlobalEvents(state, fullDt);

    // Rebuild geometry if global events changed perimeter/aspect_ratio
    rebuildGeometryIfNeeded(state);

    // Update cell phases
    for (const cell of state.cells) {
        const cellType = getCellType(effectiveParams, cell);
        updateCellPhase(cell, cellType, state.t);
    }

    // Process events (division, reset, parameter changes, etc.)
    processAllEvents(state, effectiveParams, fullDt, rng);

    // Update cytoskeleton
    updateCytoskeleton(state, effectiveParams, fullDt);

    // Update apical junctions
    updateApicalJunctions(state, effectiveParams, fullDt);

    // Substep integration
    const substepDt = fullDt / pg.n_substeps;
    const forces: CellForces[] = [];

    for (let step = 0; step < pg.n_substeps; step++) {
        state.t += substepDt;

        // Calculate forces
        calcAllForces(state, effectiveParams, forces);

        // Integrate
        integrateForces(state, effectiveParams, forces, rng, substepDt);

        // Apply constraints
        applyAllConstraints(state, effectiveParams);
    }

    state.step_count++;
}
