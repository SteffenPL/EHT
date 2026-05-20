---
date: 2026-05-19
topic: parameter-editor-scroll-and-maximize
---

# Parameter Editor Scroll and Maximize

## Summary

Improve the Parameters & Ranges editor so parameter editing feels like one coherent workspace: one vertical scroll path in the inline view, an inline Extend control for more page space, and a Maximize control for focused large-dialog editing.

---

## Problem Frame

The current Parameters & Ranges area can contain nested fixed-height regions. In particular, the Cell Types table can scroll inside its own assigned area while the surrounding tab or parameter panel also scrolls. This creates a double-scroll experience that makes large parameter sets harder to scan, compare, and edit.

The same area is also dense enough that users sometimes need more working room than the default sidebar-style panel provides. A clearer size model would let users choose between a compact inline editor, an expanded inline editor, and a large focused modal without changing the underlying configuration workflow.

---

## Actors

- A1. Simulation user: Edits model parameters, cell types, parameter ranges, and batch sampling configuration.
- A2. Implementer: Plans and builds the UI changes while preserving existing parameter editing behavior.

---

## Key Flows

- F1. Inline parameter editing
  - **Trigger:** A simulation user opens the Parameters & Ranges panel.
  - **Actors:** A1
  - **Steps:** The user chooses a parameter tab, scrolls through content, edits values, and moves between parameter groups without encountering nested vertical scrollbars inside the editor body.
  - **Outcome:** The inline editor remains compact enough for normal use while providing one predictable scroll path.
  - **Covered by:** R1, R2, R3, R6

- F2. Extend inline workspace
  - **Trigger:** A simulation user wants more room but does not want to leave the page context.
  - **Actors:** A1
  - **Steps:** The user clicks Extend, the inline Parameters & Ranges editor grows vertically, and the user continues editing with the same live configuration.
  - **Outcome:** The page offers more editing space without opening a modal or creating a second draft state.
  - **Covered by:** R4, R6, R8

- F3. Maximize focused workspace
  - **Trigger:** A simulation user needs a larger focused view for parameters or ranges.
  - **Actors:** A1
  - **Steps:** The user clicks Maximize, edits the same Parameters & Ranges experience in a large modal dialog, then closes the modal and returns to the page.
  - **Outcome:** The modal provides more room while preserving edits and keeping behavior consistent with the inline editor.
  - **Covered by:** R5, R6, R7, R8

---

## Requirements

**Scroll Model**
- R1. The inline Parameters & Ranges editor must expose only one vertical scrollbar for the main parameter-editing area.
- R2. Parameter tabs and dense parameter sections, including Cell Types, must not introduce their own nested vertical scroll regions inside the main parameter editor.
- R3. Horizontal overflow for wide content, such as multi-column cell type tables, may remain available when needed, but it must not create a second vertical scrolling experience.

**Sizing Controls**
- R4. The inline editor must provide an Extend control below the parameter area that grows the editor vertically on the page.
- R5. The Parameters & Ranges view must provide a Maximize control that opens a large modal dialog for focused editing.
- R6. Extend and Maximize must be distinct behaviors: Extend grows the inline editor, while Maximize opens the large modal.

**Editing Behavior**
- R7. The maximized modal must edit the same live configuration as the inline view, not a detached draft that requires a separate apply step.
- R8. Values edited in inline, extended, or maximized mode must remain consistent when switching between those modes.

**Visual Consistency**
- R9. Layout, card, and tab changes are in scope when they directly support a clearer Parameters & Ranges editing experience.
- R10. The result should preserve the existing functional surface of loading, saving, sharing, presets, parameter editing, ranges, and batch sampling.

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given the user opens Cell Types inside Parameters & Ranges, when the table content exceeds the visible height, the user scrolls the main editor area rather than a nested vertical table container.
- AE2. **Covers R3.** Given the Cell Types table is wider than the available panel, when the user needs hidden columns, horizontal scrolling remains available without adding an inner vertical scrollbar.
- AE3. **Covers R4, R6.** Given the inline editor is in its default size, when the user clicks Extend, the parameter area grows inline and no modal opens.
- AE4. **Covers R5, R7, R8.** Given the user changes a parameter in the maximized modal, when the user closes the modal, the inline view reflects the same changed value.

---

## Success Criteria

- Users can edit large parameter sections without fighting double vertical scrollbars.
- The size controls are understandable from behavior alone: Extend means more inline room, Maximize means focused modal.
- Planning can proceed without inventing the intended scroll model, sizing behavior, or live-editing semantics.

---

## Scope Boundaries

- Broad redesign of the whole application shell is out of scope.
- Changes to app cards, spacing, tab layout, or panel structure are allowed when they directly improve the Parameters & Ranges experience.
- Changes to parameter schemas, simulation semantics, batch range generation, or TOML import/export behavior are out of scope.
- Modal editing should reuse the same conceptual editor experience rather than introducing a separate wizard or alternate parameter editor.

---

## Key Decisions

- Extend is inline: It gives users more room without changing context.
- Maximize is modal: It supports focused editing when the inline panel is too constrained.
- Modal edits are live: This avoids an extra apply/cancel model and keeps all editor modes consistent.
- Scroll consistency takes priority over preserving current fixed-height inner panels.

---

## Dependencies / Assumptions

- The existing parameter editing, range editing, preset, and file-operation behavior remains the source of truth.
- The modal can share the same configuration state as the inline editor.
- Some horizontal scrolling may still be necessary for wide parameter tables.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R4][Technical] What exact expanded height should Extend use, and should it be reversible via the same control?
- [Affects R5][Technical] What modal dimensions and responsive behavior best fit the existing UI system?
