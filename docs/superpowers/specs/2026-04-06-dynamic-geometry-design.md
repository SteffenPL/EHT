# Dynamic Geometry Parameter Updates

## Summary

Enable mid-simulation geometry changes (perimeter, aspect ratio) triggered by a global event pipeline. Implemented in two phases: a coordinate system refactor followed by the dynamic update mechanism.

## Phase 1: Center-at-Origin Refactor (prerequisite)

Move the coordinate system so `(0, 0)` is always the geometry center.

**Current behavior:** `EllipticalGeometry.center = (0, 1/curvature_2)` — the ellipse bottom sits near the origin, tissue extends upward. Changing perimeter shifts the center vertically, causing asymmetric scaling.

**New behavior:** `EllipticalGeometry.center = (0, 0)` always. The ellipse scales symmetrically around the origin. Tissue straddles y=0.

### Files changed

- `src/core/math/basal-geometry.ts` — Set `center = (0, 0)` in `EllipticalGeometry` and `CircularGeometry` constructors
- Renderer/camera adjustments if the viewport needs recentering

### Why this is safe

All simulation code accesses geometry through `basalGeometry.projectPoint()`, `getNormal()`, `getPointAtArcLength()` etc. These methods work from the stored `center`. No force or constraint code hardcodes absolute positions. `StraightLineGeometry` is already at y=0.

---

## Phase 2: Dynamic Geometry Updates

### Architecture

Three decoupled concerns:

1. **Global event pipeline** — updates parameter values on a simulation-local copy of params
2. **Value comparison** — detects when geometry params have drifted from what the current `basalGeometry` was built with
3. **Geometry rebuild** — reconstructs `basalGeometry` and re-projects cell basal points

### 2.1 Simulation-local params

`EHTSimulationState` gains a `params: EHTParams` field — a mutable deep copy of the user-configured params, created at init. The step function uses `state.params` for anything global events can modify. The React-side params object stays untouched.

**Benefits:**
- Global events mutate `state.params` directly — no override maps or indirection
- Each simulation run (including batch workers) has isolated state
- CSV snapshots capture effective params naturally

### 2.2 Global event pipeline

A new `global_events` array on `EHTParams.general`. Each event:

```typescript
interface GlobalEvent {
  id: string;
  start: number;           // Earliest trigger time
  end: number;             // Latest trigger time
  period: number | 'dt';   // Repeat interval (0 = one-time)
  target_parameter: string; // Dot-notation path, e.g. 'general.perimeter'
  formula: string;          // math.js expression. Variables: old_value, t, dt
}
```

Processing: iterate global events, check time window and period, evaluate formula, write result to `state.params` at the target path.

**Tracking state:** Global events need to track whether/when they last fired, similar to how per-cell events track `trigger_time` and `fired` state. A `global_event_states: Record<string, { last_fired: number; fire_count: number }>` map on `EHTSimulationState` tracks this. Initialized to empty at init, updated each time a global event fires. For one-time events (`period: 0`), check `fire_count > 0` to skip.

### 2.3 Geometry rebuild

After global events fire, compare current params against what geometry was built from:

```
current = computeEllipseFromPerimeter(state.params.general.perimeter, state.params.general.aspect_ratio)
if current.curvature_1 != state.geometry.curvature_1 || current.curvature_2 != state.geometry.curvature_2:
    rebuild
```

No explicit dirty flag — `state.geometry` curvature values are the source of truth for what `basalGeometry` was built from.

**Rebuild steps:**
1. Recompute curvatures from `state.params` via `computeEllipseFromPerimeter()`
2. Update `state.geometry` with new curvature values
3. Construct new `basalGeometry` object (recomputes all 360 cached points, arc lengths, normals)
4. Re-project each cell's basal point: `cell.B = basalGeometry.projectPoint(B)`
5. Apical points and nuclei are NOT re-projected — existing forces pull them naturally

### 2.4 Step function ordering

In `performTimestep()`:

1. Process global events → mutate `state.params`
2. Rebuild geometry if curvatures have changed → re-project basal points
3. Existing step logic: forces, constraints, per-cell events, division, etc.

This ensures cells are on the correct curve before forces are computed.

---

## Files Changed (Phase 2)

### Modified
- `src/models/eht/params/types.ts` — Add `GlobalEvent` interface, add `global_events` to `EHTGeneralParams`
- `src/models/eht/params/schema.ts` — Zod schema for global events with `.default([])`
- `src/models/eht/params/defaults.ts` — Default empty `global_events` array
- `src/models/eht/params/descriptions.ts` — Descriptions for global event fields
- `src/models/eht/types.ts` — Add `params: EHTParams` and `global_event_states` to `EHTSimulationState`
- `src/models/eht/simulation/init.ts` — Deep-clone params into `state.params`
- `src/models/eht/simulation/step.ts` — Insert global event processing + geometry check before existing logic

### New
- `src/models/eht/simulation/geometry.ts` — `processGlobalEvents()` and `rebuildGeometryIfNeeded()` functions

### Unchanged
- Forces, constraints, division, per-cell events — these use `state.basalGeometry` and work with rebuilt geometry automatically

### Deferred
- UI for configuring global events (can follow as a separate task)

---

## Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Coordinate system | Center at origin | Symmetric scaling, no drift when perimeter changes |
| Trigger mechanism | Event-driven (not continuous) | Simpler, no interpolation needed |
| Cell re-projection | Basal only, forces handle rest | Avoids complex normal-offset computation, physics does the right thing |
| Param mutation | Sim-local mutable copy | Clean, no indirection, parallel-safe |
| Dirty detection | Value comparison vs stored curvatures | No explicit flag needed, self-describing |
| Global vs per-cell events | Separate pipeline | Global events don't need cell cycle phases, per-cell prereqs, or probability |
| Changeable params | perimeter + aspect_ratio | Core shape params; init-only params (w_init, h_init, full_circle) excluded |
