# EHT Statistics

Statistics are computed per cell and then aggregated (mean or fraction) over cell groups. Groups include individual cell types (e.g., `control`, `emt`) and `all`. **Note:** Pair combinations (e.g., `control+emt`) are not computed.

## Units

- Position and length statistics are computed from the current simulation state in **legacy engine units**, where **1 engine unit = 5 microns**.
- To interpret distance-like outputs in microns, multiply the reported value by 5.
- This applies to `ab_distance`, `AX`, `BX`, `ax`, `bx`, and the per-cell coordinate columns exported by the frame statistics table (`X_*`, `A_*`, `B_*`, `a_*`, `b_*`).
- This is intentionally different from v2 parameter files, where length-like inputs are stored in microns. See [Parameter Format v2](#/docs/eht/parameter-format-v2) for the input/output boundary.
- Position ratios (`x`) and boolean fractions are **unitless** (0-1).
- `below_basal`, `above_apical`, `below_basal_line`, `above_apical_line`, and `below_control_cells` are height-comparison fractions and therefore unitless.

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
- **s**: Arc-length coordinate along the basal geometry
- **h**: Signed distance from the basal geometry along the local basal normal into the tissue

These coordinates are in **legacy engine units**.

## Tissue-Line Statistics

The `below_basal` and `above_apical` fractions use curved-coordinate tissue strips built from control cells:

- Convert each control-cell basal point, control-cell apical point, and nucleus to `(s, h)` coordinates
- Sort strip samples by `s`
- For a nucleus at `s_X`, linearly interpolate the strip height `h(s_X)` between the left and right neighboring samples
- For `full_circle = true`, the interpolation wraps from the last sample back to the first sample across the periodic seam
- Convert sampled strip points back from `(s, h)` for rendering, so circular/elliptical strips appear curved in Cartesian coordinates
- When `full_circle = false`, boundary control cells are excluded from statistics strip construction

The `below_basal_line` and `above_apical_line` fractions use a local tangent-line test at each cell:

- Estimate local basal/apical tangents from neighboring basal/apical points
- Orient the normal from the cell basal point toward its apical point
- Compare `(X - B_i) · N_{B_i}` for basal and `(X - A_i) · N_{A_i}` for apical

## Statistics Definitions

{{STATISTIC_DEFINITIONS}}

## Output Format

Statistics are exported with the naming convention `{statistic}_{group}`.

**Examples with 2 cell types (control, emt):**
- `ab_distance_all`: Mean AB distance across all non-boundary cells
- `x_control`: Mean x position for control cells (excluding boundary)
- `below_basal_emt`: Fraction of emt cells below the interpolated control-cell basal tissue line
- `below_basal_line_emt`: Fraction of emt cells below their local basal tangent line
- `below_control_cells_emt`: Fraction of emt cells below the interpolated non-boundary control-cell line

## Total Statistics Count

For N cell types: `11 metrics x (N + 1) groups`

- Example: 2 cell types -> 33 statistics (11 x 3 groups: all, control, emt)
- Example: 3 cell types -> 44 statistics (11 x 4 groups: all, control, emt, counter_control)
