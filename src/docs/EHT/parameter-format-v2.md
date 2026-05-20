# EHT Parameter Format v2

EHT parameter files with `metadata.version = "2.0.0"` store length-like values in microns. This includes the initial width and height, screen bounds, perimeter, cell radii, cytoskeleton and junction lengths, running speed, diffusion, and batch ranges that target those paths.

The current mechanics still run in the legacy internal scale where one simulation unit represents 5 microns. The EHT model wrapper converts v2 public params to that legacy engine view before initialization, timesteps, rendering bounds, snapshot loading, and statistics. This keeps existing trajectories stable while making saved TOML files readable as physical micron values.

## Converted Fields

General fields:

- `general.w_init`
- `general.h_init`
- `general.w_screen`
- `general.h_screen`
- `general.perimeter`

Cell-type fields:

- `cell_types.*.R_soft`
- `cell_types.*.R_hard`
- `cell_types.*.R_hard_div`
- `cell_types.*.max_cytoskeleton_length`
- `cell_types.*.running_speed`
- `cell_types.*.diffusion`
- `cell_types.*.max_basal_junction_dist`
- `cell_types.*.cytos_init`
- `cell_types.*.apical_junction_init`

The migration does not scale stiffnesses, probabilities, times, damping ratios, colors, counts, `location`, `aspect_ratio`, `basal_membrane_repulsion`, or force constants.

## Formula Curation

Length-target formulas can run with micron-facing scope values and return values that are converted back to the current engine scale. This is used for known targets such as `R_soft`, `R_hard`, `eta_A`, `eta_B`, and converted general length fields.

Arbitrary formulas are not rewritten during migration. Legacy configs with length-target formulas, external-force formulas, or other unit-sensitive expressions carry curation warnings in metadata so they can be reviewed manually.

Force formulas that depend on runtime `R_soft` keep seeing the same effective engine-scale radius after the compatibility adapter runs.

## Presets

Standard bundled presets are migrated from legacy units by multiplying converted length fields by 5.

Eric presets are treated as curated micron-profile inputs. Their public `general.perimeter` values preserve the setup labels, such as 90, 200, or 900 microns, while the compatibility adapter supplies scaled values to the current engine.

## Outputs

CSV snapshots, statistics rows, and saved simulation state coordinates remain engine-facing in this step. A future micron-native or output-conversion pass can change those surfaces separately.
