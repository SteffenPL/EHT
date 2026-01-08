
import type { ModelRenderer } from './renderer';
// We need StatisticDefinition but need to avoid circular deps if possible
// Ideally core/interfaces/model shouldn't depend on registry/types.
// But StatisticDefinition is generic enough.
// Let's assume we can import it, or define it here.
interface StatisticDefinition<State = any> {
    id: string;
    label: string;
    description: string;
    compute: (state: State) => number;
}
interface ParameterGroupDefinition {
    id: string;
    label: string;
    collapsed?: boolean;
    fields: any[]; // Avoid deep dependency for now
}
interface BatchParameterDefinition {
    path: string;
    label: string;
    isInteger?: boolean;
    options?: any[];
}

/**
 * Generic interface for a simulation model.
 * 
 * @template Params The type of the simulation parameters.
 * @template State The type of the simulation state.
 */
export interface SimulationModel<Params = any, State = any> {
    // Metadata
    id: string;
    name: string;
    version: string;
    description?: string;
    displayName?: string; // Optional display name

    // Parameter Management
    defaultParams: Params;
    validateParams(params: unknown): Params;
    paramsSchema?: any; // Zod schema

    // UI Metadata (Optional)
    parameterGroups?: ParameterGroupDefinition[];
    batchParameters?: BatchParameterDefinition[];
    cellTypes?: string[];

    // Simulation Loop
    /**
     * Initialize a new simulation state.
     */
    init(params: Params, seed?: string): State;

    /**
     * Advance the simulation by one time step.
     */
    step(state: State, dt: number, params: Params): State;

    // I/O & Serialization
    /**
     * Convert the state into a flat list of objects suitable for CSV export.
     */
    getSnapshot(state: State): Record<string, any>[];

    /**
     * Reconstruct a state from loaded CSV rows.
     */
    loadSnapshot(rows: Record<string, any>[], params: Params): State;

    // Statistics
    /**
     * Compute instantaneous statistics for the current state.
     */
    computeStats(state: State): Record<string, number>;

    /**
     * Definitions for statistics available in this model.
     */
    statistics?: StatisticDefinition<State>[];

    // Rendering
    renderer: ModelRenderer<Params, State>;

    // Hooks (Optional)
    createCell?: any; // Legacy hook support
    initializeSimulation?: any;
    calcForces?: any;
    applyConstraints?: any;
    processEvents?: any;
    processDivisions?: any;
}
