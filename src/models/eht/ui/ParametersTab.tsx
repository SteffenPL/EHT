/**
 * EHT Parameters Tab - General model parameters.
 */
import { cloneDeep } from 'lodash-es';
import type { ModelUITabProps } from '@/core/registry';
import type { EHTParams } from '../params/types';
import { NumberInput, IntegerInput, BoolInput } from '@/components/params/inputs';
import { Label } from '@/components/ui/label';

export function EHTParametersTab({ params, onChange, disabled }: ModelUITabProps<EHTParams>) {
  const update = <K extends keyof EHTParams['general']>(key: K, value: EHTParams['general'][K]) => {
    const newParams = cloneDeep(params);
    newParams.general[key] = value;
    onChange(newParams);
  };

  const updateCellProp = <K extends keyof EHTParams['cell_prop']>(key: K, value: EHTParams['cell_prop'][K]) => {
    const newParams = cloneDeep(params);
    newParams.cell_prop[key] = value;
    onChange(newParams);
  };

  const g = params.general;
  const cp = params.cell_prop;

  return (
    <div className="space-y-6">
      {/* General Parameters */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">General</Label>
        <div className="space-y-2 pl-2">
          <NumberInput label="End Time (h)" value={g.t_end} onChange={(v) => update('t_end', v)} disabled={disabled} step={1} min={0} />
          <IntegerInput label="Random Seed" value={g.random_seed} onChange={(v) => update('random_seed', v)} disabled={disabled} />
        </div>
      </div>

      {/* Geometry */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Geometry</Label>
        <div className="space-y-2 pl-2">
          <BoolInput label="Full Circle" value={g.full_circle} onChange={(v) => update('full_circle', v)} disabled={disabled} />
          <NumberInput label="Initial Width" value={g.w_init} onChange={(v) => update('w_init', v)} disabled={disabled} step={1} min={0} />
          <NumberInput label="Initial Height" value={g.h_init} onChange={(v) => update('h_init', v)} disabled={disabled} step={0.1} min={0} />
          <NumberInput label="Perimeter" value={g.perimeter} onChange={(v) => update('perimeter', v)} disabled={disabled} step={1} min={1} />
          <NumberInput label="Aspect (0=line, b/a)" value={g.aspect_ratio} onChange={(v) => update('aspect_ratio', v)} disabled={disabled} step={0.1} />
        </div>
      </div>

      {/* Physics */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Physics</Label>
        <div className="space-y-2 pl-2">
          <NumberInput label="Friction (mu)" value={g.mu} onChange={(v) => update('mu', v)} disabled={disabled} step={0.01} min={0} />
          <NumberInput label="Division Prob." value={g.p_div_out} onChange={(v) => update('p_div_out', v)} disabled={disabled} step={0.01} min={0} max={1} />
        </div>
      </div>

      {/* Cell Properties */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Cell Properties</Label>
        <div className="space-y-2 pl-2">
          <NumberInput label="Apical Junc Init" value={cp.apical_junction_init} onChange={(v) => updateCellProp('apical_junction_init', v)} disabled={disabled} step={0.1} />
          <NumberInput label="Max Basal Dist" value={cp.max_basal_junction_dist} onChange={(v) => updateCellProp('max_basal_junction_dist', v)} disabled={disabled} step={0.1} min={0} />
          <NumberInput label="Basal Damping" value={cp.basal_daming_ratio} onChange={(v) => updateCellProp('basal_daming_ratio', v)} disabled={disabled} step={0.1} min={0} />
          <NumberInput label="Basal Repulsion" value={cp.basal_membrane_repulsion} onChange={(v) => updateCellProp('basal_membrane_repulsion', v)} disabled={disabled} step={0.1} min={0} />
          <NumberInput label="Cytos Init" value={cp.cytos_init} onChange={(v) => updateCellProp('cytos_init', v)} disabled={disabled} step={0.1} />
          <NumberInput label="Diffusion" value={cp.diffusion} onChange={(v) => updateCellProp('diffusion', v)} disabled={disabled} step={0.01} min={0} />
        </div>
      </div>

      {/* Display */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Display</Label>
        <div className="space-y-2 pl-2">
          <IntegerInput label="Screen Width" value={g.w_screen} onChange={(v) => update('w_screen', v)} disabled={disabled} min={10} />
          <IntegerInput label="Screen Height" value={g.h_screen} onChange={(v) => update('h_screen', v)} disabled={disabled} min={10} />
        </div>
      </div>
    </div>
  );
}
