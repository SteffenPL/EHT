---
date: 2026-05-19
topic: parameter-ranges-tab
---

# Parameter Ranges Tab

## Summary

Move Parameter Ranges into the existing parameter editor tab row as a sibling of Parameters, Constants, Cell Types, Events, and Simulation. The ranges editor should feel like part of the same parameter workspace instead of a stacked section below the model parameter tabs.

## Problem Frame

The parameter editor currently mixes two navigation patterns: model settings use tabs, while Parameter Ranges sits as a separate section below them. That makes the panel feel longer and less coherent, especially after the maximize and scroll cleanup work made the tabbed workspace the primary interaction surface.

## Requirements

- R1. Parameter Ranges must appear as a tab in the existing model parameter tab row.
- R2. Selecting the Parameter Ranges tab must show the existing range editor behavior: adding sweep parameters, editing min/max/steps, showing base values, and removing ranges.
- R3. The existing model-specific tabs must remain available and keep their current labels and behavior.
- R4. The file actions, preset selector, maximize behavior, and batch sampling controls must remain outside the model tab content.
- R5. The tab layout must avoid introducing horizontal page overflow; any necessary overflow should stay inside the intended workspace.

## Success Criteria

- Users can switch between ordinary parameter editing and range setup using the same tab row.
- The parameter panel no longer has a standalone Parameter Ranges section below the model parameter tabs.
- A planner can implement the UI change without inventing new navigation structure or moving batch sampling.

## Scope Boundaries

- Batch Sampling remains outside the tab row.
- Batch results, batch execution behavior, and range generation semantics are unchanged.
- No new top-level card tabs are introduced.

## Key Decisions

- Parameter Ranges belongs in the model tab row: this keeps the parameter workspace stable while reducing stacked sections.
- Batch Sampling stays separate: it is related to running batches, but the user only confirmed moving Parameter Ranges.

## Dependencies / Assumptions

- The existing Parameter Ranges editor behavior is correct and should be relocated, not redesigned.
- The model parameter tab row is the right conceptual home for range setup because ranges are chosen from model parameters.
