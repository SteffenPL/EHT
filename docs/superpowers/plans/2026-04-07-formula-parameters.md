# Formula-Based Parameters — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow any numeric parameter to accept a math.js formula, auto-generating synthetic events at init time that reuse the existing event infrastructure.

**Architecture:** Formula maps (`Record<string, string>`) on params store formulas. At init, these are converted into `GlobalEvent` / `ParameterChangeEvent` objects with `period: 'dt'` and `__formula_` prefixed IDs. Existing event processing handles evaluation. UI adds a toggle per parameter to switch between constant and formula mode.

**Tech Stack:** TypeScript, Vitest, math.js, Zod, React (shadcn/ui)

---

## File Structure

### Types & Schema
- **Modify:** `src/models/eht/params/types.ts` — Add `formulas` fields, `init_value` to events
- **Modify:** `src/models/eht/params/schema.ts` — Zod schemas
- **Modify:** `src/models/eht/params/defaults.ts` — Default empty formulas
- **Modify:** `src/models/eht/params/descriptions.ts` — Descriptions

### Simulation
- **Modify:** `src/models/eht/simulation/init.ts` — Synthetic event generation
- **Modify:** `src/models/eht/simulation/global-events.ts` — `init_value` in scope
- **Modify:** `src/models/eht/simulation/events.ts` — `init_value` + cell variables in scope

### UI
- **Modify:** `src/models/eht/ui/ParametersTab.tsx` — Formula toggle for general params
- **Modify:** `src/models/eht/ui/CellTypesTab.tsx` — Formula toggle for cell type params
- **Modify:** `src/models/eht/ui/CellEventsTab.tsx` — Filter `__formula_` events

### Tests
- **Modify:** `src/models/eht/simulation/global-events.test.ts` — Tests for init_value scope
- **Create:** `src/models/eht/simulation/formula-params.test.ts` — Tests for synthetic event generation

---

## Task 1: Add `formulas` and `init_value` to types and schema

**Files:**
- Modify: `src/models/eht/params/types.ts:75-89,53-59,151-170,110-149`
- Modify: `src/models/eht/params/schema.ts:139-146,57-61,152-170,97-136`
- Modify: `src/models/eht/params/defaults.ts:233-251,124-173,176-225`
- Modify: `src/models/eht/params/descriptions.ts`

- [ ] **Step 1: Add `init_value` to GlobalEvent interface**

In `src/models/eht/params/types.ts`, add to the `GlobalEvent` interface (after line 88, the `formula` field):

```typescript
  /** Initial value captured at init time (available as init_value in formula scope) */
  init_value?: number;
```

- [ ] **Step 2: Add `init_value` to ParameterChangeEvent interface**

In `src/models/eht/params/types.ts`, add to `ParameterChangeEvent` (after line 58, the `formula` field):

```typescript
  /** Initial value captured at init time (available as init_value in formula scope) */
  init_value?: number;
```

- [ ] **Step 3: Add `formulas` to EHTGeneralParams**

In `src/models/eht/params/types.ts`, add to `EHTGeneralParams` (after the `global_events` line):

```typescript
  formulas: Record<string, string>; // Formula overrides for general params (field name → math.js expression)
```

- [ ] **Step 4: Add `formulas` to EHTCellTypeParams**

In `src/models/eht/params/types.ts`, add to `EHTCellTypeParams` (after the `external_force` line):

```typescript
  formulas: Record<string, string>; // Formula overrides for cell type params (field name → math.js expression)
```

- [ ] **Step 5: Add Zod schemas**

In `src/models/eht/params/schema.ts`, add `init_value` to `globalEventSchema` (after `formula`):

```typescript
  init_value: z.number().optional(),
```

Add `init_value` to `parameterChangeEventSchema` (after `formula`):

```typescript
  init_value: z.number().optional(),
```

Add `formulas` to `ehtGeneralParamsSchema` (after `global_events`):

```typescript
  formulas: z.record(z.string()).default({}),
```

Add `formulas` to `ehtCellTypeSchema` (after `external_force`):

```typescript
  formulas: z.record(z.string()).default({}),
```

- [ ] **Step 6: Add defaults**

In `src/models/eht/params/defaults.ts`, add to `DEFAULT_EHT_PARAMS.general` (after `global_events: []`):

```typescript
    formulas: {},
```

Add to `DEFAULT_CONTROL_CELL` (after `external_force: "0"`):

```typescript
  formulas: {},
```

Add to `DEFAULT_EMT_CELL` (after `external_force: "0"`):

```typescript
  formulas: {},
```

- [ ] **Step 7: Add parameter descriptions**

In `src/models/eht/params/descriptions.ts`, add entries:

```typescript
  'general.formulas': 'Formula overrides for general parameters. Keys are field names (e.g., "perimeter"), values are math.js expressions. Available variables: $\\texttt{old\\_value}$ (current value), $\\texttt{init\\_value}$ (initial constant value), $\\texttt{t}$ (time), $\\texttt{dt}$ (timestep).',
  'cell_types.formulas': 'Formula overrides for cell type parameters. Keys are field names (e.g., "R\\_soft"), values are math.js expressions. Available variables: $\\texttt{old\\_value}$, $\\texttt{init\\_value}$, $\\texttt{t}$, $\\texttt{dt}$, $\\texttt{alpha}$ (polar angle), $\\texttt{r}$ (distance from center), $\\texttt{age}$ (cell age), $\\texttt{delta}$ (signed distance from basal curve).',
```

- [ ] **Step 8: Run type check and tests**

Run: `npx tsc --noEmit && npm run test`
Expected: PASS — new fields have defaults.

- [ ] **Step 9: Commit**

```bash
git add src/models/eht/params/types.ts src/models/eht/params/schema.ts src/models/eht/params/defaults.ts src/models/eht/params/descriptions.ts
git commit -m "feat: add formulas maps and init_value to param types

Adds Record<string, string> formulas field to EHTGeneralParams and
EHTCellTypeParams. Adds optional init_value to GlobalEvent and
ParameterChangeEvent for referencing initial constant values."
```

---

## Task 2: Add `init_value` to event evaluation scopes

**Files:**
- Modify: `src/models/eht/simulation/global-events.ts:85-89`
- Modify: `src/models/eht/simulation/events.ts:298-304`
- Modify: `src/models/eht/simulation/global-events.test.ts`

- [ ] **Step 1: Write test for init_value in global event scope**

Add to `src/models/eht/simulation/global-events.test.ts`, in the `processGlobalEvents` describe block:

```typescript
  it('provides init_value variable when present on event', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'with_init',
      start: 0,
      end: 100,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'init_value * 0.5 + t',
      init_value: 200,
    }];
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(200 * 0.5 + 5);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --reporter verbose src/models/eht/simulation/global-events.test.ts`
Expected: FAIL — `init_value` not in scope, math.js error.

- [ ] **Step 3: Add init_value to global event scope**

In `src/models/eht/simulation/global-events.ts`, update the scope building (around line 85):

```typescript
    // Evaluate formula
    const scope: Record<string, number> = {
      old_value: oldValue as number,
      t: state.t,
      dt,
    };
    if (event.init_value !== undefined) {
      scope.init_value = event.init_value;
    }
    const newValue = evaluate(event.formula, scope);
```

- [ ] **Step 4: Add init_value to per-cell event scope**

In `src/models/eht/simulation/events.ts`, in `evaluateFormula` (around line 298), add after the initial scope:

```typescript
    const scope: Record<string, number> = {
      old_value: oldValue,
      t,
      dt,
      period: period || 1,
      age: t - birthTime,
    };
```

The `evaluateFormula` function doesn't currently receive `init_value`. Update its signature to accept it:

Change the function signature from:
```typescript
function evaluateFormula(
  formula: string,
  oldValue: number,
  t: number,
  dt: number,
  period: number,
  birthTime: number,
  generalParams?: import('../params/types').EHTGeneralParams,
  cellTypeParams?: EHTCellTypeParams
): number {
```

To:
```typescript
function evaluateFormula(
  formula: string,
  oldValue: number,
  t: number,
  dt: number,
  period: number,
  birthTime: number,
  generalParams?: import('../params/types').EHTGeneralParams,
  cellTypeParams?: EHTCellTypeParams,
  initValue?: number
): number {
```

And add after the scope creation:

```typescript
    if (initValue !== undefined) {
      scope.init_value = initValue;
    }
```

Then update the call site in `processParameterChangeEvent` to pass `event.init_value`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --reporter verbose src/models/eht/simulation/global-events.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/models/eht/simulation/global-events.ts src/models/eht/simulation/events.ts src/models/eht/simulation/global-events.test.ts
git commit -m "feat: add init_value to event evaluation scopes

Both global and per-cell event formulas can now reference init_value,
the original constant value captured at initialization time."
```

---

## Task 3: Add cell variables to per-cell event scope

**Files:**
- Modify: `src/models/eht/simulation/events.ts:287-327`

- [ ] **Step 1: Add cell variables to evaluateFormula**

In `src/models/eht/simulation/events.ts`, extend the `evaluateFormula` signature to also accept cell-related context:

```typescript
function evaluateFormula(
  formula: string,
  oldValue: number,
  t: number,
  dt: number,
  period: number,
  birthTime: number,
  generalParams?: import('../params/types').EHTGeneralParams,
  cellTypeParams?: EHTCellTypeParams,
  initValue?: number,
  cellContext?: { alpha: number; r: number; delta: number }
): number {
```

After the `init_value` scope addition, add:

```typescript
    if (cellContext) {
      scope.alpha = cellContext.alpha;
      scope.r = cellContext.r;
      scope.delta = cellContext.delta;
    }
```

- [ ] **Step 2: Build cell context at the call site**

In `processParameterChangeEvent`, before calling `evaluateFormula`, compute the cell context using the geometry (similar to how `calcExternalForces` does it in `forces.ts`):

```typescript
    // Compute cell context variables for formula scope
    const center = state.basalGeometry.center;
    const x = cell.pos.x - center.x;
    const y = cell.pos.y - center.y;
    const alpha = Math.atan2(x, -y);
    const r = Math.sqrt(x * x + y * y);

    const posVec = new Vector2(cell.pos.x, cell.pos.y);
    const proj = state.basalGeometry.projectPoint(posVec);
    const nGeom = state.basalGeometry.getNormal(proj);
    const delta = nGeom.x * (cell.pos.x - proj.x) + nGeom.y * (cell.pos.y - proj.y);

    const cellContext = { alpha, r, delta };
```

Add the necessary imports at the top of events.ts:

```typescript
import { Vector2 } from '@/core/math/vector2';
```

Pass `cellContext` to `evaluateFormula`.

- [ ] **Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/models/eht/simulation/events.ts
git commit -m "feat: add cell variables (alpha, r, delta) to per-cell event scope

Per-cell parameter change events can now reference alpha (polar angle),
r (distance from center), and delta (signed distance from basal curve)."
```

---

## Task 4: Implement synthetic event generation at init

**Files:**
- Modify: `src/models/eht/simulation/init.ts:17-212`
- Create: `src/models/eht/simulation/formula-params.test.ts`

- [ ] **Step 1: Write tests for synthetic event generation**

Create `src/models/eht/simulation/formula-params.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateFormulaEvents } from './init';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import type { EHTParams } from '../params/types';

describe('generateFormulaEvents', () => {
  it('does nothing when formulas maps are empty', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    generateFormulaEvents(params);
    expect(params.general.global_events).toHaveLength(0);
  });

  it('generates global event for general formula', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    params.general.formulas = { perimeter: 'init_value - t * 2' };
    generateFormulaEvents(params);

    const generated = params.general.global_events.find(e => e.id === '__formula_perimeter');
    expect(generated).toBeDefined();
    expect(generated!.formula).toBe('init_value - t * 2');
    expect(generated!.init_value).toBe(105); // DEFAULT perimeter value
    expect(generated!.period).toBe('dt');
    expect(generated!.start).toBe(0);
    expect(generated!.end).toBe(Infinity);
    expect(generated!.target_parameter).toBe('general.perimeter');
  });

  it('generates per-cell event for cell type formula', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    params.cell_types.control.formulas = { R_soft: '1.2 + 0.1 * sin(t)' };
    generateFormulaEvents(params);

    const events = params.cell_types.control.events_v2!;
    const generated = events.find(e => e.id === '__formula_R_soft');
    expect(generated).toBeDefined();
    expect(generated!.type).toBe('parameter_change');
    if (generated!.type === 'parameter_change') {
      expect(generated!.formula).toBe('1.2 + 0.1 * sin(t)');
      expect(generated!.init_value).toBe(1.2); // DEFAULT R_soft value
      expect(generated!.target_parameter).toBe('R_soft');
    }
  });

  it('captures correct init_value from current param', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    params.general.perimeter = 200;
    params.general.formulas = { perimeter: 'init_value * 0.5' };
    generateFormulaEvents(params);

    const generated = params.general.global_events.find(e => e.id === '__formula_perimeter');
    expect(generated!.init_value).toBe(200);
  });

  it('generates events for multiple formulas', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    params.general.formulas = {
      perimeter: 'init_value - t',
      aspect_ratio: '1 + 0.1 * t',
    };
    generateFormulaEvents(params);

    expect(params.general.global_events).toHaveLength(2);
    expect(params.general.global_events.find(e => e.id === '__formula_perimeter')).toBeDefined();
    expect(params.general.global_events.find(e => e.id === '__formula_aspect_ratio')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --reporter verbose src/models/eht/simulation/formula-params.test.ts`
Expected: FAIL — `generateFormulaEvents` not exported.

- [ ] **Step 3: Implement generateFormulaEvents**

In `src/models/eht/simulation/init.ts`, add the function and export it. Add after the imports:

```typescript
import { CellCyclePhase } from '../params/types';
import type { GlobalEvent, ParameterChangeEvent } from '../params/types';

/**
 * Scan formula maps on params and generate synthetic events.
 * Global formulas → GlobalEvent with period:'dt' appended to global_events.
 * Per-cell formulas → ParameterChangeEvent with period:'dt' appended to events_v2.
 * Mutates the params object in place.
 */
export function generateFormulaEvents(params: EHTParams): void {
  // Generate global events from general.formulas
  for (const [fieldName, formula] of Object.entries(params.general.formulas)) {
    const initValue = (params.general as Record<string, unknown>)[fieldName];
    if (typeof initValue !== 'number') continue;

    const event: GlobalEvent = {
      id: `__formula_${fieldName}`,
      start: 0,
      end: Infinity,
      period: 'dt',
      target_parameter: `general.${fieldName}`,
      formula,
      init_value: initValue,
    };
    params.general.global_events.push(event);
  }

  // Generate per-cell events from cell_types.*.formulas
  for (const [typeKey, cellType] of Object.entries(params.cell_types)) {
    if (!cellType.formulas || Object.keys(cellType.formulas).length === 0) continue;

    if (!cellType.events_v2) {
      cellType.events_v2 = [];
    }

    for (const [fieldName, formula] of Object.entries(cellType.formulas)) {
      const initValue = (cellType as Record<string, unknown>)[fieldName];
      if (typeof initValue !== 'number') continue;

      const event: ParameterChangeEvent = {
        id: `__formula_${fieldName}`,
        type: 'parameter_change',
        start: 0,
        end: Infinity,
        period: 'dt',
        probability: '1',
        prereq: null,
        cell_cycle_phase: CellCyclePhase.Any,
        target_parameter: fieldName,
        formula,
        init_value: initValue,
      };
      cellType.events_v2.push(event);
    }
  }
}
```

- [ ] **Step 4: Call generateFormulaEvents in initializeEHTSimulation**

In `src/models/eht/simulation/init.ts`, in `initializeEHTSimulation`, add after the `state.params = structuredClone(params)` line:

```typescript
  // Generate synthetic events from formula maps
  generateFormulaEvents(state.params);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --reporter verbose src/models/eht/simulation/formula-params.test.ts`
Expected: All PASS.

- [ ] **Step 6: Run full test suite**

Run: `npm run test`
Expected: No new failures.

- [ ] **Step 7: Commit**

```bash
git add src/models/eht/simulation/init.ts src/models/eht/simulation/formula-params.test.ts
git commit -m "feat: generate synthetic events from formula parameter maps

Scans general.formulas and cell_types.*.formulas at init, creates
GlobalEvent and ParameterChangeEvent objects with period:'dt' and
__formula_ prefixed IDs. Reuses existing event infrastructure."
```

---

## Task 5: Integration test — formula-driven parameter change during simulation

**Files:**
- Modify: `src/models/eht/simulation/formula-params.test.ts`

- [ ] **Step 1: Write integration test**

Add to `src/models/eht/simulation/formula-params.test.ts`:

```typescript
import { performTimestep } from './step';
import { initializeEHTSimulation } from './init';
import { createInitialEHTState } from '../types';
import { SeededRandom } from '@/core/math/random';
import { computeEllipseFromPerimeter } from '../params/geometry';

describe('integration: formula-driven parameters', () => {
  it('perimeter formula updates geometry each timestep', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    params.general.formulas = { perimeter: 'init_value - t * 2' };

    const state = createInitialEHTState();
    const rng = new SeededRandom('test');
    initializeEHTSimulation(params, state, rng);

    const initPerimeter = state.params!.general.perimeter;
    expect(initPerimeter).toBe(105); // Initial value

    // After one timestep (dt=0.1), perimeter should be init_value - t*2
    // t advances by substeps, so check the formula was applied
    performTimestep(state, params, new SeededRandom('step_1'));

    // Perimeter should have changed from the formula
    expect(state.params!.general.perimeter).not.toBe(initPerimeter);

    // Geometry should have been rebuilt
    const expectedGeom = computeEllipseFromPerimeter(
      state.params!.general.perimeter,
      state.params!.general.aspect_ratio
    );
    expect(state.geometry!.curvature_1).toBeCloseTo(expectedGeom.curvature_1, 6);
  });

  it('cell type formula updates per-cell parameter each timestep', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    params.cell_types.control.formulas = { stiffness_nuclei_apical: 'init_value + t' };

    const state = createInitialEHTState();
    const rng = new SeededRandom('test');
    initializeEHTSimulation(params, state, rng);

    const initStiffness = params.cell_types.control.stiffness_nuclei_apical;

    // Run a timestep
    performTimestep(state, params, new SeededRandom('step_1'));

    // At least one control cell should have updated stiffness
    const controlCells = state.cells.filter(c => c.typeIndex === 'control');
    expect(controlCells.length).toBeGreaterThan(0);

    // Stiffness should have increased (init_value + t > init_value since t > 0)
    for (const cell of controlCells) {
      expect(cell.stiffness_nuclei_apical).toBeGreaterThan(initStiffness);
    }
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run --reporter verbose src/models/eht/simulation/formula-params.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/models/eht/simulation/formula-params.test.ts
git commit -m "test: add integration tests for formula-driven parameters

Verifies that general formulas update geometry and cell type formulas
update per-cell parameters through the synthetic event mechanism."
```

---

## Task 6: UI — Formula toggle for general parameters

**Files:**
- Modify: `src/models/eht/ui/ParametersTab.tsx`

- [ ] **Step 1: Add formula toggle helper and FormulaInput component**

In `src/models/eht/ui/ParametersTab.tsx`, add a helper component after the imports:

```typescript
import { Input } from '@/components/ui/input';

/** Toggle button and input for formula mode on a general param */
function GeneralFormulaToggle({
  fieldName,
  numericValue,
  formulas,
  onFormulaChange,
  onFormulaClear,
  disabled,
  description,
  label,
  min,
  max,
  onNumericChange,
}: {
  fieldName: string;
  numericValue: number;
  formulas: Record<string, string>;
  onFormulaChange: (field: string, formula: string) => void;
  onFormulaClear: (field: string) => void;
  disabled?: boolean;
  description?: string;
  label: string;
  min?: number;
  max?: number;
  onNumericChange: (value: number) => void;
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
              className="text-xs px-1.5 py-1 rounded border bg-primary text-primary-foreground hover:bg-primary/90"
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
        className="text-xs px-1.5 py-1 rounded border hover:bg-muted mt-5"
        title="Switch to formula"
      >
        f(x)
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add formula update handlers**

In the main component function, add handlers:

```typescript
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
```

- [ ] **Step 3: Replace NumberInput with GeneralFormulaToggle for geometry params**

Replace the perimeter and aspect_ratio `NumberInput` components with `GeneralFormulaToggle`:

```typescript
<GeneralFormulaToggle
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
<GeneralFormulaToggle
  fieldName="aspect_ratio"
  numericValue={g.aspect_ratio}
  formulas={g.formulas}
  onFormulaChange={updateFormula}
  onFormulaClear={clearFormula}
  onNumericChange={(v) => update('aspect_ratio', v)}
  disabled={disabled}
  label="Aspect Ratio"
  description={desc('aspect_ratio')}
/>
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/eht/ui/ParametersTab.tsx
git commit -m "feat: add formula toggle for general geometry parameters

Perimeter and aspect_ratio inputs can now switch between constant
(NumberInput) and formula (text Input) mode via an f(x) toggle button."
```

---

## Task 7: UI — Formula toggle for cell type parameters

**Files:**
- Modify: `src/models/eht/ui/CellTypesTab.tsx`

- [ ] **Step 1: Add FormulaCell component**

In `src/models/eht/ui/CellTypesTab.tsx`, add a new cell component alongside `NumberCell`:

```typescript
/** Table cell that shows either a number input or formula text input */
function FormulaCell({
  fieldName,
  numericValue,
  formulas,
  onFormulaChange,
  onFormulaClear,
  onNumericChange,
  disabled,
  min,
  max,
}: {
  fieldName: string;
  numericValue: number;
  formulas: Record<string, string>;
  onFormulaChange: (field: string, formula: string) => void;
  onFormulaClear: (field: string) => void;
  onNumericChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  const formula = formulas[fieldName];
  const isFormula = formula !== undefined && formula !== '';

  return (
    <td className="py-1 px-1">
      <div className="flex items-center gap-0.5">
        {isFormula ? (
          <input
            type="text"
            value={formula}
            onChange={(e) => onFormulaChange(fieldName, e.target.value)}
            disabled={disabled}
            className="h-6 text-xs w-20 font-mono border rounded px-1"
            placeholder="formula"
          />
        ) : (
          <NumericTextInput
            value={numericValue}
            onChange={onNumericChange}
            disabled={disabled}
            min={min}
            max={max}
            className="h-6 text-xs w-20"
          />
        )}
        <button
          onClick={() => isFormula
            ? onFormulaClear(fieldName)
            : onFormulaChange(fieldName, String(numericValue))
          }
          disabled={disabled}
          className={`text-[9px] px-0.5 rounded border leading-none h-5 ${isFormula ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          title={isFormula ? 'Switch to constant' : 'Switch to formula'}
        >
          f(x)
        </button>
      </div>
    </td>
  );
}
```

- [ ] **Step 2: Add formula update handlers for cell types**

In the component body, add:

```typescript
  const updateCellFormula = useCallback((typeKey: string, field: string, formula: string) => {
    const newParams = structuredClone(params);
    const ct = newParams.cell_types[typeKey] as EHTCellTypeParams;
    ct.formulas = { ...ct.formulas, [field]: formula };
    onChange(newParams);
  }, [params, onChange]);

  const clearCellFormula = useCallback((typeKey: string, field: string) => {
    const newParams = structuredClone(params);
    const ct = newParams.cell_types[typeKey] as EHTCellTypeParams;
    const { [field]: _, ...rest } = ct.formulas;
    ct.formulas = rest;
    onChange(newParams);
  }, [params, onChange]);
```

- [ ] **Step 3: Use FormulaCell for stiffness and geometry params**

For key numeric parameters that benefit from formulas (e.g., in the stiffness section), replace `NumberCell` with `FormulaCell`. For example, for `R_soft` in the geometry rows:

```typescript
<FormulaCell
  fieldName="R_soft"
  numericValue={ct.R_soft}
  formulas={ct.formulas}
  onFormulaChange={(f, v) => updateCellFormula(key, f, v)}
  onFormulaClear={(f) => clearCellFormula(key, f)}
  onNumericChange={(v) => updateCellType(key, 'R_soft', v)}
  disabled={disabled}
  min={0}
/>
```

Apply this to parameters where time-dependent formulas make sense: `R_soft`, `stiffness_nuclei_apical`, `stiffness_nuclei_basal`, `stiffness_straightness`, `stiffness_apical_apical`, `stiffness_repulsion`, `basal_membrane_repulsion`. Leave simple params like `N_init`, `color`, `location` as-is.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/eht/ui/CellTypesTab.tsx
git commit -m "feat: add formula toggle for cell type parameters

Stiffness and geometry cell type parameters can now switch between
constant and formula mode via an f(x) toggle in the table cells."
```

---

## Task 8: Filter `__formula_` events from CellEventsTab

**Files:**
- Modify: `src/models/eht/ui/CellEventsTab.tsx:276-277`

- [ ] **Step 1: Filter auto-generated events from display**

In `src/models/eht/ui/CellEventsTab.tsx`, modify the `getEvents` helper (line 276):

```typescript
  const getEvents = (cellTypeKey: string): EventDefinition[] =>
    ((params.cell_types[cellTypeKey] as EHTCellTypeParams).events_v2 || [])
      .filter(e => !e.id.startsWith('__formula_'));
```

Also filter the default events display if any global formula events could appear there. In the section where `params.general.default_events` is listed, add similar filtering if needed.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/models/eht/ui/CellEventsTab.tsx
git commit -m "feat: filter auto-generated formula events from event UI

Events with __formula_ prefixed IDs are hidden from the cell events
tab since they are auto-generated from formula parameter maps."
```

---

## Task Summary

| Task | Description | Type |
|------|-------------|------|
| 1 | Add `formulas` and `init_value` to types/schema/defaults | Types |
| 2 | Add `init_value` to event evaluation scopes | Simulation |
| 3 | Add cell variables (alpha, r, delta) to per-cell scope | Simulation |
| 4 | Implement synthetic event generation at init | Simulation |
| 5 | Integration test | Testing |
| 6 | Formula toggle for general params UI | UI |
| 7 | Formula toggle for cell type params UI | UI |
| 8 | Filter `__formula_` events from event tab | UI |
