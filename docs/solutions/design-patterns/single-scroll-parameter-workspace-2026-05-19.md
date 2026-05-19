---
title: Single Scroll Owner for Dense Parameter Workspaces
date: 2026-05-19
category: design-patterns
module: Parameters & Ranges UI
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - Building dense React editors with nested tabs, tables, or modal variants
  - Reusing the same form controls across inline and maximized presentations
  - Fixing double-scroll behavior in parameter-heavy UI panels
tags: [react, ui-layout, scroll-ownership, modal-editing, parameter-editor]
---

# Single Scroll Owner for Dense Parameter Workspaces

## Context

The Parameters & Ranges panel had multiple competing vertical scroll regions. The overall parameter area had a fixed-height container, `ModelParameterPanel` wrapped some tab bodies in `ScrollArea` or `overflow-auto`, and the EHT Cell Types table added its own `max-h` plus vertical overflow. In practice, users could end up scrolling inside the Cell Types assignment area and then scrolling the surrounding parameter tab as a separate region.

The same editor also needed two size modes: an inline expansion for staying in page context and a maximized modal for focused editing. The risk was duplicating the editor or creating a draft/apply model that would drift from the inline state.

## Guidance

For dense editor panels, choose one component as the vertical scroll owner and make nested sections expand naturally inside it. Keep horizontal overflow local only for genuinely wide content.

In this app, the useful shape was:

- `ParameterConfigView` owns the vertical scroll container for the Parameters & Ranges workspace.
- `ModelParameterPanel` renders tabs and tab bodies without additional vertical `ScrollArea` wrappers.
- `CellTypesTab` keeps `overflow-x-auto` for wide tables but removes its vertical `overflow-y-auto max-h[...]` wrapper.
- Inline compact mode, inline extended mode, and modal mode all render the same shared editor body against the same `config` and `onConfigChange` path.
- The maximized dialog mounts the editor body while the inline body is temporarily unmounted, avoiding duplicate input IDs and shared file-input refs behind the overlay.

The important distinction is layout state versus data state:

```tsx
// Directional sketch, not exact production code
const body = <ParameterConfigBody config={config} onConfigChange={onConfigChange} />;

return (
  <>
    <div className="overflow-y-auto">
      {!isMaximized && body}
    </div>

    <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
      <DialogContent>
        <div className="overflow-y-auto">{body}</div>
      </DialogContent>
    </Dialog>
  </>
);
```

Extend/Collapse should only alter inline height. Maximize should only alter presentation. Neither should serialize into simulation config or create a second copy of the editor state.

## Why This Matters

Double-scroll editors are hard to operate because users lose track of which area currently owns wheel or trackpad input. Tables are especially painful: a fixed-height table can hide controls while the surrounding tab also looks scrollable.

Sharing one editor body also prevents state drift. If inline and modal views are separate implementations, future parameter controls must be added twice, tests need to cover two surfaces, and bugs can appear in only one presentation. A shared body with one live config path keeps layout variants cheap.

The subtle accessibility and correctness detail is to avoid mounting two copies of the same form at once when the modal opens. Hidden background copies can duplicate `id` attributes, file input refs, and labels. Temporarily unmounting the inline body while the modal is open keeps the dialog as the only active editor surface.

## When to Apply

- A panel has nested tabs, tables, accordions, or grouped forms and more than one vertical scrollbar appears.
- A large editor needs both inline and modal presentations.
- The modal is meant to edit live state rather than stage a draft.
- DOM tests need to protect layout behavior that browser users experience as scroll ownership.

## Examples

Before:

- A parameter card constrained `ModelParameterPanel` with a fixed height.
- Individual tabs added `ScrollArea` or `overflow-auto`.
- Cell Types added another fixed-height vertical scroll wrapper.
- A modal version would have required duplicating the editor or risking duplicate mounted controls.

After:

- The parameter workspace has one `overflow-y-auto` owner.
- Model tabs and Cell Types expand inside that owner.
- Cell Types still has horizontal overflow for wide columns.
- Extend toggles inline height only.
- Maximize opens a large dialog that reuses the same editor body and live change handlers.
- Component tests assert that Extend does not open the modal, the modal contains the same controls, and Cell Types no longer owns vertical overflow.

## Related

- Requirements: `docs/brainstorms/2026-05-19-parameter-editor-scroll-and-maximize-requirements.md`
- Plan: `docs/plans/2026-05-19-001-feat-parameter-editor-workspace-plan.md`
- Implementation touchpoints: `src/components/params/ParameterConfigView.tsx`, `src/components/params/ModelParameterPanel.tsx`, `src/models/eht/ui/CellTypesTab.tsx`
