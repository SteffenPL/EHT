import { useEffect, useRef } from 'react';
import { useControls, folder, LevaPanel, useCreateStore } from 'leva';
import { cloneDeep, isEqual } from 'lodash-es';
import type { SimulationParams } from '@/core/types';
import { useTheme } from '@/contexts';

export interface LevaParameterPanelProps {
    params: SimulationParams;
    onChange: (params: SimulationParams) => void;
}

export function LevaParameterPanel({ params, onChange }: LevaParameterPanelProps) {
    const store = useCreateStore();
    const { isDark } = useTheme();

    // Track if the update is coming from Leva (internal) or Parent (external)
    // to avoid infinite loops or overwriting fresh user input with old props.
    const isInternalUpdate = useRef(false);

    // -------------------------------------------------------------------------
    // 1. General Parameters
    // -------------------------------------------------------------------------
    const [generalValues, setGeneral] = useControls(
        'General',
        () => ({
            t_end: { value: params.general.t_end, min: 0, max: 200, step: 1, label: 'End Time' },
            dt: { value: params.general.dt, min: 0.01, max: 1.0, step: 0.01, label: 'Time Step' },
            random_seed: { value: params.general.random_seed, step: 1, label: 'Random Seed' },
            full_circle: { value: params.general.full_circle, label: 'Full Circle' },
            N_init: { value: params.general.N_init, min: 1, max: 200, step: 1, label: 'Initial Cells' },
            N_max: { value: params.general.N_max, min: 1, max: 500, step: 1, label: 'Max Cells' },
            N_emt: { value: params.general.N_emt, min: 0, max: 50, step: 1, label: 'EMT Cells' },
            w_init: { value: params.general.w_init, min: 10, max: 500, label: 'Initial Width' },
            h_init: { value: params.general.h_init, min: 1, max: 100, label: 'Initial Height' },
            mu: { value: params.general.mu, min: 0, max: 1, step: 0.01, label: 'Friction' },
            n_substeps: { value: params.general.n_substeps, min: 1, max: 100, step: 1, label: 'Substeps' },
            alg_dt: { value: params.general.alg_dt, min: 0.001, max: 0.1, step: 0.001, label: 'Algo Time Step' },
            w_screen: { value: params.general.w_screen, min: 100, max: 2000, label: 'Screen Width' },
            h_screen: { value: params.general.h_screen, min: 100, max: 2000, label: 'Screen Height' },
            p_div_out: { value: params.general.p_div_out, min: 0, max: 1, label: 'Division Prob.' },
            curvature_1: { value: params.general.curvature_1, min: 0, max: 1, step: 0.001, label: 'Curvature 1' },
            curvature_2: { value: params.general.curvature_2, min: 0, max: 1, step: 0.001, label: 'Curvature 2' },
        }),
        { store }
    );

    // -------------------------------------------------------------------------
    // 2. Cell Properties (Shared)
    // -------------------------------------------------------------------------
    const [cellPropValues, setCellProp] = useControls(
        'Cell Properties',
        () => ({
            apical_junction_init: { value: params.cell_prop.apical_junction_init, min: 0, max: 5, label: 'Apical Junc Init' },
            max_basal_junction_dist: { value: params.cell_prop.max_basal_junction_dist, min: 0, max: 10, label: 'Max Basal Dist' },
            basal_daming_ratio: { value: params.cell_prop.basal_daming_ratio, min: 0, max: 5, label: 'Basal Damping' },
            basal_membrane_repulsion: { value: params.cell_prop.basal_membrane_repulsion, min: 0, max: 10, label: 'Basal Repulsion' },
            cytos_init: { value: params.cell_prop.cytos_init, min: 0, max: 5, label: 'Cytos Init' },
            diffusion: { value: params.cell_prop.diffusion, min: 0, max: 2, step: 0.01, label: 'Diffusion' },
        }),
        { store, collapsed: true }
    );

    // -------------------------------------------------------------------------
    // 3. Control Cells
    // -------------------------------------------------------------------------
    const [controlValues, setControl] = useControls(
        'Control Cells',
        () => createCellTypeSchema(params.cell_types.control),
        { store }
    );

    // -------------------------------------------------------------------------
    // 4. EMT Cells
    // -------------------------------------------------------------------------
    const [emtValues, setEmt] = useControls(
        'EMT Cells',
        () => createCellTypeSchema(params.cell_types.emt, true),
        { store }
    );

    function createCellTypeSchema(cellParams: any, isEmt = false) {
        return {
            R_hard: { value: cellParams.R_hard, min: 0.1, max: 5, label: 'R Hard' },
            R_soft: { value: cellParams.R_soft, min: 0.1, max: 5, label: 'R Soft' },
            color: { value: cellParams.color, label: 'Color' },
            k_apical_junction: { value: cellParams.k_apical_junction, min: 0, max: 20, label: 'k Apical' },
            k_cytos: { value: cellParams.k_cytos, min: 0, max: 20, label: 'k Cytos' },
            stiffness_apical_apical: { value: cellParams.stiffness_apical_apical, min: 0, max: 20, label: 'Stiff AA' },
            stiffness_nuclei_apical: { value: cellParams.stiffness_nuclei_apical, min: 0, max: 20, label: 'Stiff NA' },
            stiffness_nuclei_basal: { value: cellParams.stiffness_nuclei_basal, min: 0, max: 20, label: 'Stiff NB' },
            stiffness_repulsion: { value: cellParams.stiffness_repulsion, min: 0, max: 20, label: 'Stiff Repulsion' },
            stiffness_straightness: { value: cellParams.stiffness_straightness, min: 0, max: 20, label: 'Stiff Straight' },

            // Flattened ranges
            lifespan_min: { value: cellParams.lifespan.min, min: 0, max: 100, label: 'Lifespan Min' },
            lifespan_max: { value: cellParams.lifespan.max, min: 0, max: 100, label: 'Lifespan Max' },

            // EMT specific events
            ...(isEmt ? {
                'EMT Events': folder({
                    time_A_min: { value: cellParams.events.time_A.min, min: 0, max: 100, label: 'Time A Min' },
                    time_A_max: { value: cellParams.events.time_A.max, min: 0, max: 100, label: 'Time A Max' },
                    time_B_min: { value: cellParams.events.time_B.min, min: 0, max: 100, label: 'Time B Min' },
                    time_B_max: { value: cellParams.events.time_B.max, min: 0, max: 100, label: 'Time B Max' },
                    time_S_min: { value: cellParams.events.time_S.min, min: 0, max: 100, label: 'Time S Min' },
                    time_S_max: { value: cellParams.events.time_S.max, min: 0, max: 100, label: 'Time S Max' },
                    time_P_min: { value: cellParams.events.time_P.min, min: 0, max: 100, label: 'Time P Min' },
                    time_P_max: { value: cellParams.events.time_P.max, min: 0, max: 100, label: 'Time P Max' },
                })
            } : {})
        };
    }

    // -------------------------------------------------------------------------
    // Sync: Params -> Leva (External Input)
    // -------------------------------------------------------------------------
    // We use a ref to store the 'current' params as known by Leva to avoid loops
    const externalParamsRef = useRef(params);

    useEffect(() => {
        // If params changed externally (not by us), update Leva
        if (!isEqual(params, externalParamsRef.current)) {
            isInternalUpdate.current = false;

            setGeneral({ ...params.general });
            setCellProp({ ...params.cell_prop });

            // Control
            setControl({
                R_hard: params.cell_types.control.R_hard,
                R_soft: params.cell_types.control.R_soft,
                color: params.cell_types.control.color,
                k_apical_junction: params.cell_types.control.k_apical_junction,
                k_cytos: params.cell_types.control.k_cytos,
                stiffness_apical_apical: params.cell_types.control.stiffness_apical_apical,
                stiffness_nuclei_apical: params.cell_types.control.stiffness_nuclei_apical,
                stiffness_nuclei_basal: params.cell_types.control.stiffness_nuclei_basal,
                stiffness_repulsion: params.cell_types.control.stiffness_repulsion,
                stiffness_straightness: params.cell_types.control.stiffness_straightness,
                lifespan_min: params.cell_types.control.lifespan.min,
                lifespan_max: params.cell_types.control.lifespan.max,
            });

            // EMT
            setEmt({
                R_hard: params.cell_types.emt.R_hard,
                R_soft: params.cell_types.emt.R_soft,
                color: params.cell_types.emt.color,
                k_apical_junction: params.cell_types.emt.k_apical_junction,
                k_cytos: params.cell_types.emt.k_cytos,
                stiffness_apical_apical: params.cell_types.emt.stiffness_apical_apical,
                stiffness_nuclei_apical: params.cell_types.emt.stiffness_nuclei_apical,
                stiffness_nuclei_basal: params.cell_types.emt.stiffness_nuclei_basal,
                stiffness_repulsion: params.cell_types.emt.stiffness_repulsion,
                stiffness_straightness: params.cell_types.emt.stiffness_straightness,
                lifespan_min: params.cell_types.emt.lifespan.min,
                lifespan_max: params.cell_types.emt.lifespan.max,
                time_A_min: params.cell_types.emt.events.time_A.min,
                time_A_max: params.cell_types.emt.events.time_A.max,
                time_B_min: params.cell_types.emt.events.time_B.min,
                time_B_max: params.cell_types.emt.events.time_B.max,
                time_S_min: params.cell_types.emt.events.time_S.min,
                time_S_max: params.cell_types.emt.events.time_S.max,
                time_P_min: params.cell_types.emt.events.time_P.min,
                time_P_max: params.cell_types.emt.events.time_P.max,
            });

            externalParamsRef.current = params;
            // Re-enable internal updates after this cycle
            setTimeout(() => { isInternalUpdate.current = true; }, 0);
        }
    }, [params, setGeneral, setCellProp, setControl, setEmt]);


    // -------------------------------------------------------------------------
    // Sync: Leva -> Params (Internal Output)
    // -------------------------------------------------------------------------
    useEffect(() => {
        // Only trigger if this is an internal update (user interaction)
        // However, checking isInternalUpdate.current is tricky because useControls fires on mount too.
        // For now, let's just construct the new params and check equality before calling onChange.

        const newParams = cloneDeep(params);

        // 1. General
        Object.assign(newParams.general, generalValues);

        // 2. Cell Prop
        Object.assign(newParams.cell_prop, cellPropValues);

        // 3. Control
        const c = newParams.cell_types.control;
        Object.assign(c, controlValues);
        // Reconstruct lifespan
        c.lifespan = { min: (controlValues as any).lifespan_min, max: (controlValues as any).lifespan_max };
        // Cleanup flattened keys if needed (cloneDeep handles it effectively if we overwrite)

        // 4. EMT
        const e = newParams.cell_types.emt;
        Object.assign(e, emtValues);
        e.lifespan = { min: (emtValues as any).lifespan_min, max: (emtValues as any).lifespan_max };

        // Reconstruct events
        e.events.time_A = { min: (emtValues as any).time_A_min, max: (emtValues as any).time_A_max };
        e.events.time_B = { min: (emtValues as any).time_B_min, max: (emtValues as any).time_B_max };
        e.events.time_S = { min: (emtValues as any).time_S_min, max: (emtValues as any).time_S_max };
        e.events.time_P = { min: (emtValues as any).time_P_min, max: (emtValues as any).time_P_max };

        if (!isEqual(newParams, externalParamsRef.current)) {
            externalParamsRef.current = newParams; // Update our ref so we don't trigger the reverse sync
            onChange(newParams);
        }

    }, [generalValues, cellPropValues, controlValues, emtValues, onChange]);

    // Define colors for light/dark mode using CSS variables
    // Leva accepts valid CSS color strings, so we can use hsl(var(...))
    const themeParams = isDark ? {
        colors: {
            elevation1: 'hsl(var(--card))',
            elevation2: 'hsl(var(--secondary))',
            elevation3: 'hsl(var(--muted))',
            accent1: 'hsl(var(--primary))',
            accent2: 'hsl(var(--primary))',
            accent3: 'hsl(var(--ring))',
            highlight1: 'hsl(var(--muted))',
            highlight2: 'hsl(var(--muted-foreground))',
            highlight3: 'hsl(var(--primary))',
            vivid1: 'hsl(var(--warn))',
            folderWidgetColor: 'hsl(var(--muted-foreground))',
            folderTextColor: 'hsl(var(--foreground))',
            toolTipBackground: 'hsl(var(--popover))',
            toolTipText: 'hsl(var(--popover-foreground))',
        }
    } : {
        colors: {
            elevation1: 'hsl(var(--card))',
            elevation2: 'hsl(var(--secondary))',
            elevation3: 'hsl(var(--muted))',
            accent1: 'hsl(var(--primary))',
            accent2: 'hsl(var(--primary))',
            accent3: 'hsl(var(--ring))',
            highlight1: 'hsl(var(--secondary))',
            highlight2: 'hsl(var(--muted-foreground))',
            highlight3: 'hsl(var(--primary))',
            vivid1: 'hsl(var(--warn))',
            folderWidgetColor: 'hsl(var(--muted-foreground))',
            folderTextColor: 'hsl(var(--foreground))',
            toolTipBackground: 'hsl(var(--popover))',
            toolTipText: 'hsl(var(--popover-foreground))',
        }
    };

    return (
        <div className="relative w-full h-full min-h-[500px] overflow-y-auto custom-scrollbar" style={{ zIndex: 0 }}>
            <LevaPanel
                fill
                flat
                store={store}
                titleBar={false}
                theme={themeParams}
            />
        </div>
    );
}
