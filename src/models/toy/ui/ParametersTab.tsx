/**
 * Toy Parameters Tab - General model parameters.
 */
import type { ModelUITabProps } from '@/core/registry';
import type { ToyParams, BoundaryType } from '../params/types';
import { NumberInput, IntegerInput, ComboBox } from '@/components/params/inputs';
import { Label } from '@/components/ui/label';

const BOUNDARY_OPTIONS = [
  { value: 'periodic', label: 'Periodic' },
  { value: 'box', label: 'Box' },
  { value: 'none', label: 'None' },
];

export function ToyParametersTab({ params, onChange, disabled }: ModelUITabProps<ToyParams>) {
  const update = <K extends keyof ToyParams['general']>(key: K, value: ToyParams['general'][K]) => {
    const newParams = structuredClone(params);
    newParams.general[key] = value;
    onChange(newParams);
  };

  const updateDomainSize = (index: 0 | 1, value: number) => {
    const newParams = structuredClone(params);
    newParams.general.domain_size[index] = value;
    onChange(newParams);
  };

  const g = params.general;

  return (
    <div className="space-y-6">
      {/* Cell Population */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Cell Population</Label>
        <div className="space-y-2 pl-2">
          <IntegerInput label="Number of Cells" value={g.N} onChange={(v) => update('N', v)} disabled={disabled} min={1} />
          <NumberInput label="Soft Radius" value={g.soft_radius} onChange={(v) => update('soft_radius', v)} disabled={disabled} step={0.5} min={0} />
          <NumberInput label="Repulsion" value={g.repulsion_strength} onChange={(v) => update('repulsion_strength', v)} disabled={disabled} step={1} min={0} />
        </div>
      </div>

      {/* Movement */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Movement</Label>
        <div className="space-y-2 pl-2">
          <NumberInput label="Running Speed" value={g.running_speed} onChange={(v) => update('running_speed', v)} disabled={disabled} step={0.1} min={0} />
          <NumberInput label="Tumble Speed" value={g.tumble_speed} onChange={(v) => update('tumble_speed', v)} disabled={disabled} step={0.1} min={0} />
          <NumberInput label="Run Duration" value={g.running_duration} onChange={(v) => update('running_duration', v)} disabled={disabled} step={0.5} min={0} />
          <NumberInput label="Tumble Duration" value={g.tumbling_duration} onChange={(v) => update('tumbling_duration', v)} disabled={disabled} step={0.5} min={0} />
          <NumberInput label="Tumble Period" value={g.tumbling_period} onChange={(v) => update('tumbling_period', v)} disabled={disabled} step={0.1} min={0} />
        </div>
      </div>

      {/* Domain */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Domain</Label>
        <div className="space-y-2 pl-2">
          <ComboBox
            label="Boundary Type"
            value={g.boundary_type}
            options={BOUNDARY_OPTIONS}
            onChange={(v) => update('boundary_type', v as BoundaryType)}
            disabled={disabled}
          />
          <NumberInput label="Domain Width" value={g.domain_size[0]} onChange={(v) => updateDomainSize(0, v)} disabled={disabled} step={10} min={1} />
          <NumberInput label="Domain Height" value={g.domain_size[1]} onChange={(v) => updateDomainSize(1, v)} disabled={disabled} step={10} min={1} />
        </div>
      </div>

      {/* Physics */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Physics</Label>
        <div className="space-y-2 pl-2">
          <NumberInput label="Friction (mu)" value={g.mu} onChange={(v) => update('mu', v)} disabled={disabled} step={0.1} min={0} />
        </div>
      </div>

      {/* General */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">General</Label>
        <div className="space-y-2 pl-2">
          <NumberInput label="End Time" value={g.t_end} onChange={(v) => update('t_end', v)} disabled={disabled} step={1} min={0} />
          <IntegerInput label="Random Seed" value={g.random_seed} onChange={(v) => update('random_seed', v)} disabled={disabled} />
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
