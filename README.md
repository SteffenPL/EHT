# Changelog (from 2026-01-16)

## 2026-01-17

- Exlude left 10% and right 10% of cells from control cell type (effective cell type is control_boundary). These cells will not be part of the statistics and the cell type group "all".

## 2026-01-16

- Fixed bug about statistics of position on basal-to-apical scale.
  Code wrongly used all apical points (also of detached cells) instead of only those which are still part of apical strip. Because of that bug, some control cells appeared to be extruded which was wrong.

- Added table with frame statistics & rendering of cell number to simulation view
  - Pressing on the arrows sorts the table
  <img width="634" height="548" alt="image" src="https://github.com/user-attachments/assets/b1bef9e7-45e3-44ef-8347-da791abd79fb" />

- Fixed statistics, namely: Compute now below_control_cells instead of below_neighbours

- Fixed asymmetry issue where basal points wrongly experienced a force on the x-axis instead of along the tangent of the basal curve.
  <img width="342" height="316" alt="image" src="https://github.com/user-attachments/assets/499624e5-0620-4bc3-bb5e-a4a949331db3" />


- Added documentation under `/docs/`

- Internal: Changed deplayment method.
