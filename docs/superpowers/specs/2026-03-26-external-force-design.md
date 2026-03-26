# External Force Feature Design

## Summary

Add a per-cell-type external force `f_ext` to the EHT model, defined by a user-provided math.js formula. The formula operates in polar/Cartesian coordinates relative to the geometry center, with tangent and normal direction vectors available for directional control. Scalar-only formulas are auto-wrapped to produce a tangential flow converging at the bottom of the geometry.

## Motivation

Enable researchers to apply spatially- and temporally-varying external forces to cell nuclei, such as shear flows or radial pressures, without modifying simulation code.

## Coordinate System

Reference point: geometry center (`basalGeometry.center` for circle/ellipse, `(0, 0)` for straight line).

For a cell nucleus at `(px, py)` with geometry center at `(cx, cy)`:

- **Cartesian**: `x = px - cx`, `y = py - cy`
- **Polar**: `r = sqrt(x^2 + y^2)`, `alpha = atan2(x, -y)`
  - `alpha = 0` at bottom (6 o'clock)
  - `alpha = +pi/2` at right (3 o'clock)
  - `alpha = +/-pi` at top (12 o'clock)
  - `alpha = -pi/2` at left (9 o'clock)
- **Tangent** (CCW): `T = (cos(alpha), sin(alpha))`
- **Normal** (outward): `N = (sin(alpha), -cos(alpha))`

These are derived from the polar angle, not the actual curve geometry, for simplicity and predictability.

## Formula Scope Variables

| Variable | Type | Description |
|----------|------|-------------|
| `x` | number | Cartesian x relative to geometry center |
| `y` | number | Cartesian y relative to geometry center |
| `alpha` | number | Polar angle (0 at bottom, +/-pi at top) |
| `r` | number | Polar radius from geometry center |
| `t` | number | Simulation time |
| `T` | matrix | Unit tangent vector (counter-clockwise) |
| `N` | matrix | Unit outward normal vector |

The scope variable list is maintained as a named structure to allow easy extension with additional parameters (e.g., `t_end`, `mu`) in the future.

## Auto-Wrapping Rule

If the formula string does **not** contain `T` or `N` (checked via word-boundary regex `/\bT\b|\bN\b/`), it is treated as a scalar and wrapped as:

```
-(formula) * sign(alpha) * T
```

The negation is needed because `T` points counter-clockwise (increasing alpha), so `-sign(alpha) * T` pushes cells **toward** `alpha = 0`. Without the negation, `sign(alpha) * T` would produce diverging flow.

**Note on `sign(0)`**: At `alpha = 0` (the convergence point), `sign(0) = 0` produces zero force. This is correct — cells at the target need no external push. The force varies continuously through zero at the convergence point.

Examples:
- `"10"` becomes `-(10) * sign(alpha) * T` (magnitude-10 tangential flow toward bottom)
- `"10 * sin(alpha)"` becomes `-(10 * sin(alpha)) * sign(alpha) * T`
- `"5 * T + 3 * N"` stays as-is (already contains vector variables)

## Parameter Definition

### `EHTCellTypeParams`

New field:
```typescript
external_force: string;  // default: "0"
```

### Zod Schema

```typescript
external_force: z.string().default("0")
```

### `types.ts`

Add to `EHTCellTypeParams` interface:
```typescript
external_force: string;
```

### Defaults

All existing cell types default to `"0"` (no external force). The field is optional in TOML — missing means `"0"`.

### TOML Example

```toml
[cell_types.Control]
external_force = "10"

[cell_types.EMT]
external_force = "5 * T + 3 * N"
```

### Parameter Description

Key: `cell_types.external_force`

Description: Formula for external force applied to cell nuclei. Available variables: `x`, `y` (Cartesian from geometry center), `alpha`, `r` (polar coords), `t` (time), `T` (tangent vector, CCW), `N` (outward normal). Scalar formulas are auto-wrapped as `-(scalar) * sign(alpha) * T` to converge at the bottom.

## Force Computation

### New function: `calcExternalForces`

Location: `src/models/eht/simulation/forces.ts`

Signature:
```typescript
function calcExternalForces(
  state: EHTSimulationState,
  params: EHTParams,
  forces: CellForces[]
): void
```

Algorithm per cell:
1. Get cell type; if `external_force === "0"`, skip
2. Compute `x, y` from nucleus position minus geometry center
3. Compute `alpha = atan2(x, -y)`, `r = sqrt(x^2 + y^2)`
4. Compute `T = [cos(alpha), sin(alpha)]`, `N = [sin(alpha), -cos(alpha)]` as math.js matrices
5. Build scope: `{ x, y, alpha, r, t: state.t, T, N }`
6. Determine formula: if original matches `/\bT\b|\bN\b/`, use as-is; else wrap as `-(original) * sign(alpha) * T`
7. Evaluate via `evaluate(formula, scope)` (imported from `mathjs`, matching existing pattern in events.ts)
8. Convert result to `Vector2`: if math.js matrix, extract `[x, y]` via `.toArray()`; if number, treat as zero vector (scalar without direction — shouldn't happen after wrapping, but defensive). If result is neither matrix nor number, apply zero force.
9. Add result to `forces[i].f`

### Edge cases

- **`r = 0`** (nucleus at geometry center): `alpha = atan2(0, 0) = 0` in JavaScript. `T` and `N` are computed from this angle, giving `T = (1, 0)` and `N = (0, -1)`. This is acceptable — the direction is arbitrary but deterministic, and the `sign(0) = 0` in auto-wrapped formulas produces zero force anyway.
- **Straight line geometry**: center is `(0, 0)` (on the membrane). Polar coordinates are relative to the origin, which may not be centered on the tissue. This is a known limitation; for straight geometries, Cartesian coordinates (`x`, `y`) are more natural.

### Error handling

On evaluation error or unexpected result type: log warning, apply zero force (consistent with event formula error handling).

### Integration into `calcAllForces`

Called as the 6th force in the assembly:
```typescript
calcRepulsionForces(state, params, forces);
calcApicalNucleiForces(state, params, forces);
calcBasalNucleiForces(state, params, forces);
calcStraightnessForces(state, params, forces);
calcApicalJunctionForces(state, params, forces);
calcExternalForces(state, params, forces);   // NEW
```

### Geometry center access

- `CircularGeometry` and `EllipticalGeometry` have `.center` property
- `StraightLineGeometry` uses `(0, 0)` as center (consistent with `shapeCenter()`)
- Need to handle center access: use a helper that returns `(geometry as any).center ?? new Vector2(0, 0)` or add a `center` getter to the abstract `BasalGeometry` class

Preferred approach: add an abstract `center` getter to `BasalGeometry`, implemented by each subclass. Non-breaking: `CircularGeometry` and `EllipticalGeometry` already have a `center` field; `StraightLineGeometry` just needs to add it returning `Vector2(0, 0)`.

## UI

Text input field in the cell type parameters panel, alongside stiffness values. Label: "External Force".

Help popover via `descriptions.ts` explaining variables, auto-wrapping, and examples.

## Files to Modify

1. **`src/models/eht/params/types.ts`** — add `external_force: string` to `EHTCellTypeParams`
2. **`src/models/eht/params/schema.ts`** — add `external_force: z.string().default("0")` to cell type schema
3. **`src/models/eht/params/defaults.ts`** — add `external_force: "0"` to default cell types
4. **`src/models/eht/params/descriptions.ts`** — add description for `cell_types.external_force`
5. **`src/models/eht/simulation/forces.ts`** — add `calcExternalForces`, call from `calcAllForces`
6. **`src/core/math/basal-geometry.ts`** — add abstract `center` getter to `BasalGeometry` (return `Vector2(0,0)` for line)
7. **`src/models/eht/ui/`** — add text input for external force in cell type panel (if not auto-generated)
8. **Tests** — add tests for `calcExternalForces`: default "0" produces no force, scalar auto-wrapping, vector formula pass-through, error handling, r=0 edge case

## No Duplication with Events

The event system handles discrete parameter changes at specific trigger times. The external force is a continuous force evaluated every substep during force computation. They share `math.evaluate` from the mathjs library but have entirely different scope variables and execution contexts. No code to share or deduplicate.

## Performance

`evaluate()` per cell per substep. For typical runs (50-100 cells, 1 substep), overhead is negligible. Skip optimization: cells with `external_force === "0"` bypass evaluation entirely. Future optimization path: switch to `math.compile()` caching per formula string (especially relevant for batch simulations running in Web Workers).
