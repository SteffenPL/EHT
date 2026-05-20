---
date: 2026-05-20
topic: v2-micron-parameter-format
---

# V2 Micron Parameter Format

## Summary

Introduce a breaking v2 parameter-file format where length-like EHT parameters are stored and shown in microns, while the current simulation engine keeps running through a compatibility adapter. Migrated parameter files should produce the same effective trajectories as before the format change, with Eric's curated presets corrected so their physical perimeter values match their promised setup names.

---

## Problem Frame

The EHT simulator currently mixes two length interpretations. Some parameters are effectively stored in legacy units where one internal unit represents 5 microns, while other parameter sets already appear to use micron-valued perimeters and radii. That ambiguity makes parameter files hard to read, makes preset names misleading in some cases, and leaves the UI unable to clearly say what a length value means.

The goal of this first v2 step is compatibility, not a physics rewrite. Researchers should be able to load, migrate, save, and run parameter files using micron-facing values without changing the behavior of the current simulation. A later step can move the engine itself to micron-native calculations and retune any model constants that need retuning.

---

## Actors

- A1. Researcher: loads, edits, compares, and shares EHT parameter files and expects values to correspond to physical microns.
- A2. Preset curator: reviews bundled presets, especially Eric's parameter sets, and chooses physically meaningful v2 values that preserve intended behavior.
- A3. Implementation planner: turns this requirements document into a concrete migration and adapter plan without having to rediscover the unit boundary.

---

## Key Flows

- F1. Legacy parameter file migration
  - **Trigger:** A researcher loads or updates a pre-v2 parameter file.
  - **Actors:** A1
  - **Steps:** The system detects the legacy format, migrates length-like stored values to micron-facing v2 values, preserves non-length behavior, and records that the active configuration is now v2.
  - **Outcome:** The file can be edited and saved as v2 while producing the same effective simulation as the legacy file.
  - **Covered by:** R1, R2, R4, R5, R7

- F2. Compatibility-mode simulation run
  - **Trigger:** A researcher runs a v2 parameter set before the engine is rewritten to be micron-native.
  - **Actors:** A1
  - **Steps:** The system converts v2 micron-facing values into the current engine's legacy length scale at the simulation boundary, evaluates formulas in a compatibility-preserving context, and runs the existing mechanics unchanged.
  - **Outcome:** The resulting trajectory matches the equivalent legacy run within numerical tolerance.
  - **Covered by:** R3, R6, R8, R9, R10

- F3. Eric preset curation
  - **Trigger:** A bundled Eric preset has a promised physical perimeter in its folder or label that does not match a behavior-preserving raw migration.
  - **Actors:** A2
  - **Steps:** The curator treats the promised perimeter as authoritative, derives equivalent v2 length values that preserve the normalized trajectory under compatibility mode, and marks any manual formula or preset assumptions.
  - **Outcome:** The curated preset says the physical perimeter it promises and still behaves like the intended preset.
  - **Covered by:** R11, R12, R13

---

## Requirements

**V2 parameter format and units**

- R1. The EHT parameter-file format must advance to `2.0.0` for the micron-facing length change.
- R2. V2 parameter files must store the primary length fields in microns: `general.w_init`, `general.h_init`, `general.perimeter`, `cell_types.*.R_soft`, `cell_types.*.R_hard`, and `cell_types.*.R_hard_div`.
- R3. The 5 micron legacy calibration must be represented as an explicit compatibility boundary, not inferred from `R_soft` or any per-cell-type value.
- R4. Other length-like parameters that interact directly with the migrated fields should be treated consistently in v2, including screen bounds, junction distances, cytoskeleton maximum length, running speed, and compatible batch range values.
- R5. Loaded and saved parameter files must make the active parameter format version visible through metadata, and v2 saves must not silently write legacy-scaled values.

**Compatibility adapter**

- R6. Running a migrated v2 parameter set through the current engine must preserve the effective legacy simulation values before mechanics are evaluated.
- R7. A migrated legacy file without manually changed formulas should produce the same trajectory as the legacy file, allowing only ordinary floating-point tolerance.
- R8. Formula evaluation must preserve existing effective dependencies on `R_soft`; if a force or parameter formula depended on `R_soft` before migration, that dependency must remain behaviorally equivalent under compatibility mode.
- R9. The compatibility layer must avoid using `R_soft` as a global scale because `R_soft` is cell-type-specific and may change during simulation.
- R10. The first v2 step must not retune force, stiffness, diffusion, or geometry mechanics for a micron-native engine.

**Formulas and dynamic parameters**

- R11. Arbitrary formulas that target or depend on length-like values must not be auto-rewritten unless equivalence can be guaranteed.
- R12. Formula-bearing files and presets should be flagged for manual curation when migration cannot prove formula equivalence.
- R13. Curated formulas must be allowed to remain or become micron-facing in the saved v2 file while still preserving the same effective simulation behavior when passed through compatibility mode.

**Eric presets**

- R14. Eric presets whose labels or folders promise a physical perimeter, such as 90, 200, or 900 microns, must be curated so their v2 `general.perimeter` equals the promised physical perimeter.
- R15. Eric preset curation must choose equivalent length parameters that preserve the intended scaled trajectory under compatibility mode rather than blindly multiplying every legacy value by 5.
- R16. Any Eric preset whose intended equivalence cannot be established from available context must be marked for review rather than silently migrated.

**UI and communication**

- R17. The parameter UI must display the active parameter-file format version separately from the registered model version.
- R18. Length-editing fields affected by v2 should make their micron interpretation clear in labels, help text, or compact unit affordances.
- R19. When a legacy file is loaded and migrated, the UI should communicate that migration occurred so users understand why saved values may look different.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R5.** Given a v2 parameter file is saved, when the file is opened as TOML, the metadata says `2.0.0` and the migrated primary length fields are stored as micron-facing values.
- AE2. **Covers R6, R7.** Given a legacy v1 file without formulas, when it is migrated to v2 and run in compatibility mode with the same seed, selected trajectory snapshots match the legacy run within numerical tolerance.
- AE3. **Covers R8, R11, R12.** Given a formula depends on `R_soft`, when the file is migrated, the formula is not silently rewritten in a way that changes the effective `R_soft` relationship; if equivalence is uncertain, the file is flagged for manual curation.
- AE4. **Covers R14, R15.** Given an Eric preset labeled as a 200 micron setup, when curated to v2, `general.perimeter` is 200 and the adapted simulation preserves the intended scaled trajectory.
- AE5. **Covers R17, R18, R19.** Given a migrated file is active in the UI, when a researcher opens the parameter editor, they can see the parameter format version and the affected length fields read as microns.

---

## Success Criteria

- Researchers can read v2 parameter files and understand length values as microns without knowing the old 5 micron calibration.
- Migrated non-formula legacy files are behavior-preserving under the current engine.
- `R_soft`-dependent formula behavior is intentionally preserved rather than changed accidentally by unit relabeling.
- Eric presets no longer contradict their promised physical perimeters.
- A downstream planner can separate the v2 compatibility adapter work from the later micron-native simulation rewrite.

---

## Scope Boundaries

- The first v2 step does not make the simulation engine internally micron-native.
- Force and stiffness retuning for micron-native physics is deferred.
- Automatic symbolic rewriting of arbitrary formulas is out of scope unless equivalence is guaranteed.
- Snapshot, CSV, and statistics coordinate-unit relabeling is not part of the first compatibility step unless a later plan explicitly adds an outward conversion layer.
- Multi-model parameter versioning beyond the EHT parameter format is out of scope.

---

## Key Decisions

- V2 is justified because the stored parameter semantics are changing in a breaking, user-visible way.
- Compatibility comes before engine rewrite: v2 files are micron-facing, but the current engine receives legacy-equivalent values.
- `R_soft` is a length parameter in microns in v2, but it is not the global unit scale.
- Formula curation is manual where needed; preserving behavior is more important than pretending arbitrary formula migration is safe.
- Eric preset perimeter labels are authoritative enough to drive curated equivalent parameters.

---

## Dependencies / Assumptions

- Existing migration code already uses `metadata.version` through `1.5.0`, so v2 should extend that chain rather than invent a separate version field.
- The registered EHT model version and the parameter-file format version are currently different concepts and should remain separate in the UI.
- Known affected areas include `src/models/eht/params/defaults.ts`, `src/core/params/merge.ts`, `src/models/eht/params/migration-v1.*.ts`, `src/models/eht/simulation/init.ts`, `src/models/eht/simulation/step.ts`, `src/models/eht/simulation/forces.ts`, `src/models/eht/simulation/events.ts`, `src/models/eht/ui/ParametersTab.tsx`, `src/models/eht/ui/CellTypesTab.tsx`, and `src/models/eht/ui/WarningBanner.tsx`.
- Some bundled presets already look micron-valued, so preset migration needs explicit curation rather than one global heuristic.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R4][Technical] Confirm the final list of secondary length-like fields that must be converted with v2, especially diffusion, screen bounds, running thresholds, and output-facing coordinates.
- [Affects R7][Technical] Define the numerical tolerance and representative seeds/timepoints used to prove trajectory equivalence.
- [Affects R14, R15][Needs research] For each Eric preset family, determine the authoritative physical perimeter and the equivalent v2 scale factor from available preset context.
