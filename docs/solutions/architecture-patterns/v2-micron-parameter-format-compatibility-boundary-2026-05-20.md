---
title: V2 Micron Parameter Format With A Legacy Engine Boundary
date: 2026-05-20
category: architecture-patterns
module: EHT parameter format
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - Changing persisted scientific parameter units without retuning the simulation engine
  - Migrating TOML parameter files while preserving deterministic trajectories
  - Introducing public units before converting snapshots, statistics, or engine coordinates
tags: [eht, parameter-migration, unit-conversion, compatibility-adapter, toml, statistics]
---

# V2 Micron Parameter Format With A Legacy Engine Boundary

## Context

EHT parameter files used a mix of public-looking length values and legacy engine units where one engine unit represented 5 microns. Width, height, perimeter, radii, running speed, diffusion, junction distances, presets, batch ranges, formulas, rendering, and statistics all touched these values in different places. The requested change was to make parameter files and the editor use microns while preserving existing simulation behavior.

The important constraint was that this was not the micron-native mechanics step. Force formulas and runtime mechanics still depend on the current engine scale, and formulas depending on `R_soft` must keep the same effective behavior. Output rows and statistics also remain engine-facing until a later outward conversion layer is designed.

## Guidance

Treat a file-format unit migration as a boundary problem, not a global refactor. Introduce a small explicit conversion catalog, migrate persisted values into public units, and adapt them back at the model boundary before mechanics run.

The durable shape for EHT is:

- `src/models/eht/params/unit-conversion.ts` owns `LEGACY_MICRONS_PER_UNIT = 5`, `EHT_PARAM_FORMAT_VERSION = "2.0.0"`, and the path catalog for length-like fields.
- `src/models/eht/params/migration-v2.0.ts` migrates legacy params to v2 public microns and adds provenance or curation warnings.
- `src/models/eht/compat/engine-params.ts` converts public v2 params back to legacy engine units for simulation, rendering, stats, snapshots loaded with params, and batch workers.
- `src/models/eht/compat/formula-units.ts` exposes micron-facing scope values for length-target formulas, then converts their result back to engine units.
- UI labels and TOML exports stay public micron-facing.
- Snapshots, per-cell metrics, statistics, and simulation state coordinates stay engine-facing for this step.

The adapter is intentionally model-local:

```ts
export function toEHTEngineParams(params: EHTParams): EHTParams {
  if (params.metadata?.unit_system === 'legacy-engine') {
    return structuredClone(params);
  }

  if (!isV2OrLater(params.metadata?.version)) {
    return structuredClone(params);
  }

  const engineParams = micronParamsToLegacy(params);
  engineParams.metadata = {
    ...engineParams.metadata,
    unit_system: 'legacy-engine',
  };
  return engineParams;
}
```

That keeps generic engine, CLI, batch, and UI code mostly model-agnostic while making every EHT entry point use the same compatibility view.

Use characterization tests to protect the boundary. The critical tests are not only round-trip conversion tests. They should also prove that migrated public v2 defaults initialize and step to the same engine snapshots as legacy defaults:

```ts
const legacyState = EHTHeadlessModel.init(LEGACY_DEFAULT_EHT_PARAMS, seed);
const publicState = EHTHeadlessModel.init(DEFAULT_EHT_PARAMS, seed);

expect(sampleSnapshot(publicState)).toEqual(sampleSnapshot(legacyState));
```

Keep the output-unit decision visible. It is easy for users to assume that once parameter files are micron-facing, statistics are also micron-facing. In this step they are not: distance-like stats such as `ab_distance`, `AX`, `BX`, `ax`, and `bx` are still computed from engine-state coordinates. Multiply those by 5 to interpret them as microns until an explicit output conversion pass exists.

## Why This Matters

Changing persisted units and simulation units at the same time would make regressions hard to diagnose. A trajectory shift could come from the parser, defaults, formulas, presets, renderer, worker entry point, or a genuine mechanics change. The compatibility boundary isolates the file-format change from the future engine-retuning step.

The explicit catalog also prevents accidental coupling to `R_soft`. `R_soft` is a length parameter and should be public microns in v2, but it is not a global scale. Mechanics that depend on runtime `R_soft` continue to see legacy-equivalent engine values through the adapter.

Formula handling needs a separate compatibility surface because saved formula text is user-authored scientific content. Rewriting formulas symbolically would be fragile. Evaluating length-target formulas with public-scope length variables preserves the saved v2 meaning while feeding equivalent engine values to runtime mechanics.

Output units deserve their own plan because exports are user-facing scientific data. Silently converting statistics during a parameter-file migration would change downstream analysis assumptions. Leaving them engine-facing is less surprising if it is documented and tested.

## When to Apply

- A persisted parameter format changes units but current mechanics must remain behaviorally equivalent.
- Some paths should scale and others should not, especially in scientific or simulation code.
- Multiple entry points exist: browser, headless model, worker, CLI, batch, renderer, stats, and TOML import/export.
- Formulas or presets may already be curated in the target public unit system.
- Output formats have their own consumers and should not change as a side effect of parameter migration.

## Examples

Standard legacy files:

- Load against legacy defaults before v2 migration.
- Scale only cataloged length-like paths by 5.
- Persist `metadata.version = "2.0.0"` and `metadata.unit_system = "microns"`.
- Run through `toEHTEngineParams()` before mechanics, yielding the original legacy values.

Curated Eric presets:

- Treat the preset files as already micron-profile inputs because their folders promise physical perimeters such as 90, 200, or 900 microns.
- Preserve those public perimeter labels.
- Still run through the adapter before simulation so scaled trajectories are preserved.
- Add curation warnings if the promised perimeter and raw value disagree.

Formula-bearing files:

- Preserve saved formula strings.
- Add curation warnings for formulas whose dimensional equivalence cannot be guaranteed.
- For length-target formulas, expose `old_value`, `init_value`, `h_init`, `w_init`, `R_hard_div`, `r`, and `delta` in public microns and convert the result back to engine units.
- Leave dimensionless targets in engine scope.

Statistics and exports:

- `ab_distance`, `AX`, `BX`, `ax`, `bx`, and per-cell coordinate exports are engine-facing.
- `x`, `below_basal`, `above_apical`, and `below_control_cells` are unitless.
- A later output conversion plan should decide whether to add micron-facing export columns, rename existing columns, or preserve both.

## Related

- Requirements: `docs/brainstorms/2026-05-20-v2-micron-parameter-format-requirements.md`
- Plan: `docs/plans/2026-05-20-001-feat-v2-micron-parameter-format-plan.md`
- User-facing docs: `src/docs/EHT/parameter-format-v2.md`
- Core implementation: `src/models/eht/params/unit-conversion.ts`, `src/models/eht/params/migration-v2.0.ts`, `src/models/eht/compat/engine-params.ts`, `src/models/eht/compat/formula-units.ts`
- Behavioral coverage: `src/models/eht/simulation/compatibility-equivalence.test.ts`, `src/models/eht/params/migration-v2.0.test.ts`, `src/core/batch/serialization.test.ts`
