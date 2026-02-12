/**
 * EHT Parameters Tab - General model parameters.
 */
import type { ModelUITabProps } from '@/core/registry';
import type { EHTParams } from '../params/types';
import { NumberInput, IntegerInput, BoolInput } from '@/components/params/inputs';
import { Label } from '@/components/ui/label';
import { getParameterDescription } from '../params/descriptions';

export function EHTParametersTab({ params, onChange, disabled }: ModelUITabProps<EHTParams>) {
  const update = <K extends keyof EHTParams['general']>(key: K, value: EHTParams['general'][K]) => {
    const newParams = structuredClone(params);
    newParams.general[key] = value;
    onChange(newParams);
  };

  const g = params.general;

  // Helper to get description for a general parameter
  const desc = (key: string) => getParameterDescription(`general.${key}`);

  return (
    <div className="space-y-6">
      {/* General Parameters */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">General</Label>
        <div className="space-y-2 pl-2">
          <NumberInput label="End Time (h)" value={g.t_end} onChange={(v) => update('t_end', v)} disabled={disabled} min={0} description={desc('t_end')} />
          <IntegerInput label="Random Seed" value={g.random_seed} onChange={(v) => update('random_seed', v)} disabled={disabled} description={desc('random_seed')} />
          <NumberInput label="Out-of-plane Division Prob." value={g.p_div_out} onChange={(v) => update('p_div_out', v)} disabled={disabled} min={0} max={1} description={desc('p_div_out')} />
        </div>
      </div>

      {/* Geometry */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Geometry</Label>
        <div className="space-y-2 pl-2">
          <BoolInput label="Full Circle" value={g.full_circle} onChange={(v) => update('full_circle', v)} disabled={disabled} description={desc('full_circle')} />
          <NumberInput label="Initial Width" value={g.w_init} onChange={(v) => update('w_init', v)} disabled={disabled} min={0} description={desc('w_init')} />
          <NumberInput label="Initial Height" value={g.h_init} onChange={(v) => update('h_init', v)} disabled={disabled} min={0} description={desc('h_init')} />
          <NumberInput label="Perimeter" value={g.perimeter} onChange={(v) => update('perimeter', v)} disabled={disabled} min={1} description={desc('perimeter')} />
          <NumberInput label="Aspect (0=line, b/a)" value={g.aspect_ratio} onChange={(v) => update('aspect_ratio', v)} disabled={disabled} description={desc('aspect_ratio')} />
        </div>
      </div>

      {/* Model Parameters */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Model Parameters</Label>
        <div className="space-y-2 pl-2">
          <BoolInput label="Hard Sphere Nuclei" value={g.hard_sphere_nuclei} onChange={(v) => update('hard_sphere_nuclei', v)} disabled={disabled} description={desc('hard_sphere_nuclei')} />
          <NumberInput label="Friction (mu)" value={g.mu} onChange={(v) => update('mu', v)} disabled={disabled} min={0} description={desc('mu')} />
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
