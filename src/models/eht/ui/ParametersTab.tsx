/**
 * EHT Parameters Tab - General model parameters.
 */
import { useCallback } from 'react';
import type { ModelUITabProps } from '@/core/registry';
import type { EHTParams } from '../params/types';
import { NumberInput, IntegerInput, BoolInput } from '@/components/params/inputs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getParameterDescription } from '../params/descriptions';

/** Input that shows either a NumberInput or formula text input with f(x) toggle */
function FormulaNumberInput({
  fieldName,
  numericValue,
  formulas,
  onFormulaChange,
  onFormulaClear,
  onNumericChange,
  disabled,
  label,
  min,
  max,
  description,
}: {
  fieldName: string;
  numericValue: number;
  formulas: Record<string, string>;
  onFormulaChange: (field: string, formula: string) => void;
  onFormulaClear: (field: string) => void;
  onNumericChange: (value: number) => void;
  disabled?: boolean;
  label: string;
  min?: number;
  max?: number;
  description?: string;
}) {
  const formula = formulas[fieldName];
  const isFormula = formula !== undefined && formula !== '';

  if (isFormula) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <label className="text-sm font-medium">{label}</label>
          <div className="flex items-center gap-1">
            <Input
              type="text"
              value={formula}
              onChange={(e) => onFormulaChange(fieldName, e.target.value)}
              disabled={disabled}
              className="h-8 text-xs font-mono"
              placeholder="math.js formula"
            />
            <button
              onClick={() => onFormulaClear(fieldName)}
              disabled={disabled}
              className="text-xs px-1.5 py-1 rounded border bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              title="Switch to constant value"
            >
              f(x)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">
        <NumberInput
          label={label}
          value={numericValue}
          onChange={onNumericChange}
          disabled={disabled}
          min={min}
          max={max}
          description={description}
        />
      </div>
      <button
        onClick={() => onFormulaChange(fieldName, String(numericValue))}
        disabled={disabled}
        className="text-xs px-1.5 py-1 rounded border hover:bg-muted mt-5 disabled:opacity-50"
        title="Switch to formula"
      >
        f(x)
      </button>
    </div>
  );
}

export function EHTParametersTab({ params, onChange, disabled }: ModelUITabProps<EHTParams>) {
  const update = <K extends keyof EHTParams['general']>(key: K, value: EHTParams['general'][K]) => {
    const newParams = structuredClone(params);
    newParams.general[key] = value;
    onChange(newParams);
  };

  const g = params.general;

  const desc = (key: string) => getParameterDescription(`general.${key}`);

  const updateFormula = useCallback((field: string, formula: string) => {
    const newParams = structuredClone(params);
    newParams.general.formulas = { ...newParams.general.formulas, [field]: formula };
    onChange(newParams);
  }, [params, onChange]);

  const clearFormula = useCallback((field: string) => {
    const newParams = structuredClone(params);
    const { [field]: _, ...rest } = newParams.general.formulas;
    newParams.general.formulas = rest;
    onChange(newParams);
  }, [params, onChange]);

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
          <FormulaNumberInput
            fieldName="perimeter"
            numericValue={g.perimeter}
            formulas={g.formulas}
            onFormulaChange={updateFormula}
            onFormulaClear={clearFormula}
            onNumericChange={(v) => update('perimeter', v)}
            disabled={disabled}
            min={1}
            label="Perimeter"
            description={desc('perimeter')}
          />
          <FormulaNumberInput
            fieldName="aspect_ratio"
            numericValue={g.aspect_ratio}
            formulas={g.formulas}
            onFormulaChange={updateFormula}
            onFormulaClear={clearFormula}
            onNumericChange={(v) => update('aspect_ratio', v)}
            disabled={disabled}
            label="Aspect (0=line, b/a)"
            description={desc('aspect_ratio')}
          />
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
