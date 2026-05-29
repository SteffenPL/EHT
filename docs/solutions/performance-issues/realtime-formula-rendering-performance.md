---
title: Stabilize Realtime Formula Rendering Performance
date: 2026-05-29
category: performance-issues
module: EHT realtime simulation and formula evaluation
problem_type: performance_issue
component: tooling
symptoms:
  - "Realtime EHT simulations with formula-heavy settings could drop to a few FPS or less"
  - "Chrome could show Aw, Snap error code 5 while the realtime simulation was running"
  - "External-force formulas were much slower than baseline when evaluated per cell and substep"
root_cause: memory_leak
resolution_type: code_fix
severity: high
tags: [eht, realtime, formula-cache, pixi, performance, memory-leak, external-forces]
---

# Stabilize Realtime Formula Rendering Performance

## Problem

Realtime EHT simulations became unstable after formula and realtime-mode features grew together. Formula-heavy configurations could suddenly fall to very low frame rates, and realtime mode could eventually crash the browser renderer with Chrome's "Aw, Snap" error code 5.

## Symptoms

- Realtime simulation could degrade from smooth animation to only a few frames per second.
- External-force formulas were especially expensive because they run for each cell during each simulation substep.
- Browser stress testing could provoke a renderer-process crash in realtime mode.
- The failure was easier to trigger after recent external-force formula and realtime-rendering changes (session history).

## What Didn't Work

- Treating this as only a formula-evaluation problem improved the simulation step cost but did not fully resolve the realtime crash. The formula fix reduced the external-force probe from roughly 61 ms per step to roughly 13 ms per step, but Chrome could still crash under realtime rendering.
- Looking only at malformed test URLs or old console logs was misleading. Those logs came from a bad test URL attempt and were not the active app failure.
- Unit tests alone were insufficient because the worst symptom involved browser renderer resource pressure over repeated realtime frames.

## Solution

Fix both hot paths: avoid reparsing formulas on every evaluation, and destroy transient Pixi display objects before replacing each frame.

The formula fix introduced a shared compiled math.js cache:

```ts
const formulaCache = new Map<string, EvalFunction>();

export function evaluateCompiledFormula(formula: string, scope: Record<string, unknown>): unknown {
  let compiled = formulaCache.get(formula);
  if (!compiled) {
    compiled = compile(formula);
    formulaCache.set(formula, compiled);
  }
  return compiled.evaluate(scope);
}
```

Then hot callers moved from `evaluate(...)` to `evaluateCompiledFormula(...)`, including:

- `src/models/eht/simulation/cell.ts`
- `src/models/eht/simulation/external-force-formula.ts`
- `src/models/eht/compat/formula-units.ts`

External-force evaluation also reduced per-call allocation by using plain vector arrays in the math.js scope:

```ts
const scope: Record<string, unknown> = {
  T: [tangent.x, tangent.y],
  N: [normal.x, normal.y],
  delta,
  init_value: initValue,
  ...formulaFunctions,
};
```

`calcExternalForces` now normalizes usable formula rows once per cell type per force pass instead of rebuilding row metadata for every cell:

```ts
const rowsByCellType = new Map<string, ExternalForceRow[]>();

const getRowsForCellType = (typeIndex: string, cellType: typeof fallbackType): ExternalForceRow[] => {
  const cachedRows = rowsByCellType.get(typeIndex);
  if (cachedRows) return cachedRows;

  const formulas = normalizeExternalForces(cellType);
  const values = normalizeExternalForceValues(cellType);
  const rows: ExternalForceRow[] = [];

  for (let rowIndex = 0; rowIndex < Math.max(formulas.length, values.length); rowIndex++) {
    const formula = formulas[rowIndex]?.trim() ?? '';
    if (!formula || formula === '0') continue;
    rows.push({ formula, initValue: values[rowIndex] ?? 1, effectiveFormulaKey: formula });
  }

  rowsByCellType.set(typeIndex, rows);
  return rows;
};
```

The rendering fix changed frame clearing from "detach children" to "detach and destroy children":

```ts
private clearContainer(container: Container): void {
  const removedChildren = container.removeChildren();
  for (const child of removedChildren) {
    child.destroy({
      children: true,
      context: true,
      texture: true,
      style: true,
    });
  }
}
```

`SimulationRenderer.render()` now calls this for `cellsContainer`, `linksContainer`, `overlayContainer`, and `uiContainer` before adding new `Graphics` and `Text` objects.

## Why This Works

`mathjs.evaluate()` parses and compiles expression text before evaluation. That cost is easy to miss in ordinary UI use, but external-force formulas sit in a multiplicative hot path: rows times cells times substeps times realtime frames. Caching compiled formulas keeps formula strings flexible while making repeated evaluations pay only scope-binding and execution cost.

The Pixi issue was separate. `removeChildren()` removes display objects from the scene graph but does not necessarily release the GPU, text, texture, style, and child resources owned by those display objects. Realtime mode renders continuously, so detached-but-not-destroyed `Graphics` and `Text` objects can accumulate resource pressure until the browser process slows down or crashes.

The two fixes reinforce each other: formula evaluation now spends less time per simulation step, and rendering no longer leaks transient frame resources while the simulation keeps stepping.

## Prevention

- Cache compiled math.js formulas in any per-cell, per-substep, or realtime hot path.
- Keep formula cache tests close to formula evaluators so future callers do not reintroduce direct `evaluate(...)` in simulation code.
- When Pixi display objects are recreated every frame, destroy the removed children; `removeChildren()` alone is not a resource lifecycle boundary.
- Add renderer lifecycle tests for transient objects, not only visual smoke tests.
- Browser-stress realtime mode when touching rendering, external-force formulas, or simulation stepping. A useful regression setup is realtime mode with nonzero external-force formulas for at least 30 seconds.

## Related Issues

- Related docs: `docs/solutions/architecture-patterns/v2-micron-parameter-format-compatibility-boundary-2026-05-20.md` covers formula-unit compatibility, but overlap is low: that note is about preserving formula semantics across a parameter-unit migration, while this fix is about formula execution cost and Pixi resource lifecycle.
- Related session context: prior sessions introduced multiple external-force rows, formula init-value/mode handling, and realtime mode. They also found earlier realtime-specific issues around cloned basal geometry and high-DPI drag coordinates (session history). Those were distinct bugs, but they made realtime mode a higher-value stress target for this performance fix.
- GitHub issue search for `EHT formula realtime performance` returned no related issues.
