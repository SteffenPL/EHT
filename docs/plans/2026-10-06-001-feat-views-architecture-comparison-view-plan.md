---
title: "feat: Views architecture and perimeter-oscillation comparison view"
type: feat
status: in-progress
date: 2026-10-06
origin: live planning session (opencode)
---

# feat: Views architecture and comparison view

## Summary

Introduce a **view** concept as a routable page that composes one or more simulations, separate from the existing **model** concept (registry-based single simulations used by the engine, batch, CLI, and CSV I/O). The first new view is a comparison of two EHT scenarios: high-frequency (120 bpm) perimeter oscillation (±10%) versus an averaged model with adapted parameters, rendered superimposed on one canvas with comparative statistics plots below.

## Problem Frame

The current app treats "models" (EHT, Toy) as the only top-level concept, but most work is EHT-centered. New tasks need *smaller interfaces* that run simulations similar-but-not-identical to EHT and reuse its functions. A comparison of two parameter variants of the same model does not fit the `SimulationModel` interface (single `init`/`step` state, single CSV/params lifecycle) and would pollute the model registry used by batch workers and the CLI.

## Decision rule (models vs. views)

- A new **simulation** with its own params/CSV/batch/CLI lifecycle → new registered model in `src/models/`, reusing EHT internals by import.
- A new **presentation or composition** of existing simulations (comparisons, focused demos) → a **view** in `src/views/`. Views reuse registered models, EHT internal modules, and shared components; they never enter `modelRegistry`.

## Requirements

- R1. Views are first-class routes with header tab navigation; the existing page becomes the Simulation view unchanged in behavior.
- R2. The model registry/selector stays as-is but the selector moves into the Simulation view (it is simulation-view-specific).
- R3. `SimulationCanvas` accepts an optional `model` prop (falls back to `ModelContext`) so any view can render any model/renderer.
- R4. The EHT renderer exposes parameterized draw helpers (theme + alpha) so other renderers can superimpose EHT scenes with distinct styling; default rendering is unchanged.
- R5. The comparison view runs two fixed EHT scenarios in lockstep on a shared timeline (same `dt`/`t_end`, advanced by step index), with play/pause/step/reset/seek.
- R6. The comparison view renders both scenarios superimposed on one canvas (oscillating in normal colors, averaged tinted/semi-transparent) with per-scenario visibility toggles.
- R7. Per-step statistics are harvested per scenario and plotted below the canvas as multi-series time plots (e.g. AB distance, nucleus-basal distance).
- R8. Scenario definitions live in code (`scenarios.ts`), built from EHT defaults via `mergeWithDefaults`-style merging and schema validation; batch/CLI/CSV remain model-level concerns.

## Architecture

```
src/views/
├── registry.ts               # ViewDefinition: { id, title, path, component }
├── simulation/SimulationView.tsx    # moved from App.tsx AppContent (+ ModelSelector)
└── comparison/
    ├── ComparisonView.tsx    # page: canvas + controls + plots
    ├── scenarios.ts          # ScenarioConfig[] { id, label, buildParams(), palette }
    ├── useLockstepSimulations.ts    # N engines, one rAF loop, shared timeline, stats harvest
    ├── comparisonRenderer.ts # composite ModelRenderer over per-scenario EHT scenes
    └── components/ComparisonControls.tsx, ScenarioPlots.tsx
```

Enabling refactors:
- `src/App.tsx` becomes a thin router consuming the view registry (docs routes unchanged).
- `src/components/layout/Header.tsx` renders nav tabs from the registry.
- `SimulationCanvas` gains `model?: CanvasRenderModel` (structural `{ renderer }` minimum, satisfied by full models).
- `SimulationRenderer.setModel` widened to the structural minimum `{ renderer: ModelRenderer }`.
- `src/models/eht/renderer.ts`: export `EHTThemeColors`, style resolution, and a `renderEHTScene(ctx, state, engineParams, style)` helper covering basal curve, links, cells, tissue lines; `ehtRenderer.render` delegates to it plus force arrow/cell IDs.
- `src/components/plots/LinePlot.tsx`: generic multi-series time plot extracted from `BatchPlot`'s line mode (Observable Plot), with `{ time, value, series }` data.

Shared-function policy: views import EHT internals directly (they are plain side-effect-free modules); move code to `src/core/` only when truly model-agnostic or needed by a second model; parameterize existing functions over copying when semantics match; duplication is acceptable in view-local UI/orchestration, never in simulation math.

Scenario details:
- Oscillating: `general.formulas.perimeter = sinwave(t, period=1/(bpm*60), from=init_value*(1-amp), to=init_value*(1+amp))` with `bpm=120`, `amp=0.10` (matches the existing `cyclic_stretch_10_percent_110_bpm` formula preset semantics; `t` in hours).
- Averaged: constant perimeter (no formula) plus adapted stiffness placeholders (to be tuned by researchers).
- Both: identical seed, `dt`, `t_end`, and geometry so lockstep stepping by index keeps scenarios time-aligned; `dt` sized to resolve the heartbeat (steps-per-cycle knob).

## Phases

1. Scaffolding: view registry, routes, header tabs, move `AppContent` → `SimulationView`, move `ModelSelector`.
2. Canvas decoupling: optional `model` prop with context fallback.
3. EHT renderer: styled, exported draw helpers (no visual change).
4. Comparison MVP: scenarios + lockstep hook + composite renderer + canvas + controls.
5. Plots: `LinePlot` extraction + `ScenarioPlots` fed from harvested stats.
6. Docs: AGENTS.md section on views vs. models.

## Non-goals

- No changes to the engine, registry semantics, batch, CLI, CSV, or EHT simulation math.
- No parameter editing UI in the comparison view (fixed scenarios in code; a compact panel may come later).
- No new registered models.

## Verification

- `npx tsc --noEmit`, `npm run build`, `npm run test` after each phase.
- Existing SimulationCanvas/renderer tests must pass unchanged.
- Manual: header tabs navigate; Simulation view behaves as before; Comparison view plays both scenarios in sync, superimposed, with plots updating.
