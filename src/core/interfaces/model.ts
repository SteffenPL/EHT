import type { ComponentType } from 'react';
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
interface BatchParameterDefinition {
    path: string;
    label: string;
    isInteger?: boolean;
    options?: any[];
}

/**
 * Props passed to model-specific UI tab components.
 */
export interface ModelUITabProps<Params = any> {
    params: Params;
    onChange: (params: Params) => void;
    disabled?: boolean;
}

/**
 * Props for warning banner component.
 */
export interface ModelWarningProps<Params = any> {
    params: Params;
    onChange?: (params: Params) => void;
    disabled?: boolean;
}

/**
 * Model-specific UI components for parameter editing.
 * Each model can provide its own React components for the parameter panel tabs.
 */
export interface ModelUI<Params = any> {
    /** Warning banner - shown above the tabs, always visible */
    WarningBanner?: ComponentType<ModelWarningProps<Params>>;
    /** Parameters tab - general model parameters (T_end, N_init, etc.) */
    ParametersTab?: ComponentType<ModelUITabProps<Params>>;
    /** Cell Types tab - table with rows per parameter, columns per cell type */
    CellTypesTab?: ComponentType<ModelUITabProps<Params>>;
    /** Simulation tab - algorithmic parameters (dt, substeps, etc.) */
    SimulationTab?: ComponentType<ModelUITabProps<Params>>;
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

    // Batch parameters for parameter sweeps
    batchParameters?: BatchParameterDefinition[];
    /** Generate batch parameters dynamically from current params */
    generateBatchParameters?: (params: Params) => BatchParameterDefinition[];

    // Model-specific UI components
    ui?: ModelUI<Params>;

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
     * @param state The simulation state
     * @param params Optional parameters (some models need params for group-based statistics)
     */
    computeStats(state: State, params?: Params): Record<string, number>;

    /**
     * Definitions for statistics available in this model.
     */
    statistics?: StatisticDefinition<State>[];
    /** Generate statistics dynamically from current params (e.g., for different cell types) */
    generateStatistics?: (params: Params) => StatisticDefinition<State>[];

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
