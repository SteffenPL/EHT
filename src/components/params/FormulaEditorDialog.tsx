/**
 * Formula Editor Dialog - Rich popup for editing math.js formulas.
 * Features: live graph preview, text editor, preset shapes with forms, variables reference.
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { evaluate } from 'mathjs';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBasalGeometry } from '@/core/math/basal-geometry';
import { Vector2 } from '@/core/math/vector2';
import { FORMULA_PRESETS, type FormulaPreset } from '@/models/eht/params/formula-presets';
import { computeEllipseFromPerimeter } from '@/models/eht/params/geometry';
import { formulaFunctions } from '@/models/eht/simulation/formula-functions';
import { evaluateExternalForceAtPosition } from '@/models/eht/simulation/external-force-formula';
import { FormulaSpatialExplainer } from './FormulaSpatialExplainer';
import { variablesForContext } from './formulaVariables';

export type FormulaContext = 'general' | 'cell_type' | 'external_force';

interface FormulaEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldName: string;
  label: string;
  formula: string;
  currentNumericValue: number;
  tEnd: number;
  constants: Record<string, number>;
  context: FormulaContext;
  initialPerimeter?: number;
  initialAspectRatio?: number;
  onSave: (formula: string) => void;
  onClear: () => void;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function GraphPreview({
  formula, tEnd, numericValue, constants,
}: {
  formula: string;
  tEnd: number;
  numericValue: number;
  constants: Record<string, number>;
}) {
  const debouncedFormula = useDebounced(formula, 200);

  const { data, error } = useMemo(() => {
    if (!debouncedFormula.trim()) return { data: null, error: null };

    const nSamples = 200;
    const points: { t: number; value: number }[] = [];

    for (let i = 0; i <= nSamples; i++) {
      const t = (i / nSamples) * tEnd;
      try {
        const scope: Record<string, unknown> = {
          t, dt: tEnd / nSamples,
          old_value: numericValue, init_value: numericValue,
          age: t,
          alpha: 0,
          r: 1,
          delta: 0,
          p_div_out: 1,
          mu: 0.2,
          h_init: 5,
          w_init: 80,
          t_end: tEnd,
          R_hard_div: numericValue,
          stiffness_apical_apical_div: numericValue,
          INM: 0,
          ...constants, ...formulaFunctions,
        };
        const result = evaluate(debouncedFormula, scope);
        if (typeof result === 'number' && isFinite(result)) {
          points.push({ t: Math.round(t * 1000) / 1000, value: result });
        } else {
          return { data: null, error: 'Formula must return a finite number' };
        }
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : String(e) };
      }
    }

    return { data: points, error: null };
  }, [debouncedFormula, tEnd, numericValue, constants]);

  if (error || !data) {
    return (
      <div className="w-full h-[200px] border rounded bg-muted/30 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">
          {error ? 'Invalid formula' : 'Enter a formula to see preview'}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-[200px] border rounded bg-background">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 15, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="t"
            type="number"
            domain={[0, tEnd]}
            tickCount={6}
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            label={{ value: 'time (h)', position: 'insideBottom', offset: 0, fontSize: 10 }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            width={45}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0)
                ? v.toExponential(1)
                : v.toPrecision(3)
            }
          />
          <Tooltip
            labelFormatter={(t) => `t = ${Number(t).toFixed(2)} h`}
            formatter={(v) => [Number(v).toPrecision(4), 'value']}
            contentStyle={{ fontSize: 11 }}
          />
          <Line
            type="linear"
            dataKey="value"
            dot={false}
            strokeWidth={2}
            className="stroke-primary"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PresetPanel({
  onInsert,
}: {
  onInsert: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, number[]>>({});

  const getValues = (preset: FormulaPreset): number[] =>
    paramValues[preset.name] ?? preset.params.map(p => p.defaultValue);

  const setValues = (presetName: string, values: number[]) => {
    setParamValues(prev => ({ ...prev, [presetName]: values }));
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">Presets</Label>
      {FORMULA_PRESETS.map(preset => (
        <div key={preset.name} className="border rounded">
          <button
            type="button"
            className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted flex items-center gap-1"
            onClick={() => setExpanded(expanded === preset.name ? null : preset.name)}
          >
            <span className="text-xs text-muted-foreground">
              {expanded === preset.name ? '▼' : '▶'}
            </span>
            <span>{preset.name}</span>
          </button>
          {expanded === preset.name && (
            <div className="px-2 pb-2 space-y-1.5">
              <p className="text-xs text-muted-foreground">{preset.description}</p>
              <code className="block rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {preset.signature}
              </code>
              {preset.params.map((param, idx) => {
                const values = getValues(preset);
                return (
                  <div key={param.label} className="flex items-center gap-2">
                    <Label className="text-xs w-24 shrink-0">{param.label}</Label>
                    <Input
                      type="number"
                      value={values[idx]}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) {
                          const newValues = [...values];
                          newValues[idx] = v;
                          setValues(preset.name, newValues);
                        }
                      }}
                      className="h-7 text-xs w-20"
                    />
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={() => onInsert(preset.generate(getValues(preset)))}
              >
                Insert explicit formula
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VariablesPanel({
  context,
  constants,
  onInsert,
}: {
  context: FormulaContext;
  constants: Record<string, number>;
  onInsert: (text: string) => void;
}) {
  const variables = variablesForContext(context);
  const constantEntries = Object.entries(constants);

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">Variables</Label>
      <div className="space-y-1">
        {variables.map(v => (
          <button
            key={v.name}
            type="button"
            className="w-full rounded border bg-background px-2 py-1.5 text-left text-xs hover:bg-muted"
            onClick={() => onInsert(v.insertText ?? v.name)}
          >
            <span className="flex items-center justify-between gap-2">
              <code className="font-mono">{v.name}</code>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                {v.kind}
              </span>
            </span>
            <span className="mt-1 block text-muted-foreground">{v.description}</span>
            {v.definition && (
              <span className="mt-1 block font-mono text-[10px] text-muted-foreground">{v.definition}</span>
            )}
          </button>
        ))}
      </div>

      {constantEntries.length > 0 && (
        <>
          <div className="border-t my-1" />
          <Label className="text-xs font-medium text-muted-foreground">Constants</Label>
          <div className="space-y-0.5">
            {constantEntries.map(([name, value]) => (
              <button
                key={name}
                type="button"
                className="w-full text-left px-2 py-0.5 text-xs hover:bg-muted rounded flex justify-between gap-2"
                onClick={() => onInsert(name)}
              >
                <code className="font-mono">{name}</code>
                <span className="text-muted-foreground">{value}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FunctionsPanel({
  onInsert,
}: {
  onInsert: (text: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">Functions</Label>
      <div className="space-y-0.5">
        {FORMULA_PRESETS.map(p => (
          <button
            key={p.name}
            type="button"
            className="w-full text-left px-2 py-1 text-xs hover:bg-muted rounded"
            onClick={() => onInsert(p.generate(p.params.map(pp => pp.defaultValue)))}
          >
            <code className="font-mono text-muted-foreground">
              {p.signature}
            </code>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FormulaEditorDialog({
  open, onOpenChange, fieldName: _fieldName, label,
  formula: initialFormula, currentNumericValue, tEnd,
  constants, context, initialPerimeter, initialAspectRatio, onSave, onClear,
}: FormulaEditorDialogProps) {
  const [formula, setFormula] = useState(initialFormula);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setFormula(initialFormula || String(currentNumericValue));
    }
  }, [open, initialFormula, currentNumericValue]);

  const insertAtCursor = useCallback((text: string) => {
    const input = inputRef.current;
    if (!input) {
      setFormula(prev => prev + text);
      return;
    }
    const start = input.selectionStart ?? formula.length;
    const end = input.selectionEnd ?? formula.length;
    const newFormula = formula.slice(0, start) + text + formula.slice(end);
    setFormula(newFormula);
    requestAnimationFrame(() => {
      input.focus();
      const cursorPos = start + text.length;
      input.setSelectionRange(cursorPos, cursorPos);
    });
  }, [formula]);

  const formulaError = useMemo(() => {
    if (!formula.trim()) return null;
    try {
      if (context === 'external_force') {
        const { curvature_1, curvature_2 } = computeEllipseFromPerimeter(
          initialPerimeter ?? 105,
          initialAspectRatio ?? 1
        );
        evaluateExternalForceAtPosition({
          formula,
          position: new Vector2(18, -22),
          basalGeometry: createBasalGeometry(curvature_1, curvature_2, 360),
          t: 0,
          constants,
        });
        return null;
      }

      const scope: Record<string, unknown> = {
        t: 0, dt: 0.1,
        old_value: currentNumericValue, init_value: currentNumericValue,
        age: 0,
        p_div_out: 1,
        mu: 0.2,
        h_init: 5,
        w_init: 80,
        t_end: tEnd,
        R_hard_div: currentNumericValue,
        stiffness_apical_apical_div: currentNumericValue,
        INM: 0,
        ...constants, ...formulaFunctions,
      };
      evaluate(formula, scope);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, [formula, context, currentNumericValue, constants, tEnd, initialPerimeter, initialAspectRatio]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1180px,calc(100vw-2rem))] max-w-none max-h-[92vh] gap-0 overflow-hidden p-0">
        <div className="flex max-h-[92vh] min-h-0 flex-col">
          <div className="flex flex-col gap-3 border-b bg-background px-4 py-3 pr-14 sm:flex-row sm:items-start sm:justify-between">
            <DialogHeader className="min-w-0">
              <DialogTitle>Formula Editor: {label}</DialogTitle>
              <DialogDescription>
                {context === 'external_force'
                  ? 'Edit an external force formula. Scalars are converted into tangential flow; vector formulas can use T and N directly.'
                  : 'Edit the formula for this parameter. Use presets or type math.js expressions.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { onClear(); onOpenChange(false); }}
              >
                Clear formula
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => { onSave(formula); onOpenChange(false); }}
                disabled={!!formulaError}
              >
                OK
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Formula</Label>
                <Input
                  ref={inputRef}
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="Enter formula, for example triangle(t, period=10, min=1, max=2)"
                  className="h-10 font-mono text-sm"
                  autoFocus
                />
                {formulaError && (
                  <p className="mt-1 text-xs text-destructive">{formulaError}</p>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <main className="min-w-0 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {context === 'external_force' ? 'Spatial preview' : 'Graph preview'}
                    </Label>
                    {context === 'external_force' ? (
                      <FormulaSpatialExplainer
                        compact
                        formula={formula}
                        constants={constants}
                        initialPerimeter={initialPerimeter}
                        initialAspectRatio={initialAspectRatio}
                      />
                    ) : (
                      <GraphPreview
                        formula={formula}
                        tEnd={tEnd}
                        numericValue={currentNumericValue}
                        constants={constants}
                      />
                    )}
                  </div>

                  <VariablesPanel
                    context={context}
                    constants={constants}
                    onInsert={insertAtCursor}
                  />
                </main>

                <aside className="min-w-0 space-y-4">
                  <PresetPanel onInsert={insertAtCursor} />
                  <FunctionsPanel onInsert={insertAtCursor} />
                </aside>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
