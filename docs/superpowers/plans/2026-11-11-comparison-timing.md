# Comparison Timing Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each Comparison scenario to configure its own end time, timestep, and physics substeps, defaulting to a six-hour run.

**Architecture:** Keep a shared physical-time playback axis while each scenario advances on its own `dt` and ends at its own `t_end`. Store each scenario's actual timestamps with its state and statistics history, display its latest computed state at a shared time, and plot using those timestamps.

**Tech Stack:** React 18, TypeScript, existing EHT parameter definitions, shadcn inputs.

**Spec:** User request in conversation: longer comparison run; expose `t_end`, different timestep sizes, and substep count; default `t_end` to 6 h.

## Global Constraints

- Keep comparison scenarios out of the model registry.
- Preserve deterministic shared initial seeds and existing scenario definitions.
- Do not add or run tests unless requested.
- Provide independent `t_end`, `dt`, and `n_substeps` values per scenario; `t_end` defaults to 6 hours, the oscillating `dt` stays at its heartbeat resolution, and the averaged `dt` defaults to the EHT standard of 0.1 hours.
- Keep the shared playback timeline at or below 100,000 frames.

## Review Focus

- Scenario runs with different `dt` values reach and display the correct shared physical time.
- Shorter scenario `t_end` values stop advancing while longer scenarios continue.
- Changing timing controls rebuilds engines and clears stale state/statistics history.
- Zero, negative, or non-finite timing inputs are rejected or clamped before simulation.
- Plot timestamps remain correct when scenarios have different frame counts.

## Files

- Modify `src/views/comparison/scenarios.ts` for six-hour defaults and per-scenario timing values.
- Modify `src/views/comparison/useLockstepSimulations.ts` for independent clocks, shared-time playback/seek, and per-scenario histories.
- Modify `src/views/comparison/components/ComparisonControls.tsx` and `ComparisonView.tsx` to expose and apply per-scenario timing controls.
- Modify `src/views/comparison/components/ScenarioPlots.tsx` to use recorded times rather than a shared `dt`.
- Modify `src/views/comparison/comparisonRenderer.ts` only as needed to keep canvas params coherent with scenario timing.

## Tasks

### Task 1: Per-scenario timing definitions and controls

- [ ] Set scenario timing defaults to `t_end = 6`, current oscillation `dt` for oscillating, `dt = 0.1` for averaged, and `n_substeps = 10` for both.
- [ ] Add numeric controls for each scenario's `t_end`, `dt`, and `n_substeps`, with finite positive validation and integer substeps.
- [ ] Rebuild definitions when a valid value changes so simulation history resets using updated params.

### Task 2: Independent scenario clocks

- [ ] Replace the shared-frame advancement in `useLockstepSimulations` with per-scenario frame/time histories and per-scenario completion bounds; cap valid timing combinations at 100,000 shared frames.
- [ ] Define shared playback `t_end` as the maximum scenario end time and playback resolution as the minimum configured scenario `dt`; map shared frame/time seeks to each scenario's available states.
- [ ] Preserve start, pause, step, reset, catch-up, and completion behavior on the shared physical timeline.

### Task 3: Timestamped comparison display and plots

- [ ] Return per-scenario timestamped state and statistics histories from the hook.
- [ ] Plot every scenario using recorded timestamps, retaining plot sampling behavior.
- [ ] Ensure composite rendering uses each scenario's latest state at or before shared playback time.

### Task 4: Review and verification

- [ ] Inspect the final diff for stale shared-`dt` assumptions and timing edge cases.
- [ ] Do not execute tests or add tests unless the user asks.
