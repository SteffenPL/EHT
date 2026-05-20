---
date: 2026-05-19
topic: batch-setup-tab
---

# Batch Setup Tab

## Summary

Move batch setup controls into the existing parameter editor tab row as a sibling of Parameters, Constants, Cell Types, Events, and Simulation. The tab should include Parameter Ranges and Batch Sampling so batch configuration feels like one workspace instead of stacked sections below the model parameter tabs.

## Problem Frame

The parameter editor currently mixes two navigation patterns: model settings use tabs, while batch setup controls sit as separate sections below them. That makes the panel feel longer and less coherent, especially after the maximize and scroll cleanup work made the tabbed workspace the primary interaction surface.

## Requirements

- R1. Batch setup must appear as a tab in the existing model parameter tab row.
- R2. Selecting the Batch Setup tab must show the existing range editor behavior: adding sweep parameters, editing min/max/steps, showing base values, and removing ranges.
- R3. The existing model-specific tabs must remain available and keep their current labels and behavior.
- R4. Selecting the Batch Setup tab must show the existing batch sampling controls, including time samples and seeds per configuration.
- R5. The file actions, preset selector, and maximize behavior must remain outside the model tab content.
- R6. The tab layout must avoid introducing horizontal page overflow; any necessary overflow should stay inside the intended workspace.

## Success Criteria

- Users can switch between ordinary parameter editing and batch setup using the same tab row.
- The parameter panel no longer has standalone Parameter Ranges or Batch Sampling sections below the model parameter tabs.
- A planner can implement the UI change without inventing new top-level navigation structure.

## Scope Boundaries

- Batch results, batch execution behavior, and range generation semantics are unchanged.
- No new top-level card tabs are introduced.

## Key Decisions

- Batch setup belongs in the model tab row: this keeps the parameter workspace stable while reducing stacked sections.
- Parameter Ranges and Batch Sampling belong together: both configure how batch runs are generated from the current parameters.

## Dependencies / Assumptions

- The existing Parameter Ranges and Batch Sampling behavior is correct and should be relocated, not redesigned.
- The model parameter tab row is the right conceptual home for batch setup because ranges and samples are derived from the current model parameters.
