# EHT Parameter Format v2

EHT parameter files with `metadata.version = "2.0.0"` store length-like values in **microns**. This includes the initial width and height, screen bounds, perimeter, cell radii, cytoskeleton and junction lengths, running speed, diffusion, and batch ranges that target those paths.

The current mechanics still run in the legacy internal scale where one simulation unit represents 5 microns. The EHT model wrapper converts v2 public params to that legacy engine view before initialization, timesteps, rendering bounds, and snapshot loading. Statistics convert distance-like outputs back to microns at the output boundary. This keeps existing trajectories stable while making saved TOML files and statistics readable as physical micron values.

## Units after conversion

- Public TOML/API values in v2 are in **microns**.
- Runtime simulation inputs use the **legacy internal engine scale** for computations.
- Formula evaluation inputs (`r`, `x`, `y`, `delta`) inherit the runtime conversion and should be treated per formula scope.
- Dimensionless values (`aspect_ratio`, `events.*`, flags, probabilities, counts) are unitless.

## Converted Fields

General fields (stored in v2 as micron values):

- `general.w_init` (**µm**)
- `general.h_init` (**µm**)
- `general.w_screen` (**µm**)
- `general.h_screen` (**µm**)
- `general.perimeter` (**µm**)

Cell-type fields (stored in v2 as micron values):

- `cell_types.*.R_soft` (**µm**)
- `cell_types.*.R_hard` (**µm**)
- `cell_types.*.R_hard_div` (**µm**)
- `cell_types.*.max_cytoskeleton_length` (**µm**)
- `cell_types.*.running_speed` (units vary by interpretation in model time integration)
- `cell_types.*.diffusion` (model diffusion parameter, engine scale)
- `cell_types.*.max_basal_junction_dist` (**µm**)
- `cell_types.*.cytos_init` (**µm**)
- `cell_types.*.apical_junction_init` (**µm**)

The migration does not scale stiffnesses, probabilities, times, damping ratios, colors, counts, `location`, `aspect_ratio`, `basal_membrane_repulsion`, or force constants.

## Formula Curation

Length-target formulas can run with micron-facing scope values and return values that are converted back to the current engine scale. This is used for known targets such as `R_soft`, `R_hard`, `eta_A`, `eta_B`, and converted general length fields.

Arbitrary formulas are not rewritten during migration. Legacy configs with length-target formulas, external-force formulas, or other unit-sensitive expressions carry curation warnings in metadata so they can be reviewed manually.

Force formulas that depend on runtime `R_soft` keep seeing the same effective engine-scale radius after the compatibility adapter runs.

## Presets

Standard bundled presets are migrated from legacy units by multiplying converted length fields by 5.

Eric presets are treated as curated micron-profile inputs. Their public `general.perimeter` values preserve the setup labels, such as 90, 200, or 900 microns, while the compatibility adapter supplies scaled values to the current engine.

## Outputs

CSV snapshots and saved simulation state coordinates remain engine-facing because they are restartable state. Statistics rows and per-cell metric coordinates are reported in microns.
