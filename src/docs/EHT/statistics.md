# EHT Statistics

Statistics are computed per cell and then aggregated (mean or fraction) over cell groups. Groups include individual cell types (e.g., `control`, `emt`) and `all`. **Note:** Pair combinations (e.g., `control+emt`) are not computed.

## Units

- Position and length statistics are computed from the current simulation state in **legacy engine units**, where **1 engine unit = 5 microns**.
- To interpret distance-like outputs in microns, multiply the reported value by 5.
- This applies to `ab_distance`, `AX`, `BX`, `ax`, `bx`, and the per-cell coordinate columns exported by the frame statistics table (`X_*`, `A_*`, `B_*`, `a_*`, `b_*`).
- This is intentionally different from v2 parameter files, where length-like inputs are stored in microns. See [Parameter Format v2](#/docs/eht/parameter-format-v2) for the input/output boundary.
- Position ratios (`x`) and boolean fractions are **unitless** (0-1).
- `below_control_cells` is a threshold-based fraction and therefore unitless.

## Cell Groups

Statistics are computed for the following groups:

- **`all`**: All cells, excluding boundary control cells (see Boundary Cell Handling below)
- **Individual cell types**: One group per cell type defined in parameters (e.g., `control`, `emt`, `counter_control`)

## Boundary Cell Handling

When `full_circle = false`:
- The leftmost and rightmost 10% of control cells (based on arc length along the basal curve) are identified as **boundary cells**
- These cells are reclassified as `control_boundary` for statistics purposes
- `control_boundary` cells are excluded from the `all` and `control` groups
- `control_boundary` is not included as a separate statistics group
- This exclusion helps remove edge effects from statistical analysis

When `full_circle = true`:
- No boundary detection is performed
- All control cells remain in the `control` group

## Geometric Quantities

For each cell with nucleus **X**, apical point **A**, and basal point **B**:

- **a**: Projection of X onto the apical line strip (formed by connected apical points)
- **b**: Projection of X onto the basal curve

Both are coordinates in **legacy engine units**.

## Statistics Definitions

{{STATISTIC_DEFINITIONS}}

## Output Format

Statistics are exported with the naming convention `{statistic}_{group}`.

**Examples with 2 cell types (control, emt):**
- `ab_distance_all`: Mean AB distance across all non-boundary cells
- `x_control`: Mean x position for control cells (excluding boundary)
- `below_basal_emt`: Fraction of emt cells below basal layer
- `below_control_cells_emt`: Fraction of emt cells below the lowest control cell

## Total Statistics Count

For N cell types: `9 metrics x (N + 1) groups`

- Example: 2 cell types -> 27 statistics (9 x 3 groups: all, control, emt)
- Example: 3 cell types -> 36 statistics (9 x 4 groups: all, control, emt, counter_control)
