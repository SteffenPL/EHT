# EHT Statistics

Statistics are computed per cell and then aggregated (mean or fraction) over cell groups. Groups include individual cell types (e.g., `control`, `emt`), combinations (`control+emt`), and `all`.

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

$$\text{below\_control\_cells} = \begin{cases} 1 & \text{if } bx < \min_{c \in \text{control}} bx_c \\ 0 & \text{otherwise} \end{cases}$$

Binary indicator for whether the cell's basal distance (bx) is less than the minimum bx among all control cells. This identifies cells that have migrated below the control cell population.

## Output Format

Statistics are exported with the naming convention `{statistic}_{group}`, for example:
- `ab_distance_all`: Mean AB distance across all cells
- `x_control`: Mean x position for control cells
- `below_basal_emt`: Fraction of emt cells below basal layer
- `below_control_cells_emt`: Fraction of emt cells below the lowest control cell
