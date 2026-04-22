# Formula Assistant: Constants, Helper Functions & Formula Editor Popup

**Date**: 2026-04-22
**Status**: Draft

## Problem

The EHT simulator's formula feature is hard to use for biologists:

1. **Raw math.js expressions are intimidating** — writing `2 * abs(2 * (t / 0.5 - floor(t / 0.5 + 0.5))) * 3 + 1` requires calculus fluency
2. **No shared parameters** — if 5 formulas reference a heartbeat period of 0.5, changing it requires editing all 5
3. **No visual feedback** — users can't see what their formula produces without running the simulation
4. **No discovery** — users must know math.js syntax; there's no way to browse available building blocks

## Solution Overview

Three additions that work together:

1. **Constants Tab** — flat key-value named constants, referenceable in any formula
2. **Named Helper Functions** — readable function calls (`triangle`, `step`, `ramp`, etc.) registered in math.js
3. **Formula Editor Popup** — replaces inline editing with a rich dialog: live graph, text editor, form-based presets, and a variables reference panel

## 1. Constants Tab

### Data Model

New top-level field on `EHTParams`:

```typescript
interface EHTParams extends BaseSimulationParams {
  metadata: ParamsMetadata;
  general: EHTGeneralParams;
  cell_prop: EHTCellPropertyParams;
  cell_types: EHTCellTypesMap;
  constants: Record<string, number>;  // NEW
}
```

Top-level (not inside `general`) because constants are cross-cutting — referenced by general formulas, cell-type formulas, and external force formulas.

### Schema

```typescript
constants: z.record(z.string(), z.number()).default({})
```

No migration needed — Zod `.default({})` handles missing field from older configs.

### TOML Serialization

```toml
[constants]
heartbeat = 0.5
shrink_rate = 2.0
```

### Tab Placement

New top-level tab in `ModelParameterPanel`, positioned second:

**Parameters | Constants | Cell Types | Cell Events | Simulation**

### UI

Simple editable table:

| Name | Value | |
|------|-------|-|
| `heartbeat` | `0.5` | [x] |
| `shrink_rate` | `2.0` | [x] |
| [+ Add constant] | | |

- Text input for name, number input for value, delete button per row
- Name validation: alphanumeric + underscore, no spaces, no collision with built-in variables (`t`, `dt`, `old_value`, `init_value`)
- Help text at top: *"Define named values that can be used in any formula. Example: set `heartbeat = 0.5`, then use `triangle(t, heartbeat, 1, 0, 1)` in a formula."*

### Evaluation Integration

All formula evaluation scopes get constants spread in:

```typescript
const scope = { old_value, t, dt, init_value, ...params.constants };
```

Applies to all 5 evaluation sites: `global-events.ts`, `events.ts`, `forces.ts`, `cell.ts`, `init.ts`.

## 2. Named Helper Functions

### Function Library

| Function | Signature | Description |
|----------|-----------|-------------|
| `step` | `step(t, t_switch, v_before, v_after)` | Jump from `v_before` to `v_after` at `t_switch` |
| `ramp` | `ramp(t, t_start, t_end, v_start, v_end)` | Linear interpolation, clamped outside range |
| `triangle` | `triangle(t, period, v_min, v_max)` | Periodic triangle wave between `v_min` and `v_max` (amplitude = `(v_max - v_min) / 2`) |
| `pulse` | `pulse(t, t_start, t_end, v_off, v_on)` | `v_on` between `t_start`–`t_end`, `v_off` otherwise |
| `smoothstep` | `smoothstep(t, t_start, t_end, v_start, v_end)` | Like `ramp` but with Hermite easing |

### Implementation

Single module: `src/models/eht/simulation/formula-functions.ts`

- Each function is a plain TypeScript function
- Exports a `formulaFunctions` record
- All evaluation sites spread both constants and functions: `{ ...params.constants, ...formulaFunctions, old_value, t, dt }`

### Composability

Functions return numbers and compose naturally:

```
triangle(t, heartbeat, 0, 1) + step(t, 5, 0, 0.3)
ramp(t, 0, 10, 1, smoothstep(t, 5, 8, 0.5, 1.5))
```

### Extensibility

Adding new functions = adding an entry to the record. No changes to evaluation pipeline.

## 3. Formula Editor Popup

### Trigger

Clicking the f(x) button on any formula-enabled field opens a modal dialog. Replaces the current inline toggle behavior. When no formula exists yet, the current numeric value is pre-filled.

### Layout

```
┌─ Formula Editor: Perimeter ─────────────────────────────┐
│                                                          │
│  ┌─ Graph Preview ────────────────────────────────────┐  │
│  │                                                    │  │
│  │   [Plot of formula value over t in [0, t_end]]     │  │
│  │   X-axis: time (h), Y-axis: value                 │  │
│  │   Updates live as formula text changes             │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Formula ──────────────────────────────────────────┐  │
│  │  triangle(t, heartbeat, 1, 50, 100)     [cursor]  │  │
│  └────────────────────────────────────────────────────┘  │
│  Error: (shown in red only if formula is invalid)        │
│                                                          │
│  ┌─ Presets ──────────────┐ ┌─ Variables ─────────────┐  │
│  │ > Step                 │ │  t         current time  │  │
│  │ > Ramp                 │ │  dt        time step     │  │
│  │ > Triangle Wave        │ │  old_value previous val  │  │
│  │ > Pulse                │ │  init_value initial val  │  │
│  │ > Smooth Step          │ │  -- Constants ---------- │  │
│  │                        │ │  heartbeat  0.5          │  │
│  │ (clicking expands a    │ │  shrink_rate 2.0         │  │
│  │  form with labeled     │ │                          │  │
│  │  fields + "Insert"     │ │  (click to insert name   │  │
│  │  button)               │ │   at cursor)             │  │
│  └────────────────────────┘ └──────────────────────────┘  │
│                                                          │
│                          [Clear Formula]  [Cancel] [OK]  │
└──────────────────────────────────────────────────────────┘
```

### Graph Preview

- Lightweight SVG or canvas rendering (no heavy chart library)
- Evaluates formula at ~200 sample points from 0 to `t_end`
- For evaluation, `old_value` and `init_value` are set to the current numeric value of the parameter (since they can't be simulated in preview)
- Live update with ~200ms debounce after typing stops
- If formula is invalid: shows last valid plot grayed out with error message below the formula input

### Formula Text Area

- Monospace, single-line input
- Cursor position tracked for preset/variable insertion

### Presets Panel

Clicking a preset expands an inline form:

```
v Triangle Wave
  Period:    [0.5    ]
  Min value: [0      ]
  Max value: [1      ]
  [Insert at cursor]
```

- Each preset has: name, parameter labels, default values, generator function
- "Insert at cursor" generates the function call string and inserts at the cursor position in the formula text
- The graph updates immediately to reflect the insertion

### Variables Panel

- Lists built-in variables with short descriptions: `t` (current time), `dt` (time step), `old_value` (previous value), `init_value` (value at t=0)
- Lists all user-defined constants with current values
- Clicking any variable/constant name inserts it at cursor in the formula text
- Context-sensitive: external force formulas additionally show `x`, `y`, `alpha`, `r`, `T`, `N`, `delta`

### Buttons

- **OK**: saves formula, closes dialog
- **Cancel**: discards changes, closes dialog
- **Clear Formula**: removes formula, reverts parameter to numeric mode, closes dialog

## 4. Inline Field Changes

When a formula is set, the inline field becomes a read-only preview:

```
Without formula:        With formula:
[  105       ] [f(x)]  [ triangle(t, hb, 1, 50..) ] [f(x)]
  (editable number)       (read-only, truncated, monospace)
```

- f(x) button always opens the `FormulaEditorDialog`
- When no formula: popup opens with current numeric value pre-filled
- When formula exists: inline field shows truncated read-only preview, tooltip shows full formula
- Number input hidden while formula is active (same as today)

## File Changes

### Modified Files

| File | Change |
|------|--------|
| `src/models/eht/params/types.ts` | Add `constants: Record<string, number>` to `EHTParams` |
| `src/models/eht/params/schema.ts` | Add `constants` Zod schema with `.default({})` |
| `src/models/eht/params/defaults.ts` | Add `constants: {}` to defaults |
| `src/models/eht/ui/ParametersTab.tsx` | `FormulaNumberInput` opens popup instead of inline toggle, read-only preview |
| `src/models/eht/ui/CellTypesTab.tsx` | `FormulaCell` opens popup instead of inline toggle, read-only preview |
| `src/models/eht/index.ts` | Register `ConstantsTab` in model UI |
| `src/components/params/ModelParameterPanel.tsx` | Add Constants tab between Parameters and Cell Types |
| `src/models/eht/simulation/global-events.ts` | Spread constants + formulaFunctions into scope |
| `src/models/eht/simulation/events.ts` | Spread constants + formulaFunctions into scope |
| `src/models/eht/simulation/forces.ts` | Spread constants + formulaFunctions into scope |
| `src/models/eht/simulation/cell.ts` | Spread constants + formulaFunctions into scope |
| `src/models/eht/simulation/init.ts` | Spread constants + formulaFunctions into scope |
| `src/models/eht/params/descriptions.ts` | Add descriptions for constants and helper functions |

### New Files

| File | Purpose |
|------|---------|
| `src/models/eht/simulation/formula-functions.ts` | `step`, `ramp`, `triangle`, `pulse`, `smoothstep` + `formulaFunctions` export |
| `src/components/params/FormulaEditorDialog.tsx` | Shared popup: graph, text editor, presets, variables |
| `src/models/eht/ui/ConstantsTab.tsx` | Constants table UI |
| `src/models/eht/params/formula-presets.ts` | Preset definitions (name, param labels, defaults, generator) |

## Design Decisions

1. **Constants are flat key-value, not grouped or formula-capable** — simplest mental model for biologists. If grouping is needed later, it's additive.
2. **Helper functions are positional args, not named** — math.js doesn't support keyword arguments. The preset form provides labeled discovery; the formula text stays concise.
3. **Popup replaces inline editing** — single interaction pattern (f(x) always opens popup). Simpler than two-step toggle+expand. Read-only inline preview still shows what's set.
4. **Preset insertion at cursor** — more flexible than replace. Users can compose `triangle(...) + step(...)`. Graph always previews the full formula.
5. **Graph uses simple SVG/canvas** — no chart library dependency. 200 sample points is sufficient for preview; the evaluation is fast since it's just math.js calls.
6. **Constants at top level of EHTParams** — not inside `general`, because they're referenced across general, cell-type, and force formulas.
7. **Context-sensitive variables panel** — external force formulas show position variables (`x`, `y`, etc.) that don't apply to parameter formulas. The popup receives a `context` prop to determine which variables to display.
