# External Force Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-cell-type external force defined by a math.js formula, evaluated per cell per substep, with auto-wrapping for scalar formulas.

**Architecture:** New `external_force` string parameter on `EHTCellTypeParams`, evaluated in a new `calcExternalForces` function added as the 6th force in the existing force pipeline. Uses polar/Cartesian coordinates relative to geometry center with tangent/normal direction vectors.

**Tech Stack:** TypeScript, math.js (`evaluate`), Vitest

**Spec:** `docs/superpowers/specs/2026-03-26-external-force-design.md`

---

### Task 1: Add `center` to `BasalGeometry` abstract class

**Files:**
- Modify: `src/core/math/basal-geometry.ts:20-59` (abstract class)
- Modify: `src/core/math/basal-geometry.ts:65-86` (StraightLineGeometry)

- [ ] **Step 1: Add abstract `center` property to `BasalGeometry`**

In `src/core/math/basal-geometry.ts`, add to the `BasalGeometry` abstract class (after the existing abstract properties on lines 21-24):

```typescript
abstract readonly center: Vector2;
```

- [ ] **Step 2: Add `center` to `StraightLineGeometry`**

In `StraightLineGeometry` class (after line 69), add:

```typescript
readonly center = new Vector2(0, 0);
```

`CircularGeometry` and `EllipticalGeometry` already have `readonly center: Vector2` fields — they satisfy the abstract contract without changes.

- [ ] **Step 3: Run build to verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors (existing `center` fields on Circle/Ellipse satisfy the abstract property)

- [ ] **Step 4: Commit**

```bash
git add src/core/math/basal-geometry.ts
git commit -m "feat: add abstract center property to BasalGeometry"
```

---

### Task 2: Add `external_force` parameter to types, schema, defaults

**Files:**
- Modify: `src/models/eht/params/types.ts:92-130` (EHTCellTypeParams interface)
- Modify: `src/models/eht/params/schema.ts:98-136` (ehtCellTypeSchema)
- Modify: `src/models/eht/params/defaults.ts:132-180` (DEFAULT_CONTROL_CELL)
- Modify: `src/models/eht/params/defaults.ts:183-231` (DEFAULT_EMT_CELL)
- Modify: `src/models/eht/params/descriptions.ts` (PARAMETER_DESCRIPTIONS)

- [ ] **Step 1: Add `external_force` to `EHTCellTypeParams` interface**

In `src/models/eht/params/types.ts`, add after `apical_junction_init` (line 129):

```typescript
external_force: string;           // External force formula (math.js expression), default "0"
```

- [ ] **Step 2: Add to Zod schema**

In `src/models/eht/params/schema.ts`, add to `ehtCellTypeSchema` after `apical_junction_init` (line 135):

```typescript
external_force: z.string().default("0"),
```

- [ ] **Step 3: Add defaults**

In `src/models/eht/params/defaults.ts`, add to `DEFAULT_CONTROL_CELL` after `apical_junction_init: 0.0,` (line 179):

```typescript
external_force: "0",
```

Add the same to `DEFAULT_EMT_CELL` after `apical_junction_init: 0.0,` (line 230):

```typescript
external_force: "0",
```

- [ ] **Step 4: Add parameter description**

In `src/models/eht/params/descriptions.ts`, add before the `// === Running Behavior ===` comment (line 95):

```typescript
'cell_types.external_force': `External force formula applied to cell nuclei. A **math.js** expression evaluated per cell per substep.

**Available variables:**
- \`x\`, \`y\`: Cartesian position relative to geometry center
- \`alpha\`: Polar angle ($0$ at bottom, $\\pm\\pi$ at top)
- \`r\`: Distance from geometry center
- \`t\`: Simulation time (hours)
- \`T\`: Unit tangent vector (counter-clockwise)
- \`N\`: Unit outward normal vector (away from center)

**Auto-wrapping:** If the formula does not contain \`T\` or \`N\`, it is treated as a scalar and wrapped as \`-(scalar) * sign(alpha) * T\`, producing tangential flow converging at the bottom ($\\alpha = 0$).

**Examples:**
- \`10\` → magnitude-10 tangential flow toward bottom
- \`5 * T + 3 * N\` → tangential + radial force (used as-is)
- \`10 * sin(t)\` → time-varying tangential flow`,
```

- [ ] **Step 5: Run build to verify**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/models/eht/params/types.ts src/models/eht/params/schema.ts src/models/eht/params/defaults.ts src/models/eht/params/descriptions.ts
git commit -m "feat: add external_force parameter to EHT cell types"
```

---

### Task 3: Implement `calcExternalForces` and integrate into force pipeline

**Files:**
- Modify: `src/models/eht/simulation/forces.ts`

- [ ] **Step 1: Add imports**

At the top of `src/models/eht/simulation/forces.ts`, add after the existing imports (line 4):

```typescript
import { evaluate, matrix } from 'mathjs';
```

- [ ] **Step 2: Add the `calcExternalForces` function**

Add before the `calcAllForces` function (before line 207):

```typescript
/** Regex to detect vector variables T or N in formula */
const VECTOR_VAR_REGEX = /\bT\b|\bN\b/;

/**
 * Build the scope for external force formula evaluation.
 * Kept as a named function for easy extension with additional variables.
 */
function buildExternalForceScope(
  x: number,
  y: number,
  alpha: number,
  r: number,
  t: number
): Record<string, unknown> {
  const T = matrix([Math.cos(alpha), Math.sin(alpha)]);
  const N = matrix([Math.sin(alpha), -Math.cos(alpha)]);
  return { x, y, alpha, r, t, T, N };
}

/**
 * Convert a math.js evaluation result to a Vector2 force.
 * Handles matrix results (extract [x,y]) and unexpected types (return zero).
 */
function resultToVector2(result: unknown): Vector2 {
  if (result != null && typeof result === 'object' && 'toArray' in result) {
    const arr = (result as { toArray: () => number[] }).toArray() as number[];
    if (arr.length >= 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
      return new Vector2(arr[0], arr[1]);
    }
  }
  if (typeof result === 'number') {
    return Vector2.zero();
  }
  return Vector2.zero();
}

/**
 * Calculate external forces from user-defined formulas.
 * Each cell type can specify a math.js formula for an external force
 * applied to cell nuclei.
 */
export function calcExternalForces(
  state: EHTSimulationState,
  params: EHTParams,
  forces: CellForces[]
): void {
  const cells = state.cells;
  const center = state.basalGeometry.center;

  for (let i = 0; i < cells.length; i++) {
    const ci = cells[i];
    const cellType = getCellType(params, ci);
    const formula = cellType.external_force;

    // Skip if no external force
    if (!formula || formula === '0') continue;

    // Compute position relative to geometry center
    const x = ci.pos.x - center.x;
    const y = ci.pos.y - center.y;

    // Polar coordinates: alpha=0 at bottom, +pi/2 at right, ±pi at top
    const alpha = Math.atan2(x, -y);
    const r = Math.sqrt(x * x + y * y);

    // Build scope
    const scope = buildExternalForceScope(x, y, alpha, r, state.t);

    // Determine effective formula: auto-wrap scalars
    const effectiveFormula = VECTOR_VAR_REGEX.test(formula)
      ? formula
      : `-(${formula}) * sign(alpha) * T`;

    try {
      const result = evaluate(effectiveFormula, scope);
      const force = resultToVector2(result);
      forces[i].f = forces[i].f.add(force);
    } catch (error) {
      console.warn(`[ExternalForce] Failed to evaluate formula "${formula}":`, error);
    }
  }
}
```

- [ ] **Step 3: Add to `calcAllForces`**

In the `calcAllForces` function, add the call after `calcApicalJunctionForces`:

```typescript
calcExternalForces(state, params, forces);
```

- [ ] **Step 4: Run build to verify**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/models/eht/simulation/forces.ts
git commit -m "feat: implement calcExternalForces in force pipeline"
```

---

### Task 4: Write tests for `calcExternalForces`

**Files:**
- Create: `src/models/eht/simulation/forces.test.ts`

- [ ] **Step 1: Write tests**

Create `src/models/eht/simulation/forces.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Vector2 } from '@/core/math/vector2';
import { calcExternalForces, zeroForces, CellForces } from './forces';
import { createDefaultEHTParams } from '../params/defaults';
import { StraightLineGeometry, CircularGeometry } from '@/core/math/basal-geometry';
import type { EHTSimulationState, CellState } from '../types';
import type { EHTParams } from '../params/types';

/** Create a minimal cell state at given position */
function makeCell(x: number, y: number, typeIndex: string): CellState {
  return {
    id: 0,
    typeIndex,
    pos: { x, y },
    A: { x, y: y + 2 },
    B: { x, y: y - 2 },
    R_hard: 0.4,
    R_soft: 1.2,
    eta_A: 1,
    eta_B: 1,
    has_A: true,
    has_B: true,
    is_running: false,
    running_mode: 0,
    birth_time: 0,
    stiffness_nuclei_apical: 3,
    stiffness_nuclei_basal: 2,
    stiffness_straightness: 5,
    stiffness_apical_apical: 2,
    k_apical_junction: 5,
    apical_cytos_strain: 0,
    basal_cytos_strain: 0,
    has_reached_G2: false,
    has_reached_mitosis: false,
    event_states: {},
  } as CellState;
}

/** Create minimal state with given cells and geometry */
function makeState(cells: CellState[], geometry: 'line' | 'circle' = 'circle'): EHTSimulationState {
  const basalGeometry = geometry === 'line'
    ? new StraightLineGeometry()
    : new CircularGeometry(0.06, 0.06);

  return {
    cells,
    ap_links: [],
    ba_links: [],
    t: 1.0,
    step_count: 0,
    basalGeometry,
    geometry: { curvature_1: 0.06, curvature_2: 0.06 },
  } as EHTSimulationState;
}

describe('calcExternalForces', () => {
  it('applies no force when external_force is "0"', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '0';

    const cell = makeCell(0, -10, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    expect(forces[0].f.x).toBe(0);
    expect(forces[0].f.y).toBe(0);
  });

  it('applies auto-wrapped scalar formula as convergent tangential force', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '10';

    // Cell at alpha = pi/2 (right side of circle, center at (0, 1/0.06))
    const center_y = 1 / 0.06; // ~16.67
    const cell = makeCell(5, center_y, 'control'); // x=5, y=center → alpha=pi/2
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // At alpha=pi/2: T=(0,1), auto-wrap: -(10)*sign(pi/2)*T = -10*(0,1) = (0,-10)
    // Force should point downward (toward bottom = alpha=0)
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(-10, 5);
  });

  it('uses vector formula as-is when T or N present', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '5 * N';

    const center_y = 1 / 0.06;
    // Cell directly below center: alpha=0, N=(0,-1)
    const cell = makeCell(0, center_y - 5, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // At alpha=0: N=(sin(0), -cos(0)) = (0, -1), so 5*N = (0, -5)
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(-5, 5);
  });

  it('produces zero force at alpha=0 with auto-wrapped scalar (sign(0)=0)', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '10';

    const center_y = 1 / 0.06;
    // Cell directly below center: alpha=0
    const cell = makeCell(0, center_y - 5, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // sign(0)=0, so force is zero
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(0, 5);
  });

  it('handles invalid formula gracefully (zero force + warning)', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = 'invalid_func()';

    const cell = makeCell(0, 0, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    calcExternalForces(state, params, forces);

    expect(forces[0].f.x).toBe(0);
    expect(forces[0].f.y).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('handles r=0 (cell at geometry center) with vector formula', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '5 * N';

    const center_y = 1 / 0.06;
    // Cell exactly at geometry center: r=0, alpha=atan2(0,0)=0
    const cell = makeCell(0, center_y, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // alpha=0 → N=(0,-1), so 5*N = (0,-5). Deterministic despite r=0.
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(-5, 5);
  });

  it('converges from negative alpha (left side) toward bottom', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = '10';

    const center_y = 1 / 0.06;
    // Cell at alpha = -pi/2 (left side): x=-5, y=center
    const cell = makeCell(-5, center_y, 'control');
    const state = makeState([cell]);
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // alpha=-pi/2: T=(cos(-pi/2), sin(-pi/2))=(0,-1), sign(-pi/2)=-1
    // Auto-wrap: -(10)*(-1)*(0,-1) = 10*(0,-1) = (0,-10)
    // From left side, downward IS toward the bottom (clockwise along curve) ✓
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(-10, 5);
  });

  it('exposes time variable t in formula scope', () => {
    const params = createDefaultEHTParams();
    params.cell_types.control.external_force = 't * N';

    const center_y = 1 / 0.06;
    const cell = makeCell(0, center_y - 5, 'control');
    const state = makeState([cell]);
    state.t = 3.0;
    const forces: CellForces[] = [zeroForces()];

    calcExternalForces(state, params, forces);

    // At alpha=0: N=(0,-1), t=3, so force = 3*(0,-1) = (0,-3)
    expect(forces[0].f.x).toBeCloseTo(0, 5);
    expect(forces[0].f.y).toBeCloseTo(-3, 5);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/models/eht/simulation/forces.test.ts`
Expected: All 8 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/models/eht/simulation/forces.test.ts
git commit -m "test: add tests for calcExternalForces"
```

---

### Task 5: Add UI text input for external force

**Files:**
- Modify: `src/models/eht/ui/CellTypesTab.tsx:32-41` (SECTIONS array)
- Modify: `src/models/eht/ui/CellTypesTab.tsx` (add row in Stiffness section area)

- [ ] **Step 1: Add `external_force` to the Stiffness section**

In `src/models/eht/ui/CellTypesTab.tsx`, add `'external_force'` to the `stiffness` section's `fields` array (line 36):

```typescript
{ key: 'stiffness', label: 'Stiffness', fields: ['k_apical_junction', 'k_cytos', 'stiffness_apical_apical', 'stiffness_apical_apical_div', 'stiffness_nuclei_apical', 'stiffness_nuclei_basal', 'stiffness_repulsion', 'stiffness_straightness', 'external_force'] },
```

- [ ] **Step 2: Add the row in the JSX**

After the "Stiff Straightness" row (after line 643), add:

```tsx
<CellTypeRow label="External Force" description={desc('external_force')}>
  {cellTypeKeys.map((key) => (
    <StringCell
      key={key}
      value={getCellType(key).external_force}
      onChange={(v) => updateCellType(key, 'external_force', v)}
      disabled={disabled}
    />
  ))}
</CellTypeRow>
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Open the app, go to Cell Types tab, scroll to the Stiffness section. Verify the "External Force" row appears with text inputs per cell type, and the help popover works.

- [ ] **Step 4: Commit**

```bash
git add src/models/eht/ui/CellTypesTab.tsx
git commit -m "feat: add External Force text input to cell types UI"
```

---

### Task 6: Run full test suite and build

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit any fixes if needed**
