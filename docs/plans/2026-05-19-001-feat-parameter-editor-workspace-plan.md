---
title: "feat: Improve parameter editor workspace"
type: feat
status: completed
date: 2026-05-19
origin: docs/brainstorms/2026-05-19-parameter-editor-scroll-and-maximize-requirements.md
---

# feat: Improve parameter editor workspace

## Summary

Refactor the Parameters & Ranges editor into a reusable workspace that can render compact inline, extended inline, and maximized modal presentations while sharing one live configuration state. The plan removes nested vertical scrolling from the parameter tabs, preserves horizontal overflow for wide tables, and adds focused UI coverage for the new sizing behavior.

---

## Problem Frame

The current editor constrains the model parameter panel inside fixed-height containers, and dense sections such as Cell Types add their own scrolling. Users can end up managing more than one vertical scrollbar while editing related parameter content (see origin: docs/brainstorms/2026-05-19-parameter-editor-scroll-and-maximize-requirements.md).

---

## Requirements

- R1. The inline Parameters & Ranges editor exposes one main vertical scroll path for parameter editing.
- R2. Parameter tabs and dense sections, including Cell Types, do not add nested vertical scroll regions inside that main editor.
- R3. Wide content may keep horizontal overflow when needed without adding an inner vertical scrollbar.
- R4. The inline editor provides an Extend control that grows the editor vertically on the page.
- R5. The Parameters & Ranges view provides a Maximize control that opens a large modal dialog.
- R6. Extend and Maximize remain distinct behaviors: Extend is inline; Maximize is modal.
- R7. The maximized modal edits the same live configuration as the inline view.
- R8. Values stay consistent when switching between compact, extended, and maximized modes.
- R9. Layout, card, tab, and spacing changes are allowed when they directly improve the Parameters & Ranges experience.
- R10. Existing load, save, share, preset, parameter editing, ranges, and batch sampling behavior is preserved.

**Origin actors:** A1 (simulation user), A2 (implementer)
**Origin flows:** F1 (inline parameter editing), F2 (extend inline workspace), F3 (maximize focused workspace)
**Origin acceptance examples:** AE1 (single vertical scroll for Cell Types), AE2 (horizontal overflow for wide Cell Types), AE3 (Extend grows inline), AE4 (modal edits live configuration)

---

## Scope Boundaries

- Broad redesign of the whole application shell remains out of scope.
- Layout, card, tab, and spacing cleanup is in scope only when it directly supports the parameter editor workspace.
- Parameter schemas, simulation semantics, batch range generation, and TOML import/export behavior remain unchanged.
- The maximized modal reuses the same editor experience rather than introducing a wizard, staged draft, or alternate parameter editing flow.
- The plan adds the smallest practical DOM test setup for this feature; broader frontend test infrastructure cleanup is deferred.

---

## Context & Research

### Relevant Code and Patterns

- `src/components/params/ParameterConfigView.tsx` currently owns the Parameters & Ranges card, file actions, preset selector, fixed-height `ModelParameterPanel`, `ParameterRangeList`, and batch sampling controls.
- `src/components/params/ModelParameterPanel.tsx` currently wraps several tab bodies in `ScrollArea` and uses `overflow-auto` on Cell Types and Events tab content.
- `src/models/eht/ui/CellTypesTab.tsx` currently adds `overflow-x-auto overflow-y-auto max-h-[600px]` around the table, causing the nested vertical scroll behavior called out in the origin document.
- `src/components/batch/ParameterRangeList.tsx` already renders without an internal scroll container and should remain part of the unified editor flow.
- `src/components/params/FormulaEditorDialog.tsx` provides the best local large-dialog pattern: Radix `Dialog`, `DialogContent` sized with viewport constraints, a header/action area, and a single scrollable body.
- `src/components/ui/dialog.tsx`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, and `src/components/ui/tabs.tsx` provide existing shadcn/Radix-style primitives.
- `src/App.tsx` places `ParameterConfigView` in the right column of the main grid, so inline extension should work within that grid rather than changing app routing.

### Institutional Learnings

- No `docs/solutions/` learnings were present during planning.

### External References

- External research was not needed. This change follows existing React, Tailwind, Radix Dialog, and local component patterns already present in the repository.

---

## Key Technical Decisions

- Shared editor body: Extract the repeated editor body from `ParameterConfigView` so compact, extended, and maximized presentations render the same controls against the same props and state.
- Single vertical owner: Make the parameter workspace body the vertical scroll owner; remove nested vertical scroll from model tabs and Cell Types while retaining horizontal overflow where content is wider than the panel.
- Reversible Extend: Treat Extend as a toggle so users can return to the compact inline editor without reloading the page or closing a modal.
- Live modal edits: Open the maximized dialog against the same `config` and `onConfigChange` path, avoiding an Apply/Cancel draft model.
- Minimal UI test harness: Add focused DOM component tests for this feature rather than broad frontend testing infrastructure.

---

## Open Questions

### Resolved During Planning

- Exact expanded height for Extend: Use a larger viewport-aware inline height that is reversible via the same control. The implementer may tune the final class values during visual verification.
- Modal dimensions and responsiveness: Follow the large-dialog pattern used by the formula editor, with near-full viewport width, high viewport max-height, a fixed header, and one scrollable body.

### Deferred to Implementation

- Final Tailwind height classes: Choose the exact compact and expanded height constraints after checking desktop and mobile rendering.
- Whether the Events tab needs any additional local layout adjustment after removing nested scroll wrappers: decide while visually verifying affected tabs.

---

## Implementation Units

### U1. Add a Shared Parameter Workspace Body

**Goal:** Separate the Parameters & Ranges editor contents from the card shell so the same body can render inline and inside a modal.

**Requirements:** R5, R7, R8, R10; supports F3 and AE4

**Dependencies:** None

**Files:**
- Modify: `src/components/params/ParameterConfigView.tsx`
- Test: `src/components/params/ParameterConfigView.test.tsx`

**Approach:**
- Extract the file toolbar, preset selector, model parameter panel, range list, and batch sampling controls into an internal reusable body component or equivalent local composition.
- Keep file input refs, import state, link-copy state, and all change handlers owned by `ParameterConfigView` so behavior remains unchanged.
- Pass sizing or presentation flags into the body only for layout concerns; do not introduce separate config state for modal editing.

**Patterns to follow:**
- Keep the existing `ParameterConfigView` data flow: `handleParamsChange`, `handleRangesChange`, `handleTimeSamplesChange`, and `handleSeedsChange` continue to call `onConfigChange`.
- Mirror the compact toolbar style already used in the current component.

**Test scenarios:**
- Happy path: render the editor body with default config, change a general parameter value, and assert `onConfigChange` receives updated `params` while preserving batch configuration.
- Happy path: add or update a parameter range through the shared body and assert `onConfigChange` receives updated `parameterRanges`.
- Integration: render inline and modal presentations from the same `config`; a value changed in one presentation is reflected when the component re-renders with the updated config.

**Verification:**
- Existing load, save, share, preset, parameter editing, ranges, and batch sampling controls remain visible and wired through the same callback path.

---

### U2. Normalize the Inline Scroll Model

**Goal:** Remove nested vertical scrolling from parameter tabs and dense sections so the inline editor has one vertical scroll path.

**Requirements:** R1, R2, R3, R9; supports F1, AE1, and AE2

**Dependencies:** U1

**Files:**
- Modify: `src/components/params/ParameterConfigView.tsx`
- Modify: `src/components/params/ModelParameterPanel.tsx`
- Modify: `src/models/eht/ui/CellTypesTab.tsx`
- Test: `src/components/params/ParameterConfigView.test.tsx`

**Approach:**
- Make the inline parameter workspace body responsible for vertical overflow.
- Remove `ScrollArea` wrappers and vertical `overflow-auto` behavior from `ModelParameterPanel` tab contents so tab panels expand naturally inside the workspace body.
- Remove the vertical max-height wrapper from `EHTCellTypesTab` while preserving horizontal overflow for the table.
- Keep tab headers sticky only if implementation proves it is necessary for usability; the primary requirement is one vertical scroll owner.

**Patterns to follow:**
- Continue using existing Radix Tabs primitives from `src/components/ui/tabs.tsx`.
- Preserve the Cell Types table structure and editing controls; this unit changes containment and overflow, not table semantics.

**Test scenarios:**
- Happy path: Cell Types content renders without an element that combines vertical overflow with a fixed max-height.
- Covers AE1. Given Cell Types content exceeds the visible inline area, the main parameter workspace is the scrollable vertical container.
- Covers AE2. Given Cell Types columns exceed the available width, the table still supports horizontal overflow without adding an inner vertical scrollbar.

**Verification:**
- Visual inspection shows only one vertical scrollbar within the inline Parameters & Ranges editor.
- Horizontal scrolling remains available for wide Cell Types tables.

---

### U3. Add Reversible Inline Extend Control

**Goal:** Add an Extend control below the parameter area that toggles the inline editor between compact and expanded heights.

**Requirements:** R4, R6, R8, R9; supports F2 and AE3

**Dependencies:** U1, U2

**Files:**
- Modify: `src/components/params/ParameterConfigView.tsx`
- Test: `src/components/params/ParameterConfigView.test.tsx`

**Approach:**
- Add local state for inline expansion in `ParameterConfigView`.
- Place the Extend control below the parameter workspace area, not inside a nested scrollable table or tab region.
- Use icon-plus-label button styling consistent with the existing compact toolbar. The control label should reflect the current state, such as Extend vs Collapse.
- Keep extension as a layout-only state: it must not affect config serialization, model params, ranges, or batch sampling.

**Patterns to follow:**
- Use lucide icons already available in the project.
- Follow current button sizing and variant conventions in `ParameterConfigView`.

**Test scenarios:**
- Covers AE3. Given compact inline mode, clicking Extend increases the inline editor container state and does not open the modal.
- Happy path: clicking the expanded-state control returns the editor to compact mode.
- Edge case: toggling Extend after editing a parameter does not reset or discard the edited value.

**Verification:**
- The inline editor grows on the page and remains within the application grid.
- The control is reachable below the parameter area and its behavior is visually distinct from Maximize.

---

### U4. Add Maximized Modal Presentation

**Goal:** Add a Maximize control that opens the same Parameters & Ranges editor experience in a large focused modal.

**Requirements:** R5, R6, R7, R8, R10; supports F3 and AE4

**Dependencies:** U1, U2

**Files:**
- Modify: `src/components/params/ParameterConfigView.tsx`
- Test: `src/components/params/ParameterConfigView.test.tsx`

**Approach:**
- Add local modal-open state in `ParameterConfigView`.
- Render the shared editor body inside a Radix `Dialog` using the large-dialog layout pattern from the formula editor: constrained viewport width, high max-height, a non-scrolling header, and one scrollable body.
- Put Maximize near the Parameters & Ranges title or editor controls where it is discoverable but separate from Extend.
- Ensure modal closing does not discard edits because edits flow through the same live `onConfigChange` path.

**Patterns to follow:**
- Follow `src/components/params/FormulaEditorDialog.tsx` for large modal sizing and internal scroll layout.
- Use dialog primitives from `src/components/ui/dialog.tsx`.

**Test scenarios:**
- Happy path: clicking Maximize opens a dialog containing the Parameters & Ranges editor.
- Covers AE4. Given a parameter is changed while maximized, closing the modal and re-rendering inline shows the same changed value.
- Edge case: opening the modal while inline mode is extended does not require a separate draft or reset inline extension state.
- Integration: modal content preserves range and batch sampling controls, not only model parameters.

**Verification:**
- The modal provides more usable editing space than compact inline mode.
- The modal has one vertical scrollable body and no nested vertical scrollbars inside parameter tabs.

---

### U5. Add Focused UI Test Support

**Goal:** Add the smallest practical DOM test setup needed to protect the parameter workspace behavior.

**Requirements:** R1, R4, R5, R7, R8, R10

**Dependencies:** None

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vitest.config.ts`
- Create: `src/components/params/ParameterConfigView.test.tsx`

**Approach:**
- Add a DOM test environment dependency and React DOM testing utilities appropriate for Vitest.
- Keep the default Vitest environment as `node` for existing scientific/core tests; use per-file DOM environment configuration or targeted test config only for UI component tests.
- Build a small render helper that wraps `ParameterConfigView` in the model provider context and imports registered models as needed.
- Prefer behavior assertions over CSS-class snapshots, but include targeted assertions for the scroll-owner contract where behavior cannot be observed otherwise in a DOM test.

**Patterns to follow:**
- Preserve the existing Vitest setup and avoid slowing the current node-based test suite unnecessarily.
- Follow the repository's existing preference for focused, file-local tests.

**Test scenarios:**
- Happy path: `ParameterConfigView` renders with the default model config under the test provider.
- Integration: changing shared editor fields triggers `onConfigChange` with the expected part of the simulation config updated.
- Scroll contract: Cell Types no longer renders with a fixed-height vertical scroll container, while the workspace body owns vertical overflow.
- Mode contract: Extend toggles inline sizing; Maximize opens a dialog; both modes keep edits live.

**Verification:**
- Existing non-DOM tests remain runnable under the node environment.
- New UI tests run under the DOM environment and cover the feature's main regressions.

---

## System-Wide Impact

- **Interaction graph:** The change is contained to the parameter editor UI and model-specific parameter tab layout. Simulation engine, batch execution, TOML parsing, and CSV export are not part of the interaction path.
- **Error propagation:** Existing import error handling and clipboard fallback behavior remain unchanged.
- **State lifecycle risks:** Inline and modal views must share `config` state through the existing callback path; no secondary draft state should be introduced.
- **API surface parity:** No public model, batch, CLI, or export interfaces change.
- **Integration coverage:** Browser or manual visual verification is needed because DOM tests cannot fully prove scrollbar feel, viewport fit, or modal ergonomics.
- **Unchanged invariants:** Loading/saving TOML, importing XLSX, share links, presets, model parameter editing, range editing, time samples, and seed count behavior remain functionally equivalent.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Removing nested scroll containers makes very long tabs feel too tall in compact mode | Keep the workspace body height-constrained and make it the single scroll owner |
| Horizontal Cell Types overflow regresses while fixing vertical scroll | Preserve horizontal overflow on a wrapper that does not own vertical scrolling |
| Modal and inline views drift because they render separate editor implementations | Extract a shared body and pass the same config/change handlers into both presentations |
| Adding DOM tests slows or destabilizes the existing node test suite | Keep node as the default Vitest environment and scope DOM setup to UI tests |
| Exact height choices feel awkward on mobile or wide desktop | Treat height classes as implementation-time tuning and verify visually at representative viewport sizes |

---

## Documentation / Operational Notes

- No user-facing documentation updates are required unless implementation changes visible labels beyond Extend, Collapse, or Maximize.
- Before handoff, verify the UI in a browser at desktop and narrow viewports, including Cell Types, Parameters, Ranges, Extend, and Maximize.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-19-parameter-editor-scroll-and-maximize-requirements.md](../brainstorms/2026-05-19-parameter-editor-scroll-and-maximize-requirements.md)
- Related code: `src/components/params/ParameterConfigView.tsx`
- Related code: `src/components/params/ModelParameterPanel.tsx`
- Related code: `src/models/eht/ui/CellTypesTab.tsx`
- Related code: `src/components/batch/ParameterRangeList.tsx`
- Related code: `src/components/params/FormulaEditorDialog.tsx`
