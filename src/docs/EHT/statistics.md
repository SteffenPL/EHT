# EHT Statistics

Statistics are computed per cell and then aggregated (mean or fraction) over cell groups. Groups include individual cell types (e.g., `control`, `emt`) and `all`. **Note:** Pair combinations (e.g., `control+emt`) are not computed.

## Cell Groups

Statistics are computed for the following groups:

- **`all`**: All cells, excluding boundary control cells (see Boundary Cell Handling below)
- **Individual cell types**: One group per cell type defined in parameters (e.g., `control`, `emt`, `counter_control`)

## Boundary Cell Handling

When `full_circle = false`:
- The leftmost and rightmost 10% of control cells (based on arc length along the basal curve) are identified as **boundary cells**
- These cells are reclassified as `control_boundary` for statistics purposes
- `control_boundary` cells are:
  - Excluded from the `all` group
  - Excluded from the `control` group
  - Not included as a separate statistics group (no plots generated)
- This exclusion helps remove edge effects from statistical analysis

When `full_circle = true`:
- No boundary detection is performed
- All control cells remain in the `control` group

## Geometric Quantities

For each cell with nucleus **X**, apical point **A**, and basal point **B**:

- **a**: Projection of X onto the apical line strip (formed by connected apical points)
- **b**: Projection of X onto the basal curve

## Statistics Definitions

### ab_distance

**Apical-Basal Distance**

$$\text{ab\_distance} = |A - B|$$

The Euclidean distance between the apical and basal points. Measures the cell's vertical extent.

### AX

**Apical-Nucleus Distance**

$$AX = |A - X|$$

Distance from the apical point to the nucleus.

### BX

**Basal-Nucleus Distance**

$$BX = |B - X|$$

Distance from the basal point to the nucleus.

### ax

**Nucleus to Apical Strip Distance**

$$ax = |X - a|$$

Distance from the nucleus to its projection onto the apical line strip. Measures how far the nucleus is from the apical surface.

### bx

**Nucleus to Basal Curve Distance**

$$bx = |X - b|$$

Distance from the nucleus to its projection onto the basal curve. Measures how far the nucleus is from the basal membrane.

### x

**Position on Basal-Apical Scale**

$$x = \frac{(X - b) \cdot (a - b)}{|a - b|^2}$$

Normalized position of the nucleus between basal (x=0) and apical (x=1) projections:
- x = 0: Nucleus at basal level
- x = 1: Nucleus at apical level
- x < 0: Below basal
- x > 1: Above apical

### below_basal

**Fraction Below Basal Layer**

$$\text{below\_basal} = \begin{cases} 1 & \text{if } x < 0 \\ 0 & \text{otherwise} \end{cases}$$

Binary indicator (0 or 1) for whether the cell's nucleus is below the basal layer. Aggregated as fraction over cell group.

### above_apical

**Fraction Above Apical Layer**

$$\text{above\_apical} = \begin{cases} 1 & \text{if } x > 1 \\ 0 & \text{otherwise} \end{cases}$$

Binary indicator for whether the cell's nucleus is above the apical layer. Aggregated as fraction over cell group.

### below_control_cells

**Fraction Below Lowest Control Cell**

$$\text{below\_control\_cells} = \begin{cases} 1 & \text{if } bx < \min_{c \in \text{control (non-boundary)}} bx_c \\ 0 & \text{otherwise} \end{cases}$$

Binary indicator for whether the cell's basal distance (bx) is less than the minimum bx among all non-boundary control cells. This identifies cells that have migrated below the control cell population. **Note:** Boundary control cells are excluded when computing the minimum control cell bx.

## Output Format

Statistics are exported with the naming convention `{statistic}_{group}`.

**Examples with 2 cell types (control, emt):**
- `ab_distance_all`: Mean AB distance across all non-boundary cells
- `x_control`: Mean x position for control cells (excluding boundary)
- `below_basal_emt`: Fraction of emt cells below basal layer
- `below_control_cells_emt`: Fraction of emt cells below the lowest control cell

**Total statistics count:**
- For N cell types: `9 metrics × (N + 1) groups`
- Example: 2 cell types → 27 statistics (9 × 3 groups: all, control, emt)
- Example: 3 cell types → 36 statistics (9 × 4 groups: all, control, emt, counter_control)
