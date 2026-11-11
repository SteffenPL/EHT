# Comparison Timing Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Comparison to configure one shared end time and separate timestep and physics substeps per scenario, defaulting to a six-hour run.

**Architecture:** Keep a shared physical-time playback axis and shared `t_end`, while each scenario advances on its own `dt` and `n_substeps`. Store each scenario's actual timestamps with its state and statistics history, display its latest computed state at a shared time, and plot using those timestamps.

**Tech Stack:** React 18, TypeScript, existing EHT parameter definitions, shadcn inputs.

**Spec:** User request in conversation: expose shared `t_end`, different per-scenario timestep sizes, and substep count; default `t_end` to 6 h. Plot all recorded steps, show oscillations clearly, add a toggleable moving-average oscillating series using the averaged model's `dt` as its window and output interval, and use a zero lower y-limit with a margin above the data maximum.

## Global Constraints

- Keep comparison scenarios out of the model registry.
- Preserve deterministic shared initial seeds and existing scenario definitions.
- Do not add or run tests unless requested.
- Provide one shared `t_end` defaulting to 6 hours, with independent `dt` and `n_substeps` values per scenario; the oscillating `dt` defaults to 0.0001 hours, and the averaged `dt` defaults to the EHT standard of 0.1 hours.
- Accept scenario timesteps down to `1e-7` hours.
- Keep the shared playback timeline and each retained scenario history at or below 100,000 frames, thinning retained histories by half when they exceed the limit.

## Review Focus

- Both scenarios retain identical `t_end` values after edits.
- Scenario runs with different `dt` values reach and display the correct shared physical time.
- Changing timing controls rebuilds engines and clears stale state/statistics history.
- Zero, negative, or non-finite timing inputs are rejected or clamped before simulation.
- Both averaged and oscillating series remain visible at their actual sample times.
- Plot y-domains begin at zero and leave headroom above the largest visible value.

## Files

- Modify `src/views/comparison/scenarios.ts` for six-hour defaults and per-scenario timing values.
- Modify `src/views/comparison/useLockstepSimulations.ts` for independent clocks, shared-time playback/seek, and per-scenario histories.
- Modify `src/views/comparison/components/ComparisonControls.tsx` and `ComparisonView.tsx` to expose shared `t_end` and per-scenario timing controls.
- Modify `src/views/comparison/components/ScenarioPlots.tsx` to plot every recorded timestamp and set data-based y-limits.
- Modify `src/views/comparison/comparisonRenderer.ts` only as needed to keep canvas params coherent with scenario timing.

## Tasks

### Task 1: Timing definitions and controls

- [ ] Set scenario timing defaults to `t_end = 6`, current oscillation `dt` for oscillating, `dt = 0.1` for averaged, and `n_substeps = 10` for both.
- [ ] Add one shared `t_end` control and per-scenario `dt` and `n_substeps` controls, with finite positive validation and integer substeps; preserve editable numeric drafts until commit so small decimal timesteps can be entered.
- [ ] Rebuild definitions when a valid value changes so simulation history resets using updated params.

### Task 2: Independent scenario clocks

- [ ] Replace the shared-frame advancement in `useLockstepSimulations` with per-scenario frame/time histories and per-scenario completion bounds; cap playback frames and incrementally thin retained histories at 100,000 samples.
- [ ] Use the shared `t_end` value for playback; choose a playback resolution that keeps the timeline within the frame limit while advancing each scenario at its own timestep.
- [ ] Preserve start, pause, step, reset, catch-up, and completion behavior on the shared physical timeline.

### Task 3: Timestamped comparison display and plots

- [ ] Return per-scenario timestamped state and statistics histories from the hook.
- [ ] Plot every scenario at every recorded timestamp and add an optional oscillating moving average with window and output interval equal to the averaged scenario `dt`.
- [ ] Set each y-domain to zero through the data maximum plus a 5% margin.
- [ ] Ensure composite rendering uses each scenario's latest state at or before shared playback time.

### Task 4: Review and verification

- [ ] Inspect the final diff for stale shared-`dt` assumptions and timing edge cases.
- [ ] Do not execute tests or add tests unless the user asks.
