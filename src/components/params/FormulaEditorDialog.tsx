/**
 * Formula Editor Dialog - Rich popup for editing math.js formulas.
 * Features: live graph preview, text editor, preset shapes with forms, variables reference.
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { evaluate } from 'mathjs';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
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
                Insert at cursor
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

      {FORMULA_PRESETS.length > 0 && (
        <>
          <div className="border-t my-1" />
          <Label className="text-xs font-medium text-muted-foreground">Functions</Label>
          <div className="space-y-0.5">
            {FORMULA_PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                className="w-full text-left px-2 py-0.5 text-xs hover:bg-muted rounded"
                onClick={() => onInsert(p.generate(p.params.map(pp => pp.defaultValue)))}
              >
                <code className="font-mono text-muted-foreground">
                  {p.name.toLowerCase().replace(/ /g, '')}(...)
                </code>
              </button>
            ))}
          </div>
        </>
      )}
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
      <DialogContent className={`${context === 'external_force' ? 'max-w-5xl' : 'max-w-3xl'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>Formula Editor: {label}</DialogTitle>
          <DialogDescription>
            {context === 'external_force'
              ? 'Edit an external force formula. Scalars are converted into tangential flow; vector formulas can use T and N directly.'
              : 'Edit the formula for this parameter. Use presets or type math.js expressions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Graph preview */}
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

          {/* Formula input */}
          <div>
            <Input
              ref={inputRef}
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Enter math.js formula..."
              className="font-mono text-sm h-9"
              autoFocus
            />
            {formulaError && (
              <p className="text-xs text-destructive mt-1">{formulaError}</p>
            )}
          </div>

          {/* Presets + Variables side by side — presets get more room for form fields */}
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <PresetPanel onInsert={insertAtCursor} />
            <div className="w-48">
              <VariablesPanel
                context={context}
                constants={constants}
                onInsert={insertAtCursor}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { onClear(); onOpenChange(false); }}
          >
            Clear Formula
          </Button>
          <div className="flex-1" />
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
