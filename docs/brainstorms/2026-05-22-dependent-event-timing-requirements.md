---
date: 2026-05-22
topic: dependent-event-timing
---

# Dependent Event Timing

## Summary

Introduce a breaking event-timing change where selecting an event dependency automatically makes the dependent event sample its time after the referenced event's sampled time. Probability becomes conditional participation within that dependency chain, so users can express ordered biological event sequences without losing implementation rate to independent random timing.

---

## Problem Frame

The current EHT event system samples each event's trigger time independently, then checks prerequisites at firing time. This is flexible, but it makes common ordered-event scenarios difficult to encode. If event A and event B are both sampled between 6h and 12h, and A requires B, then roughly half of cells will sample A before B. In those cells A's trigger moment passes before its prerequisite is satisfied, so A never fires even when both events have probability 1.

For researchers, that makes probability hard to reason about. A probability of 100% can still produce less than 100% implementation of a dependent event, not because the event was skipped, but because its independently sampled time was incompatible with its dependency. The new behavior should make the dependency itself shape the time window so users can read an event chain as an ordered sampling process.

---

## Actors

- A1. Researcher: configures EHT events and expects probability and dependency settings to map clearly to observed event implementation.
- A2. Implementation planner: turns the product semantics into a concrete parameter, validation, UI, and simulation plan.

---

## Key Flows

- F1. Configure a dependent event
  - **Trigger:** A researcher selects event B as the dependency for event A.
  - **Actors:** A1
  - **Steps:** The event editor makes A's start time derive from B's sampled time, disables manual editing of A's start time, and keeps A's end time editable.
  - **Outcome:** A is sampled from `time(B)` to A's configured end time, and the UI makes that automatic behavior visible.
  - **Covered by:** R1, R2, R3, R8, R9

- F2. Sample a dependent chain for a cell
  - **Trigger:** A cell is created or otherwise receives event states.
  - **Actors:** A1
  - **Steps:** The system decides whether the upstream event participates, samples the upstream event time, then evaluates the dependent event's conditional probability and samples it inside the derived downstream window.
  - **Outcome:** A dependent event with probability 1 happens in every cell where its upstream event exists and its derived time window is valid.
  - **Covered by:** R4, R5, R6, R7, R10

- F3. Correct invalid dependency setup
  - **Trigger:** A researcher creates a circular dependency or a dependent window that cannot produce a valid sampled time.
  - **Actors:** A1
  - **Steps:** The system surfaces the invalid setup before or during configuration instead of silently producing skipped or impossible events.
  - **Outcome:** The researcher can fix the event chain with a clear reason for what is invalid.
  - **Covered by:** R11, R12, R13

---

## Requirements

**Dependency timing semantics**

- R1. Selecting an event dependency must automatically make the dependent event's start time equal to the referenced event's sampled time for that same cell.
- R2. A dependent event must keep its own configured end time, so the derived sampling window is `time(dependency)` through the dependent event's end time.
- R3. A dependent event's manually configured start time must no longer affect sampling while a dependency is selected.
- R4. Probability for a dependent event must be interpreted conditionally: it is evaluated only for cells where the referenced event participates.
- R5. If the referenced event is skipped for a cell, dependent events that reference it must also be skipped for that cell.
- R6. A dependent event with probability 1 and a valid window must occur in every cell where its referenced event occurs.
- R7. Dependent-event sampling must happen in dependency order, so downstream windows are based on already-sampled upstream event times.

**User experience**

- R8. The event editor must make the automatic start-time behavior visible when a dependency is selected.
- R9. The start-time control for a dependent event must be disabled or otherwise clearly non-editable while the dependency controls the start time.
- R10. The event editor should help users read the event in plain language, such as "sample after event B, until 12h; skipped if event B is skipped."

**Validation and edge cases**

- R11. Circular dependencies must be invalid and surfaced to the user.
- R12. A dependent event whose derived start time can be later than its configured end time must be treated as an invalid or explicitly warned configuration, not as a silent skip.
- R13. Missing, renamed, or deleted dependency references must be handled visibly by clearing the dependency or flagging the event as invalid.

**Compatibility and scope**

- R14. The change may be breaking and does not need to fully preserve old event-timing behavior.
- R15. Existing event prerequisites should be reinterpreted through the new automatic dependent-timing behavior rather than remaining a separate hidden firing-time condition.
- R16. The first version should not introduce manual relative-time formulas or a separate sequence/group abstraction.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R8, R9.** Given event A has no dependency, when a researcher selects event B as A's dependency, A's start time displays as derived from `time(B)`, the start field is no longer manually editable, and A's end field remains editable.
- AE2. **Covers R4, R5, R6.** Given B has probability 0.8 and A depends on B with probability 1, when many cells are initialized with valid windows, A occurs in the same cells where B occurs rather than in only the subset where independent timing happened to be compatible.
- AE3. **Covers R2, R7.** Given B samples at 8h and A depends on B with end time 12h, when A participates, A's trigger time is sampled from 8h to 12h.
- AE4. **Covers R5.** Given B is skipped for a cell, when A depends on B, A is skipped for that cell without evaluating A as an independent event.
- AE5. **Covers R11, R12, R13.** Given an event chain contains a loop, an impossible derived window, or a deleted dependency reference, when the configuration is edited or loaded, the user sees a validation state instead of the simulation silently ignoring the problem.

---

## Success Criteria

- Researchers can encode "B happens first, then A happens after B" without losing implementation rate to independently sampled event times.
- Probability reads naturally inside event chains: downstream probability means chance to participate given the upstream event exists.
- The event editor makes the automatic timing behavior visible enough that users do not need to infer it from documentation.
- Invalid dependency graphs or impossible dependent windows are visible before they distort simulation interpretation.
- A downstream planner can implement the breaking behavior without having to choose between prerequisite-only semantics, hidden resampling, and explicit dependent windows.

---

## Scope Boundaries

- Full migration compatibility with old event timing is not required.
- Manual relative-time expressions such as custom formulas in the start or end fields are out of scope for the first version.
- A separate event-sequence or event-group authoring model is out of scope for the first version.
- Hidden resampling that corrects incompatible independent event times is out of scope.
- Global events are not included unless a later plan explicitly decides to apply the same dependency semantics there.

---

## Key Decisions

- Dependency controls timing automatically: selecting a dependency is enough to make the dependent event start at the referenced event's sampled time.
- Probability is conditional in chains: downstream probability is evaluated only after the upstream event exists.
- Skipping propagates downstream by default: if the dependency is absent for a cell, dependent events are absent too.
- The first version favors clarity over maximum expressiveness: automatic start-time derivation is easier to explain than manual relative-time formulas or sequence groups.

---

## Dependencies / Assumptions

- The current EHT event system already has per-event IDs and a single dependency field, so the product surface can reuse the existing concept of dependency while changing its timing semantics.
- The event editor currently presents start time, end time, probability, dependency, and cell phase together, so the changed behavior needs visible UI feedback where users already configure those fields.
- Cell-level event state initialization is the right conceptual moment to decide participation and sampled trigger times for one-shot events.
- Periodic events may need planning-specific treatment because their current start/end fields behave as an active window rather than a one-shot sampled trigger time.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R12][Technical] Decide whether impossible derived windows should block saving, block running, or warn while treating the dependent event as skipped.
- [Affects R15][Technical] Confirm how periodic events should behave when a dependency is selected, especially whether dependency controls first activation only or the whole active window.
- [Affects R13][Technical] Decide the exact load-time behavior for legacy files whose dependency references no longer resolve.
