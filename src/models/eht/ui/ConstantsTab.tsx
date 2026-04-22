/**
 * EHT Constants Tab - Named values referenceable in any formula.
 */
import { useState } from 'react';
import type { ModelUITabProps } from '@/core/registry';
import type { EHTParams } from '../params/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const RESERVED_NAMES = new Set([
  't', 'dt', 'old_value', 'init_value', 'period', 'age',
  'x', 'y', 'alpha', 'r', 'T', 'N', 'delta',
  'p_div_out', 'mu', 'h_init', 'w_init', 't_end',
  'step', 'ramp', 'triangle', 'pulse', 'smoothstep',
]);

const NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function EHTConstantsTab({ params, onChange, disabled }: ModelUITabProps<EHTParams>) {
  const constants = params.constants ?? {};
  const entries = Object.entries(constants);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const updateConstant = (name: string, value: number) => {
    const newParams = structuredClone(params);
    newParams.constants = { ...newParams.constants, [name]: value };
    onChange(newParams);
  };

  const removeConstant = (name: string) => {
    const newParams = structuredClone(params);
    const { [name]: _, ...rest } = newParams.constants;
    newParams.constants = rest;
    onChange(newParams);
  };

  const addConstant = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (!NAME_REGEX.test(trimmed)) {
      setNameError('Use letters, numbers, and underscores only');
      return;
    }
    if (RESERVED_NAMES.has(trimmed)) {
      setNameError(`"${trimmed}" is a reserved variable name`);
      return;
    }
    if (trimmed in constants) {
      setNameError(`"${trimmed}" already exists`);
      return;
    }

    const newParams = structuredClone(params);
    newParams.constants = { ...newParams.constants, [trimmed]: 0 };
    onChange(newParams);
    setNewName('');
    setNameError(null);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Define named values that can be used in any formula. Example: set{' '}
        <code className="bg-muted px-1 rounded">heartbeat = 0.5</code>, then use{' '}
        <code className="bg-muted px-1 rounded">triangle(t, heartbeat, 0, 1)</code>{' '}
        in a formula.
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span className="w-28">Value</span>
            <span className="w-8" />
          </div>
          {entries.map(([name, value]) => (
            <div key={name} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
              <Label className="text-sm font-mono truncate">{name}</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) updateConstant(name, v);
                }}
                disabled={disabled}
                className="h-8 w-28 text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeConstant(name)}
                disabled={disabled}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">New constant</Label>
          <Input
            type="text"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setNameError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') addConstant(); }}
            placeholder="name"
            disabled={disabled}
            className="h-8 text-sm font-mono"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addConstant}
          disabled={disabled || !newName.trim()}
          className="h-8"
        >
          + Add
        </Button>
      </div>
      {nameError && (
        <p className="text-xs text-destructive">{nameError}</p>
      )}
    </div>
  );
}
