/**
 * List of parameter ranges for batch sweeps.
 */
import { Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { ParameterRange } from '@/core/batch';
import type { SimulationParams } from '@/core/types';

export interface ParameterRangeListProps {
  ranges: ParameterRange[];
  onChange: (ranges: ParameterRange[]) => void;
  baseParams: SimulationParams;
  disabled?: boolean;
}

/** Get a nested value from params using dot notation path */
function getNestedValue(obj: unknown, path: string): number | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'number' ? current : undefined;
}

/** Available parameters for batch sweeps */
const AVAILABLE_PARAMS: Array<{ path: string; label: string; isInteger?: boolean }> = [
  { path: 'general.N_emt', label: 'N_emt (EMT cell count)', isInteger: true },
  { path: 'general.N_init', label: 'N_init (Initial cells)', isInteger: true },
  { path: 'general.curvature', label: 'Curvature' },
  { path: 'general.random_seed', label: 'Random seed', isInteger: true },
  { path: 'cell_prop.R_hard', label: 'R_hard (Hard radius)' },
  { path: 'cell_prop.R_soft', label: 'R_soft (Soft radius)' },
  { path: 'cell_prop.repulsion_stiffness', label: 'Repulsion stiffness' },
  { path: 'cell_types.emt.k_A', label: 'EMT k_A (Apical spring)' },
  { path: 'cell_types.emt.k_B', label: 'EMT k_B (Basal spring)' },
  { path: 'cell_types.emt.k_AA', label: 'EMT k_AA (Apical-apical)' },
  { path: 'cell_types.emt.k_S', label: 'EMT k_S (Straightness)' },
  { path: 'cell_types.emt.running_speed', label: 'EMT Running speed' },
  { path: 'cell_types.emt.emt_time_A.min', label: 'EMT time_A min' },
  { path: 'cell_types.emt.emt_time_A.max', label: 'EMT time_A max' },
  { path: 'cell_types.emt.emt_time_B.min', label: 'EMT time_B min' },
  { path: 'cell_types.emt.emt_time_B.max', label: 'EMT time_B max' },
  { path: 'cell_types.control.k_A', label: 'Control k_A' },
  { path: 'cell_types.control.k_B', label: 'Control k_B' },
];

export function ParameterRangeList({ ranges, onChange, baseParams, disabled }: ParameterRangeListProps) {
  const usedPaths = new Set(ranges.map((r) => r.path));
  const availableParams = AVAILABLE_PARAMS.filter((p) => !usedPaths.has(p.path));

  const handleAdd = (path: string) => {
    const baseValue = getNestedValue(baseParams, path) ?? 0;
    onChange([...ranges, { path, min: baseValue, max: baseValue, steps: 3 }]);
  };

  const handleRemove = (index: number) => {
    onChange(ranges.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof ParameterRange, value: string | number) => {
    const updated = [...ranges];
    if (field === 'path') {
      updated[index] = { ...updated[index], [field]: value as string };
    } else {
      updated[index] = { ...updated[index], [field]: Number(value) };
    }
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Parameter Ranges</Label>
        <Select onValueChange={handleAdd} disabled={disabled || availableParams.length === 0}>
          <SelectTrigger className="w-[200px] h-8">
            <Plus className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Add parameter" />
          </SelectTrigger>
          <SelectContent>
            {availableParams.map((p) => (
              <SelectItem key={p.path} value={p.path}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ranges.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No parameter ranges defined. Add parameters to sweep.
        </p>
      ) : (
        <div className="space-y-2">
          {ranges.map((range, index) => {
            const paramInfo = AVAILABLE_PARAMS.find((p) => p.path === range.path);
            const baseValue = getNestedValue(baseParams, range.path);
            const isInteger = paramInfo?.isInteger ?? false;
            const valueStep = isInteger ? 1 : 0.01;
            return (
              <div
                key={range.path}
                className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"
              >
                <span className="text-sm font-medium flex-1 truncate" title={range.path}>
                  {paramInfo?.label ?? range.path}
                </span>
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">Base:</Label>
                  <span className="w-16 h-7 text-xs flex items-center justify-center bg-muted rounded border text-muted-foreground">
                    {baseValue ?? '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">Min:</Label>
                  <Input
                    type="number"
                    value={range.min}
                    onChange={(e) => handleUpdate(index, 'min', e.target.value)}
                    disabled={disabled}
                    className="w-16 h-7 text-xs"
                    step={valueStep}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">Max:</Label>
                  <Input
                    type="number"
                    value={range.max}
                    onChange={(e) => handleUpdate(index, 'max', e.target.value)}
                    disabled={disabled}
                    className="w-16 h-7 text-xs"
                    step={valueStep}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">Steps:</Label>
                  <Input
                    type="number"
                    value={range.steps}
                    onChange={(e) => handleUpdate(index, 'steps', e.target.value)}
                    disabled={disabled}
                    className="w-14 h-7 text-xs"
                    min={1}
                    step={1}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
