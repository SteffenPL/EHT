/**
 * EHT Simulation Tab - Algorithmic parameters (dt, substeps, etc.)
 */
import type { ModelUITabProps } from '@/core/registry';
import type { EHTParams } from '../params/types';
import { NumberInput, IntegerInput } from '@/components/params/inputs';
import { Label } from '@/components/ui/label';

export function EHTSimulationTab({ params, onChange, disabled }: ModelUITabProps<EHTParams>) {
  const update = <K extends keyof EHTParams['general']>(key: K, value: EHTParams['general'][K]) => {
    const newParams = structuredClone(params);
    newParams.general[key] = value;
    onChange(newParams);
  };

  const g = params.general;

  return (
    <div className="space-y-6">
      {/* Time Stepping */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Time Stepping</Label>
        <div className="space-y-2 pl-2">
          <NumberInput
            label="Time Step (dt)"
            value={g.dt}
            onChange={(v) => update('dt', v)}
            disabled={disabled}
            step={0.01}
            min={0.001}
          />
          <NumberInput
            label="Algo Time Step"
            value={g.alg_dt}
            onChange={(v) => update('alg_dt', v)}
            disabled={disabled}
            step={0.001}
            min={0.0001}
          />
          <IntegerInput
            label="Substeps"
            value={g.n_substeps}
            onChange={(v) => update('n_substeps', v)}
            disabled={disabled}
            min={1}
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
        <p className="font-medium mb-1">Notes:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong>dt</strong>: Output time step (visualization/export interval)</li>
          <li><strong>alg_dt</strong>: Internal algorithm time step for physics</li>
          <li><strong>n_substeps</strong>: Number of physics steps per output step</li>
          <li>Effective physics dt = alg_dt, run n_substeps times per dt</li>
        </ul>
      </div>
    </div>
  );
}
