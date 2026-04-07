# Formula-Based Parameters

## Summary

Allow any numeric parameter to accept a math.js formula instead of a constant value. Formulas are stored in a parallel `formulas` map on params, and at init time are converted into synthetic events that evaluate every timestep. This reuses the existing event infrastructure with zero new simulation code paths.

## Architecture

### Formula Maps on Params

A `formulas: Record<string, string>` field is added to both `EHTGeneralParams` and `EHTCellTypeParams`. Keys are field names (e.g., `"perimeter"`, `"R_soft"`), values are math.js expressions.

```typescript
// EHTGeneralParams
formulas: Record<string, string>;  // e.g. { "perimeter": "init_value - t * 2" }

// EHTCellTypeParams
formulas: Record<string, string>;  // e.g. { "R_soft": "1.2 + 0.1 * sin(t)" }
```

- Default: `{}` (empty — all params are constants)
- Zod: `z.record(z.string()).default({})`
- TOML: serializes as `[general.formulas]` / `[cell_types.control.formulas]`
- Backward compatible: old configs without formulas get empty maps

### Synthetic Event Generation at Init

During `initializeEHTSimulation`, after existing setup, scan formula maps and generate events into `state.params` (the mutable sim-local copy):

**Global formulas** generate `GlobalEvent` objects appended to `state.params.general.global_events`:

```typescript
{
  id: '__formula_perimeter',
  start: 0,
  end: Infinity,
  period: 'dt',
  target_parameter: 'general.perimeter',
  formula: 'init_value - t * 2',
  init_value: 105,  // captured from params.general.perimeter at init
}
```

**Per-cell formulas** generate `ParameterChangeEvent` objects appended to `state.params.cell_types.*.events_v2`:

```typescript
{
  id: '__formula_R_soft',
  type: 'parameter_change',
  start: 0,
  end: Infinity,
  period: 'dt',
  probability: '1',
  prereq: null,
  cell_cycle_phase: CellCyclePhase.Any,
  target_parameter: 'R_soft',
  formula: '1.2 + 0.1 * sin(t)',
  init_value: 1.2,  // captured from cell_types.control.R_soft at init
}
```

The `__formula_` prefix identifies auto-generated events. Since generation happens on `state.params`, the original user params are untouched. Generated events process through the existing `processGlobalEvents` and `processAllEvents` pipelines with no changes to event processing logic beyond scope extensions.

### Variable Scope

**`init_value`**: A new optional field on `GlobalEvent` and `ParameterChangeEvent`. When present, included in the evaluation scope. Holds the original numeric value from params at init time — constant throughout the simulation.

**`old_value`**: The current value of the parameter, read fresh each evaluation. Updates as the formula writes new values.

**Global formula variables:** `old_value`, `init_value`, `t`, `dt`

**Per-cell formula variables:** `old_value`, `init_value`, `t`, `dt`, `period`, plus cell-specific:
- `alpha` — polar angle from geometry center
- `r` — distance from geometry center
- `age` — cell age (`t - birth_time`)
- `delta` — signed distance from basal curve

Cell variables match those already available in the `external_force` system.

### UI Changes

**Formula toggle:** A small `f(x)` icon button next to each numeric input:
- **Constant mode** (default): Shows the normal `NumberInput`. Clicking the toggle creates a `formulas[fieldName]` entry pre-populated with the current numeric value as a string, switches to formula mode.
- **Formula mode**: Shows a text `Input` with the formula string. Clicking the toggle removes the `formulas[fieldName]` entry, restores the numeric value, switches back to constant mode.

**Event list filtering:** The `CellEventsTab` filters out events with IDs prefixed by `__formula_` so auto-generated events don't clutter the user's event list.

---

## Files Changed

### Modified
- `src/models/eht/params/types.ts` — Add `formulas` to `EHTGeneralParams` and `EHTCellTypeParams`, add optional `init_value` to `GlobalEvent` and `ParameterChangeEvent`
- `src/models/eht/params/schema.ts` — Zod schemas for formula maps and `init_value`
- `src/models/eht/params/defaults.ts` — Default empty `formulas: {}`
- `src/models/eht/params/descriptions.ts` — Descriptions for formula fields
- `src/models/eht/simulation/init.ts` — Generate synthetic events from formula maps at init
- `src/models/eht/simulation/global-events.ts` — Include `init_value` in evaluation scope
- `src/models/eht/simulation/events.ts` — Include `init_value` and cell variables in `ParameterChangeEvent` scope
- `src/models/eht/ui/ParametersTab.tsx` — Formula toggle for general params
- `src/models/eht/ui/CellTypesTab.tsx` — Formula toggle for cell type params
- `src/models/eht/ui/CellEventsTab.tsx` — Filter out `__formula_` events from display

### Unchanged
- `src/models/eht/simulation/step.ts` — No changes, events already processed
- `src/models/eht/simulation/rebuild-geometry.ts` — No changes, geometry rebuild triggers from curvature drift as before

## Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Storage | Parallel `formulas` map | Keeps numeric types intact, no schema rework, backward compatible |
| Implementation | Synthetic events at init | Reuses existing event infrastructure, zero new simulation code paths |
| Event ID prefix | `__formula_` | Simple identification of auto-generated events, filterable in UI |
| Variables | `init_value` + `old_value` | `old_value` updates each eval, `init_value` is constant reference to starting value |
| Per-cell variables | alpha, r, age, delta | Matches external_force variable set, enables spatially varying params |
| UI | Toggle button per param | Minimal change, most params stay as number inputs by default |
| Scope | Both global and cell type params | Maximum flexibility with uniform mechanism |
