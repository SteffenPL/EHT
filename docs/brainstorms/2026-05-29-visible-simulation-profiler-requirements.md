---
date: 2026-05-29
topic: visible-simulation-profiler
---

# Visible Simulation Profiler

## Summary

Add an opt-in developer-facing `Profiler` toggle to the visible simulation controls. When enabled, the page records lightweight app-level timings for the currently visible simulation and shows compact readouts inline after the toggle; when disabled, profiling is off and no timing readouts are shown.

---

## Problem Frame

Recent realtime performance work showed that bottlenecks can hide in different layers of the EHT simulation: formula evaluation, force calculation, constraint/collision work, state cloning, and rendering can all contribute to slow frames. Browser-level CPU, GPU, and memory APIs are either unavailable, browser-specific, or too indirect to rely on as the first diagnostic surface.

The useful first step is a low-friction in-app profiler that answers "where is this visible run spending time?" without requiring DevTools, browser-specific APIs, or always-on instrumentation.

---

## Actors

- A1. Developer-user: Runs the EHT simulator interactively and wants quick bottleneck clues while changing parameters, formulas, or realtime mode.
- A2. Implementation planner: Turns the profiler scope into a safe instrumentation and UI plan without expanding into browser telemetry.

---

## Key Flows

- F1. Enable profiling for the visible run
  - **Trigger:** A developer-user wants to diagnose a slow visible simulation.
  - **Actors:** A1
  - **Steps:** The user turns on the `Profiler` toggle near the simulation controls, runs or steps the visible simulation, and watches compact timing readouts update after the toggle.
  - **Outcome:** The user can tell whether recent visible frames are dominated by simulation stepping, formulas, constraints, or rendering.
  - **Covered by:** R1, R2, R3, R4, R7

- F2. Disable profiling for normal use
  - **Trigger:** The developer-user no longer needs diagnostics.
  - **Actors:** A1
  - **Steps:** The user turns off the `Profiler` toggle.
  - **Outcome:** Profiling stops, the inline timing readouts disappear, and normal simulation work avoids profiler overhead.
  - **Covered by:** R2, R5, R6

---

## Requirements

**Profiler Control**

- R1. The visible simulation controls must include a `Profiler` toggle after the `On param change` control.
- R2. Profiling must be opt-in: timings are recorded only while the `Profiler` toggle is active.
- R3. When profiling is active, compact timing readouts must appear inline after the toggle.
- R4. When profiling is inactive, no profiler timing readouts should be visible.

**Timing Readouts**

- R5. The profiler must focus on browser-independent app-level timings rather than OS-level CPU, GPU, or process telemetry.
- R6. The profiler should include the most useful timings for diagnosing visible simulation bottlenecks, such as frame time, simulation step time, force evaluation time, formula evaluation time, constraint/collision time, and render time.
- R7. The exact displayed timing set may be adjusted during planning or implementation if adjacent measurements are more accurate or more actionable.
- R8. Timing values should be summarized in a way that is stable enough to read during an active run, such as a short rolling average or recent-sample view.

**Scope and Overhead**

- R9. Profiling applies only to the currently visible single simulation, not batch runs, exports, hidden simulations, or background tabs.
- R10. Profiling should add little to no overhead while disabled.
- R11. Profiling overhead while enabled should remain small enough that the profiler does not become the dominant source of slowdown for ordinary debugging scenarios.

**Memory Signals**

- R12. Browser-independent memory display is optional and should prefer app-owned proxies, such as formula cache size, state history length, cell count, or tracked renderer object counts.
- R13. Browser-specific heap memory may be shown only when a safe API is available, and it must be clearly labeled as browser-specific or approximate.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given the simulation controls are visible and profiling is off, when the user enables `Profiler`, timing labels appear after the toggle and begin updating from the visible simulation.
- AE2. **Covers R2, R4, R10.** Given profiling is active, when the user disables `Profiler`, timing labels disappear and subsequent visible simulation frames are not profiled.
- AE3. **Covers R5, R6, R7.** Given a formula-heavy realtime run becomes slow, when profiling is enabled, the displayed timings make formula or force-related cost visible without relying on browser CPU/GPU usage APIs.
- AE4. **Covers R9.** Given a batch export or hidden/offscreen rendering path exists, when profiling is enabled in the single-simulation UI, only the visible single simulation contributes samples to the profiler readouts.
- AE5. **Covers R12, R13.** Given the current browser cannot expose heap memory safely, when profiling is enabled, the profiler may still show app-owned proxies and must not imply that exact process memory is available.

---

## Success Criteria

- A developer can turn on the profiler during a slow visible run and quickly identify the likely bottleneck category.
- Normal simulation usage is unaffected when the profiler is off.
- The UI stays compact enough to live beside existing simulation controls.
- Planning can proceed without inventing whether this is a browser telemetry dashboard or an app-level timing tool.

---

## Scope Boundaries

- OS-level CPU usage, GPU usage, GPU memory, and process memory monitors are out of scope for the first version.
- Browser-dependent APIs are not required for the first version.
- Batch runs, CSV export, video export, screenshots, and hidden/offscreen rendering are out of scope for profiler sampling.
- Persistent profiler logs, exportable profiling traces, and historical charts are out of scope for the first version.
- The profiler is developer-facing; it does not need polished end-user explanations or scientific reporting language.

---

## Key Decisions

- **App-level timings over system telemetry:** The profiler should diagnose bottleneck categories inside code the app controls instead of chasing unreliable browser CPU/GPU access.
- **Toggle-gated instrumentation:** Profiling should happen only while enabled so normal runs do not pay diagnostic overhead.
- **Visible simulation only:** The first version should answer questions about the run the developer is watching, not every execution path in the app.
- **Memory is conservative:** Useful app-owned proxies are acceptable; exact memory numbers are optional and browser-dependent.

---

## Dependencies / Assumptions

- The simulation loop, EHT timestep, force calculations, formula evaluation, constraints, and renderer can expose timing boundaries without changing simulation semantics.
- `performance.now()` is sufficient for the first version's timing precision.
- Some timing names may shift during planning if the current code's boundaries make a slightly different grouping more accurate.

---

## Sources / Research

- Existing controls context: `src/components/simulation/SimulationControls.tsx`
- Visible simulation loop context: `src/hooks/useSimulation.ts`
- EHT timestep and force context: `src/models/eht/simulation/step.ts`, `src/models/eht/simulation/forces.ts`
- Rendering context: `src/rendering/SimulationRenderer.ts`
- Prior learning: `docs/solutions/performance-issues/realtime-formula-rendering-performance.md`
- Browser API caveat: `performance.memory` is non-standard/deprecated, while richer memory and GPU timing APIs are browser-dependent.
