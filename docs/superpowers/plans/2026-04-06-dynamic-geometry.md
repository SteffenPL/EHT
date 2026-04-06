# Dynamic Geometry Parameter Updates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable mid-simulation geometry changes (perimeter, aspect ratio) triggered by global events, with center-at-origin coordinate system.

**Architecture:** Two phases. Phase 1 refactors the coordinate system so (0,0) is always the geometry center. Phase 2 adds a global event pipeline that mutates a simulation-local copy of params, with automatic geometry rebuild when curvatures drift from stored values.

**Tech Stack:** TypeScript, Vitest, math.js (formula evaluation), Zod (schema validation)

---

## File Structure

### Phase 1 (center-at-origin)
- **Modify:** `src/core/math/basal-geometry.ts` — Change center to (0,0) in CircularGeometry and EllipticalGeometry
- **Modify:** `src/core/math/basal-geometry.test.ts` — Update tests for new center
- **Modify:** `src/models/eht/simulation/forces.test.ts` — Update any hardcoded positions

### Phase 2 (dynamic geometry)
- **Modify:** `src/models/eht/params/types.ts` — Add `GlobalEvent` interface, `global_events` field
- **Modify:** `src/models/eht/params/schema.ts` — Zod schema for global events
- **Modify:** `src/models/eht/params/defaults.ts` — Default empty `global_events`
- **Modify:** `src/models/eht/params/descriptions.ts` — Parameter descriptions
- **Modify:** `src/models/eht/types.ts` — Add `params` and `global_event_states` to state
- **Modify:** `src/models/eht/simulation/init.ts` — Deep-clone params into state
- **Modify:** `src/models/eht/simulation/step.ts` — Insert global event + geometry rebuild calls
- **Create:** `src/models/eht/simulation/global-events.ts` — Global event processing
- **Create:** `src/models/eht/simulation/global-events.test.ts` — Tests for global events
- **Create:** `src/models/eht/simulation/rebuild-geometry.ts` — Geometry rebuild + re-projection
- **Create:** `src/models/eht/simulation/rebuild-geometry.test.ts` — Tests for geometry rebuild

---

## Phase 1: Center-at-Origin Refactor

### Task 1: Move geometry center to origin

**Files:**
- Modify: `src/core/math/basal-geometry.ts:109` (CircularGeometry)
- Modify: `src/core/math/basal-geometry.ts:174` (EllipticalGeometry)

- [ ] **Step 1: Write a failing test that asserts center is at origin**

In a new or existing test file for basal-geometry, add:

```typescript
// In the existing basal-geometry test file or create one
import { CircularGeometry, EllipticalGeometry } from '@/core/math/basal-geometry';

describe('center-at-origin', () => {
  it('CircularGeometry center is at (0,0)', () => {
    const geom = new CircularGeometry(0.06, 0.06);
    expect(geom.center.x).toBeCloseTo(0);
    expect(geom.center.y).toBeCloseTo(0);
  });

  it('EllipticalGeometry center is at (0,0)', () => {
    const geom = new EllipticalGeometry(0.05, 0.1);
    expect(geom.center.x).toBeCloseTo(0);
    expect(geom.center.y).toBeCloseTo(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --reporter verbose -- basal-geometry`
Expected: FAIL — center.y will be `1/0.06 ≈ 16.67` and `1/0.1 = 10` respectively.

- [ ] **Step 3: Change CircularGeometry center to (0,0)**

In `src/core/math/basal-geometry.ts`, line 109, change:

```typescript
// Before:
this.center = new Vector2(0, 1 / curvature_2);

// After:
this.center = new Vector2(0, 0);
```

- [ ] **Step 4: Change EllipticalGeometry center to (0,0)**

In `src/core/math/basal-geometry.ts`, line 174, change:

```typescript
// Before:
this.center = new Vector2(0, 1 / curvature_2);

// After:
this.center = new Vector2(0, 0);
```

- [ ] **Step 5: Run the center tests to verify they pass**

Run: `npx vitest run --reporter verbose -- basal-geometry`
Expected: PASS

- [ ] **Step 6: Run the full test suite and fix any position-dependent test failures**

Run: `npm run test`

Some tests in `forces.test.ts` or elsewhere may have hardcoded position expectations based on the old center at `(0, 1/curvature_2)`. Update those to account for the new center at `(0, 0)`. The `makeState` helper in `forces.test.ts:47-62` creates cells with positions that may need adjustment — check if test cells are placed relative to the geometry and update accordingly.

- [ ] **Step 7: Commit**

```bash
git add src/core/math/basal-geometry.ts src/core/math/basal-geometry.test.ts src/models/eht/simulation/forces.test.ts
git commit -m "refactor: move geometry center to origin (0,0)

Ellipse and circle geometries now center at the origin instead of
(0, 1/curvature_2). This enables symmetric scaling when perimeter
changes mid-simulation."
```

---

## Phase 2: Dynamic Geometry Updates

### Task 2: Add GlobalEvent type and params fields

**Files:**
- Modify: `src/models/eht/params/types.ts:131-149`
- Modify: `src/models/eht/params/schema.ts:139-156`
- Modify: `src/models/eht/params/defaults.ts:228-258`
- Modify: `src/models/eht/params/descriptions.ts`

- [ ] **Step 1: Add GlobalEvent interface to types.ts**

In `src/models/eht/params/types.ts`, add after the `EventDefinition` union (after line 69):

```typescript
/** Global event - updates a global parameter using a math.js formula */
export interface GlobalEvent {
  /** Unique identifier */
  id: string;
  /** Earliest trigger time */
  start: number;
  /** Latest trigger time */
  end: number;
  /** Repeat interval (0 = one-time, 'dt' = every timestep) */
  period: number | 'dt';
  /** Target parameter path in dot-notation (e.g., 'general.perimeter') */
  target_parameter: string;
  /** math.js formula. Variables: old_value, t, dt */
  formula: string;
}
```

- [ ] **Step 2: Add `global_events` to EHTGeneralParams**

In `src/models/eht/params/types.ts`, add to `EHTGeneralParams` (after line 148):

```typescript
  global_events: GlobalEvent[]; // Global events that modify simulation parameters mid-run
```

- [ ] **Step 3: Add Zod schema for GlobalEvent**

In `src/models/eht/params/schema.ts`, add before `ehtGeneralParamsSchema` (before line 139):

```typescript
/** Global event schema */
export const globalEventSchema = z.object({
  id: z.string(),
  start: z.number(),
  end: z.number(),
  period: z.union([z.number(), z.literal('dt')]),
  target_parameter: z.string(),
  formula: z.string(),
});

/** Global events array schema */
export const globalEventsArraySchema = z.array(globalEventSchema);
```

- [ ] **Step 4: Add `global_events` to ehtGeneralParamsSchema**

In `src/models/eht/params/schema.ts`, add to `ehtGeneralParamsSchema` (after `default_events` on line 155):

```typescript
  global_events: globalEventsArraySchema.default([]),
```

- [ ] **Step 5: Add `global_events` to defaults**

In `src/models/eht/params/defaults.ts`, add to `DEFAULT_EHT_PARAMS.general` (after `default_events`):

```typescript
  global_events: [],
```

- [ ] **Step 6: Add parameter descriptions**

In `src/models/eht/params/descriptions.ts`, add entries:

```typescript
  'general.global_events': 'Global events that modify simulation parameters (e.g., geometry) during the simulation run.',
  'global_events.id': 'Unique identifier for the global event.',
  'global_events.start': 'Earliest simulation time the event can trigger.',
  'global_events.end': 'Latest simulation time the event can trigger.',
  'global_events.period': 'Repeat interval in simulation time units. Use 0 for one-time events.',
  'global_events.target_parameter': 'Dot-notation path to the parameter to modify (e.g., $\\texttt{general.perimeter}$).',
  'global_events.formula': 'math.js formula to compute the new value. Available variables: $\\texttt{old\\_value}$ (current value), $\\texttt{t}$ (current time), $\\texttt{dt}$ (timestep).',
```

- [ ] **Step 7: Run type check and tests**

Run: `npx tsc --noEmit && npm run test`
Expected: PASS — new fields have defaults, so existing code is unaffected.

- [ ] **Step 8: Commit**

```bash
git add src/models/eht/params/types.ts src/models/eht/params/schema.ts src/models/eht/params/defaults.ts src/models/eht/params/descriptions.ts
git commit -m "feat: add GlobalEvent type and global_events parameter field

Introduces the GlobalEvent interface for mid-simulation parameter
changes. Default is an empty array, so no behavioral change yet."
```

---

### Task 3: Add simulation-local params and global event states to EHTSimulationState

**Files:**
- Modify: `src/models/eht/types.ts:115-125`
- Modify: `src/models/eht/types.ts:128-138` (createInitialEHTState)
- Modify: `src/models/eht/simulation/init.ts:17-34`

- [ ] **Step 1: Add `params` and `global_event_states` to EHTSimulationState**

In `src/models/eht/types.ts`, add to `EHTSimulationState` interface (after `rngSeed`):

```typescript
    /** Simulation-local mutable copy of params (modified by global events) */
    params?: EHTParams;
    /** Tracking state for global events */
    global_event_states: Record<string, { last_fired: number; fire_count: number }>;
```

Add the import at the top of the file:

```typescript
import type { EHTParams } from './params/types';
```

- [ ] **Step 2: Update createInitialEHTState to include global_event_states**

In `src/models/eht/types.ts`, in `createInitialEHTState`, add to the returned object:

```typescript
    global_event_states: {},
```

- [ ] **Step 3: Deep-clone params into state during init**

In `src/models/eht/simulation/init.ts`, at the start of `initializeEHTSimulation` (after line 22), add:

```typescript
  // Store a mutable simulation-local copy of params
  state.params = structuredClone(params);
```

- [ ] **Step 4: Run type check and tests**

Run: `npx tsc --noEmit && npm run test`
Expected: PASS — `params` is optional so existing test helpers (like `makeState` in forces.test.ts) don't need updating yet.

- [ ] **Step 5: Commit**

```bash
git add src/models/eht/types.ts src/models/eht/simulation/init.ts
git commit -m "feat: add simulation-local params copy and global event state tracking

EHTSimulationState now carries a mutable deep copy of params for
global events to modify, plus a map tracking global event fire times."
```

---

### Task 4: Implement global event processing

**Files:**
- Create: `src/models/eht/simulation/global-events.ts`
- Create: `src/models/eht/simulation/global-events.test.ts`

- [ ] **Step 1: Write failing tests for global event processing**

Create `src/models/eht/simulation/global-events.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { processGlobalEvents } from './global-events';
import type { EHTSimulationState } from '../types';
import type { EHTParams, GlobalEvent } from '../params/types';
import { StraightLineGeometry } from '@/core/math/basal-geometry';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';

function makeTestState(t: number, params?: EHTParams): EHTSimulationState {
  const p = params ?? structuredClone(DEFAULT_EHT_PARAMS);
  return {
    cells: [],
    ap_links: [],
    ba_links: [],
    t,
    step_count: 0,
    basalGeometry: new StraightLineGeometry(),
    geometry: { curvature_1: 0, curvature_2: 0 },
    rngSeed: 'test',
    params: p,
    global_event_states: {},
  };
}

describe('processGlobalEvents', () => {
  it('does nothing when global_events is empty', () => {
    const state = makeTestState(10);
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(DEFAULT_EHT_PARAMS.general.perimeter);
  });

  it('fires a one-time event within time window', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'shrink',
      start: 4,
      end: 6,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'old_value - 10',
    }];
    const originalPerimeter = state.params!.general.perimeter;
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(originalPerimeter - 10);
    expect(state.global_event_states['shrink'].fire_count).toBe(1);
  });

  it('does not fire a one-time event twice', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'shrink',
      start: 4,
      end: 6,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'old_value - 10',
    }];
    processGlobalEvents(state, 0.1);
    const afterFirst = state.params!.general.perimeter;
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(afterFirst);
  });

  it('does not fire outside time window', () => {
    const state = makeTestState(1);
    state.params!.general.global_events = [{
      id: 'shrink',
      start: 4,
      end: 6,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'old_value - 10',
    }];
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(DEFAULT_EHT_PARAMS.general.perimeter);
  });

  it('fires periodic events respecting period interval', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'gradual_shrink',
      start: 4,
      end: 100,
      period: 1.0,
      target_parameter: 'general.perimeter',
      formula: 'old_value - 1',
    }];
    const original = state.params!.general.perimeter;

    // First call: fires (no previous fire)
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(original - 1);

    // Second call at same time: does not fire (period not elapsed)
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(original - 1);

    // Advance time past period
    state.t = 6.1;
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.perimeter).toBe(original - 2);
  });

  it('provides t and dt variables to formula', () => {
    const state = makeTestState(10);
    state.params!.general.global_events = [{
      id: 'time_based',
      start: 0,
      end: 100,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 't * 2 + dt',
    }];
    processGlobalEvents(state, 0.5);
    expect(state.params!.general.perimeter).toBe(10 * 2 + 0.5);
  });

  it('updates nested parameter via dot-notation', () => {
    const state = makeTestState(5);
    state.params!.general.global_events = [{
      id: 'change_aspect',
      start: 4,
      end: 6,
      period: 0,
      target_parameter: 'general.aspect_ratio',
      formula: '0.5',
    }];
    processGlobalEvents(state, 0.1);
    expect(state.params!.general.aspect_ratio).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --reporter verbose -- global-events`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement processGlobalEvents**

Create `src/models/eht/simulation/global-events.ts`:

```typescript
/**
 * Global event processing.
 * Evaluates global events and mutates state.params accordingly.
 */

import { evaluate } from 'mathjs';
import type { EHTSimulationState } from '../types';
import type { GlobalEvent } from '../params/types';

/**
 * Get a nested property value from an object using dot-notation path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Set a nested property value on an object using dot-notation path.
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Resolve event period to a number. Handles 'dt' as a special value.
 */
function resolveEffectivePeriod(period: number | 'dt', dt: number): number {
  return period === 'dt' ? dt : period;
}

/**
 * Check if a global event should fire at the current time.
 */
function shouldFire(
  event: GlobalEvent,
  t: number,
  dt: number,
  eventState: { last_fired: number; fire_count: number } | undefined
): boolean {
  // Outside time window
  if (t < event.start || t > event.end) return false;

  const effectivePeriod = resolveEffectivePeriod(event.period, dt);

  // One-time event (period = 0): fire only if never fired
  if (effectivePeriod === 0) {
    return !eventState || eventState.fire_count === 0;
  }

  // Periodic event: fire if enough time has elapsed since last fire
  if (!eventState) return true;
  return (t - eventState.last_fired) >= effectivePeriod - 1e-9;
}

/**
 * Process all global events, mutating state.params in place.
 */
export function processGlobalEvents(state: EHTSimulationState, dt: number): void {
  const params = state.params;
  if (!params) return;

  const globalEvents = params.general.global_events;
  if (!globalEvents || globalEvents.length === 0) return;

  for (const event of globalEvents) {
    const eventState = state.global_event_states[event.id];

    if (!shouldFire(event, state.t, dt, eventState)) continue;

    // Get current value
    const oldValue = getNestedValue(params as unknown as Record<string, unknown>, event.target_parameter);

    // Evaluate formula
    const scope = {
      old_value: oldValue as number,
      t: state.t,
      dt,
    };
    const newValue = evaluate(event.formula, scope);

    // Set new value
    setNestedValue(params as unknown as Record<string, unknown>, event.target_parameter, newValue);

    // Update tracking state
    state.global_event_states[event.id] = {
      last_fired: state.t,
      fire_count: (eventState?.fire_count ?? 0) + 1,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --reporter verbose -- global-events`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/eht/simulation/global-events.ts src/models/eht/simulation/global-events.test.ts
git commit -m "feat: implement global event processing

Processes global events that mutate simulation-local params using
math.js formulas. Supports one-time and periodic events within
configurable time windows."
```

---

### Task 5: Implement geometry rebuild with cell re-projection

**Files:**
- Create: `src/models/eht/simulation/rebuild-geometry.ts`
- Create: `src/models/eht/simulation/rebuild-geometry.test.ts`

- [ ] **Step 1: Write failing tests for geometry rebuild**

Create `src/models/eht/simulation/rebuild-geometry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { rebuildGeometryIfNeeded } from './rebuild-geometry';
import type { EHTSimulationState } from '../types';
import type { EHTParams } from '../params/types';
import { CircularGeometry } from '@/core/math/basal-geometry';
import { createBasalGeometry } from '@/core/math';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import { computeEllipseFromPerimeter } from '../params/geometry';

function makeCell(x: number, y: number) {
  return {
    id: 0,
    typeIndex: 'control',
    pos: { x, y: y + 1 },
    A: { x, y: y + 2 },
    B: { x, y },
    vel: { x: 0, y: 0 },
    age: 0,
    t_birth: 0,
    has_A: true,
    has_B: true,
    has_divided: false,
    running: false,
    apical_constriction: false,
    stiffness_nuclei_apical: 1,
    stiffness_nuclei_basal: 1,
    k_apical_junction: 1,
    event_states: {},
    has_reached_G2: false,
    has_reached_mitosis: false,
  };
}

function makeGeometryState(params: EHTParams): EHTSimulationState {
  const geom = computeEllipseFromPerimeter(
    params.general.perimeter,
    params.general.aspect_ratio
  );
  const basalGeometry = createBasalGeometry(geom.curvature_1, geom.curvature_2, 360);

  // Place a cell on the curve
  const point = basalGeometry.getPointAtArcLength(0);
  const cell = makeCell(point.x, point.y);

  return {
    cells: [cell],
    ap_links: [],
    ba_links: [],
    t: 5,
    step_count: 0,
    basalGeometry,
    geometry: { curvature_1: geom.curvature_1, curvature_2: geom.curvature_2 },
    rngSeed: 'test',
    params: structuredClone(params),
    global_event_states: {},
  };
}

describe('rebuildGeometryIfNeeded', () => {
  it('does nothing when params match current geometry', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);
    const oldPerimeter = state.basalGeometry.perimeter;
    rebuildGeometryIfNeeded(state);
    expect(state.basalGeometry.perimeter).toBe(oldPerimeter);
  });

  it('rebuilds when perimeter changes', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);
    const oldPerimeter = state.basalGeometry.perimeter;

    // Simulate a global event having changed the perimeter
    state.params!.general.perimeter = DEFAULT_EHT_PARAMS.general.perimeter - 20;
    rebuildGeometryIfNeeded(state);

    expect(state.basalGeometry.perimeter).not.toBe(oldPerimeter);
    expect(state.geometry!.curvature_1).not.toBe(
      computeEllipseFromPerimeter(DEFAULT_EHT_PARAMS.general.perimeter, DEFAULT_EHT_PARAMS.general.aspect_ratio).curvature_1
    );
  });

  it('rebuilds when aspect_ratio changes', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);

    state.params!.general.aspect_ratio = 0.5;
    rebuildGeometryIfNeeded(state);

    const expected = computeEllipseFromPerimeter(
      DEFAULT_EHT_PARAMS.general.perimeter, 0.5
    );
    expect(state.geometry!.curvature_1).toBeCloseTo(expected.curvature_1, 6);
    expect(state.geometry!.curvature_2).toBeCloseTo(expected.curvature_2, 6);
  });

  it('re-projects cell basal points onto new curve', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);
    const oldB = { ...state.cells[0].B };

    // Change perimeter significantly
    state.params!.general.perimeter = DEFAULT_EHT_PARAMS.general.perimeter * 0.5;
    rebuildGeometryIfNeeded(state);

    // Basal point should have moved (re-projected onto smaller curve)
    const newB = state.cells[0].B;
    const moved = Math.hypot(newB.x - oldB.x, newB.y - oldB.y);
    expect(moved).toBeGreaterThan(0.01);
  });

  it('does not modify apical or nucleus positions', () => {
    const state = makeGeometryState(DEFAULT_EHT_PARAMS);
    const oldA = { ...state.cells[0].A };
    const oldPos = { ...state.cells[0].pos };

    state.params!.general.perimeter = DEFAULT_EHT_PARAMS.general.perimeter * 0.5;
    rebuildGeometryIfNeeded(state);

    expect(state.cells[0].A.x).toBe(oldA.x);
    expect(state.cells[0].A.y).toBe(oldA.y);
    expect(state.cells[0].pos.x).toBe(oldPos.x);
    expect(state.cells[0].pos.y).toBe(oldPos.y);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --reporter verbose -- rebuild-geometry`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement rebuildGeometryIfNeeded**

Create `src/models/eht/simulation/rebuild-geometry.ts`:

```typescript
/**
 * Geometry rebuild logic.
 * Detects when simulation-local params have diverged from the current
 * basalGeometry and rebuilds it, re-projecting cell basal points.
 */

import { Vector2 } from '@/core/math/vector2';
import { createBasalGeometry } from '@/core/math';
import type { EHTSimulationState } from '../types';
import { computeEllipseFromPerimeter } from '../params/geometry';

/**
 * Check if geometry needs rebuilding and do so if needed.
 * Compares curvatures derived from current state.params against
 * the curvatures stored in state.geometry (which reflect what
 * basalGeometry was built from).
 *
 * If they differ:
 * 1. Recompute curvatures
 * 2. Rebuild basalGeometry
 * 3. Re-project all cell basal points onto the new curve
 */
export function rebuildGeometryIfNeeded(state: EHTSimulationState): void {
  const params = state.params;
  if (!params || !state.geometry) return;

  const { perimeter, aspect_ratio } = params.general;
  const newGeom = computeEllipseFromPerimeter(perimeter, aspect_ratio);

  // Compare against stored curvatures
  const eps = 1e-12;
  if (
    Math.abs(newGeom.curvature_1 - state.geometry.curvature_1) < eps &&
    Math.abs(newGeom.curvature_2 - state.geometry.curvature_2) < eps
  ) {
    return; // No change needed
  }

  // Update stored curvatures
  state.geometry.curvature_1 = newGeom.curvature_1;
  state.geometry.curvature_2 = newGeom.curvature_2;

  // Rebuild basalGeometry
  state.basalGeometry = createBasalGeometry(
    newGeom.curvature_1,
    newGeom.curvature_2,
    360
  );

  // Re-project all cell basal points
  for (const cell of state.cells) {
    const B = Vector2.from(cell.B);
    const projected = state.basalGeometry.projectPoint(B);
    cell.B.x = projected.x;
    cell.B.y = projected.y;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --reporter verbose -- rebuild-geometry`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/eht/simulation/rebuild-geometry.ts src/models/eht/simulation/rebuild-geometry.test.ts
git commit -m "feat: implement geometry rebuild with basal re-projection

Detects when perimeter/aspect_ratio params have drifted from current
geometry curvatures. Rebuilds basalGeometry and re-projects all cell
basal points. Apical/nucleus positions are left to forces."
```

---

### Task 6: Wire global events and geometry rebuild into performTimestep

**Files:**
- Modify: `src/models/eht/simulation/step.ts:156-196`

- [ ] **Step 1: Add imports to step.ts**

In `src/models/eht/simulation/step.ts`, add imports:

```typescript
import { processGlobalEvents } from './global-events';
import { rebuildGeometryIfNeeded } from './rebuild-geometry';
```

- [ ] **Step 2: Insert global event processing and geometry rebuild into performTimestep**

In `src/models/eht/simulation/step.ts`, in `performTimestep`, add these two lines after `const fullDt = pg.dt;` (after line 162) and before the cell phase update (line 164):

```typescript
    // Process global events (may mutate state.params)
    processGlobalEvents(state, fullDt);

    // Rebuild geometry if global events changed perimeter/aspect_ratio
    rebuildGeometryIfNeeded(state);
```

- [ ] **Step 3: Run full test suite**

Run: `npm run test`
Expected: All PASS. The new code is a no-op when `global_events` is empty (default).

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/eht/simulation/step.ts
git commit -m "feat: wire global events and geometry rebuild into timestep

Global events fire at the start of each timestep, before cell phase
updates and force computation. Geometry is rebuilt automatically if
the events modified perimeter or aspect_ratio."
```

---

### Task 7: Integration test — end-to-end geometry change during simulation

**Files:**
- Create or extend: `src/models/eht/simulation/global-events.test.ts`

- [ ] **Step 1: Write an integration test that runs a full simulation step with geometry change**

Add to `src/models/eht/simulation/global-events.test.ts`:

```typescript
import { performTimestep } from './step';
import { initializeEHTSimulation } from './init';
import { createInitialEHTState } from '../types';
import { SeededRandom } from '@/core/math/random';
import { Vector2 } from '@/core/math/vector2';

describe('integration: geometry change during simulation', () => {
  it('shrinks perimeter mid-simulation via global event', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    params.general.global_events = [{
      id: 'shrink_at_t2',
      start: 1.5,
      end: 2.5,
      period: 0,
      target_parameter: 'general.perimeter',
      formula: 'old_value * 0.8',
    }];

    // Initialize
    const state = createInitialEHTState();
    const rng = new SeededRandom('test');
    initializeEHTSimulation(params, state, rng);

    const originalPerimeter = state.params!.general.perimeter;
    const originalCurvature = state.geometry!.curvature_1;

    // Step until before event window
    state.t = 1.0;
    const rng1 = new SeededRandom('step_1');
    performTimestep(state, params, rng1);
    expect(state.params!.general.perimeter).toBe(originalPerimeter);

    // Step into event window
    state.t = 2.0;
    const rng2 = new SeededRandom('step_2');
    performTimestep(state, params, rng2);

    // Perimeter should have changed
    expect(state.params!.general.perimeter).toBeCloseTo(originalPerimeter * 0.8);

    // Geometry should have been rebuilt
    expect(state.geometry!.curvature_1).not.toBeCloseTo(originalCurvature);

    // All basal points should be on the new curve
    for (const cell of state.cells) {
      const B = new Vector2(cell.B.x, cell.B.y);
      const projected = state.basalGeometry.projectPoint(B);
      expect(cell.B.x).toBeCloseTo(projected.x, 4);
      expect(cell.B.y).toBeCloseTo(projected.y, 4);
    }
  });
});
```

Note: The integration test may need adjustments depending on how `performTimestep` reads params. Since `performTimestep` currently reads from its `params` argument for `pg.dt`, but global events modify `state.params`, verify that the step function uses the correct source for geometry-related reads. The key invariant: `state.params` is what global events mutate, and `rebuildGeometryIfNeeded` reads from `state.params`.

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run --reporter verbose -- global-events`
Expected: PASS.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add src/models/eht/simulation/global-events.test.ts
git commit -m "test: add integration test for mid-simulation geometry change

Verifies that a global event shrinks the perimeter, triggers geometry
rebuild, and re-projects basal points onto the new curve."
```

---

## Task Summary

| Task | Description | Phase |
|------|-------------|-------|
| 1 | Move geometry center to (0,0) | Phase 1 |
| 2 | Add GlobalEvent type and params fields | Phase 2 |
| 3 | Add sim-local params and event states to state | Phase 2 |
| 4 | Implement global event processing | Phase 2 |
| 5 | Implement geometry rebuild with re-projection | Phase 2 |
| 6 | Wire into performTimestep | Phase 2 |
| 7 | Integration test | Phase 2 |
