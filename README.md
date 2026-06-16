# Changelog

> **📹 Firefox Users:** Video export works in Firefox, but requires **WebM (VP9)** format instead of H.264 due to a [known Firefox bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1918769). The app will automatically select the best format for your browser. See [FIREFOX_VIDEO_EXPORT_SOLUTION.md](FIREFOX_VIDEO_EXPORT_SOLUTION.md) for details.

## 2.6.0 (2026-06-16)

- Reworked `below_basal` and `above_apical` statistics to compare nuclei against control-cell basal/apical tissue lines interpolated in curved coordinates.
- Added `below_basal_line` and `above_apical_line` statistics for local tangent-line tests using directed normals.
- Updated `below_control_cells` to use the interpolated non-boundary control-cell nucleus line at the same curved coordinate.
- Added a disabled-by-default “Show Tissue Lines” render option that draws the control-cell basal and apical tissue lines.
- Updated EHT statistics documentation and tests for control-cell-only tissue-line interpolation.

## 1.5.0 (2026-03-26)

### 2026-03-26
- Added per-cell-type external force (`external_force` parameter) with math.js formula support — variables: `x`, `y`, `alpha`, `r`, `t`, `T` (tangent), `N` (normal). Scalar formulas auto-wrap as convergent tangential flow.
- Added abstract `center` property to `BasalGeometry` (line/circle/ellipse)
- Updated deploy script

### 2026-03-25
- Improved TOML parameter import handling

### 2026-02-26
- Major rework of the cell events system: v2 events with global default events, per-cell-type events, event period handling (`dt` support), prerequisite chains, and cell cycle phase gating
- Renamed `apical_constriction` to `lose_apical_interface` across event system
- Added `k_apical_junction` as a per-cell-type parameter
- Added new presets: apical constriction, apical interface loss, oscillating cell size

### 2026-02-25
- Added parameter change events for apical stiffness (G2) and R_hard (mitosis) as default events
- Cell cycle reset now restores all cell properties to type defaults

### 2026-02-13–14
- Refactored INM (Interkinetic Nuclear Migration) to use cytoskeleton strain values instead of hard-coded behavior
- Event probability now uses math.js string formulas (e.g. `p_div_out`, `INM`)
- Added default cell event mechanism with cell division as a default event
- Added parameter help icons with LaTeX/KaTeX support

### 2026-02-10–12
- Added dynamic cell events system (v1.1.0 event architecture)
- Added Cell Events editor UI tab

## 1.0.2 (2026-02-03)

### 2026-02-03
- Improved video export with different options

### 2026-01-30
- Work on MP4 format and batch video export

## 1.0.1 (2026-01-30)

### 2026-01-30
- Removed wrong MCP

### 2026-01-23
- Work on script to update with suburl target
- Fixed issue regarding cell types at import

## 1.0.0 (2026-01-19)

### 2026-01-19
- Improved Claude.md documentation

### 2026-01-16
- Updated changelog
- Added apical constriction event (time_AC): Cuts apical links between constricting cell type and other types, reconnects neighboring non-constricting cells

### 2026-01-15
- Excluded left 10% and right 10% of cells from control cell type (effective cell type is control_boundary). These cells will not be part of the statistics and the cell type group "all".

### 2026-01-14
- Updated documentation
- Added tests
- Removed combinations of cell types
- Excluded boundary 10%
- Rearranged interface
- Fixed style
- Work on routing
- Fixed coordinates issues
- Fixed links
- Added docs link
- Work on docs pages
- Work on Claude.md
- Added model description
- Removed safety factor which we don't need
- Used tangent direction for division
- Added minimal docs
- Changed definition of below neighbours to below control
- Fixed bug about statistics of position on basal-to-apical scale. Code wrongly used all apical points (also of detached cells) instead of only those which are still part of apical strip. Because of that bug, some control cells appeared to be extruded which was wrong.
- Added table with frame statistics & rendering of cell number to simulation view
  - Pressing on the arrows sorts the table
  <img width="634" height="548" alt="image" src="https://github.com/user-attachments/assets/b1bef9e7-45e3-44ef-8347-da791abd79fb" />
- Fixed statistics, namely: Compute now below_control_cells instead of below_neighbours
- Fixed asymmetry issue where basal points wrongly experienced a force on the x-axis instead of along the tangent of the basal curve.
  <img width="342" height="316" alt="image" src="https://github.com/user-attachments/assets/499624e5-0620-4bc3-bb5e-a4a949331db3" />
- Added documentation under `/docs/`
- Internal: Changed deployment method

### 2026-01-13
- Removed erroneous cell filtering
- Work on statistics plots
- Corrected plot
- Corrected projection on apical strip
- Modified stats table
- Work on frame statistics
- Work on statistics bug

### 2026-01-12
- Work on slider for play of animation
- Added URL based params and run button to results
- Work on consistent clone function
- Fixed unneeded/wrong performance optimisation
- Fixed tiny bugs in running mode
- Added presets
- Work on basal ordering

### 2026-01-10
- First code review

### 2026-01-09
- Added video
- Added new parameter
- Removed old simulation files
- Fixed loss of basal adhesion
- Added scroll bar
- Added presets
- Changed default mode on param change
- Work on UI
- Improved importer
- Added XLSX importer
- Changed seeds for batch runners
- Work on statistics tab

### 2026-01-08
- Work on statistics plots
- Rotate
- Work on statistics pipeline
- Fixed batch code
- Work on new discretisation
- Added tests
- Work on new initializer
- Work on model parameter view
- Fixed bug
- Removed package
- Reorganisation of parameters
- Work on fixing model interface
- Major refactor
- Work on restructure
- Changed input parameter definition

### 2026-01-07
- Support for multiple models
- Major refactoring: Key Features - Semantic Versioning (each model has { major, minor, patch } version), Model Registry (singleton pattern for model registration and lookup), Migration (legacy params without metadata auto-migrate to EHT v1.0.0), Backwards Compatibility (re-exports maintain existing import paths), Model-Aware UI (components dynamically use current model's configuration)
- Tidy up

### 2026-01-06
- Leva based UI
- Color changes and improvements
- Softer background
- Work on dark theme support
- Improved render window
- Simplified projections (need to fix later)
- Faster way to get arc length
- Work on ellipse using gradient descent
- Work on reset/re-run/one-step at start and proper projections
- Fixed bug about links disappearing

### 2026-01-05
- Wider screen
- Work on presets
- Major changes on layout
- Fixed basal curved coordinates
- Added full_circle parameter
- Initialize cells on circle sorted by angle not x-coordinate
- Flexible stepsize for inputs depending on float/int type
- Added parallel batch computation
- Added estimate of batch processing
- I/O for param ranges
- Implemented preliminary plot
- Minor changes on design
- Change layout
- Added base param for ranges as default min max
- Added Claude instructions
- After long Claude session

### 2025-07-25
- Initial commit
