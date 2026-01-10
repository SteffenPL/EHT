# Parameter Format Proposal v2

## Current Issues

### 1. Inconsistent Nesting Levels
- EHT uses deeply nested structures: `cell_types.control.events.time_A_start`
- Toy uses flat structure: `general.running_speed`
- Color requires 3 separate keys: `color.r`, `color.g`, `color.b`

### 2. Redundant Sections
- `cell_prop` section is empty (legacy)
- `metadata` duplicates model info already in registry

### 3. Confusing Event Timing
- Events use `_start` / `_end` suffixes for ranges
- Special value `1e308` for "never" (Infinity)

### 4. Per-Cell-Type Duplication
- Many parameters are identical across cell types
- Full specification required even for small changes

---

## Proposed New Format

### Design Principles

1. **Flat where possible** - Avoid deep nesting
2. **Sensible defaults** - Only specify what differs from defaults
3. **Human-readable** - Use clear names and comments
4. **Model-agnostic core** - Common structure for all models
5. **Arrays for ranges** - `[min, max]` instead of `_start/_end`
6. **Probabilities are explicit** - Parameters like `inm` and `run` are probabilities [0,1]

---

## New TOML Structure

### Common Header (all models)

```toml
# Model identifier (required)
model = "EHT"  # or "Toy", etc.

# Simulation timing
t_end = 48.0
dt = 0.1
seed = 42

# Output sampling (for batch)
sample_times = [0, 12, 24, 36, 48]  # explicit list
# OR
sample_interval = 12                 # regular intervals
```

---

### EHT Model - Simplified

```toml
model = "EHT"

# === Simulation ===
t_end = 48.0
dt = 0.1
seed = 0
substeps = 30
alg_dt = 0.05

# === Tissue Geometry ===
# Initial tissue dimensions (number of cells)
tissue_width = 10       # w_init: initial width in cell units
tissue_height = 5       # h_init: initial height in cell units

# Basal membrane shape
perimeter = 105         # Ellipse perimeter in microns (0 = straight line)
aspect_ratio = 1.0      # b/a ratio: 0=line, 1=circle, >1=tall ellipse
full_circle = true      # Close the tissue into a ring

# === Physics ===
friction = 0.2          # mu: friction coefficient

# === Division ===
# Probability that division produces one offspring in the 2D slice
# (accounts for cells dividing out of the simulated plane)
p_division_in_plane = 0.8   # p_div_out

# === Display (optional) ===
view_width = 50
view_height = 25

# === Cell Types ===
# Use inheritance: all cell types inherit from [cells.default]

[cells.default]
count = 0                   # N_init: initial cell count
location = ""               # Spawn location: "top", "bottom", or position [-1, 1]
color = "#1E6414"           # Hex color

# Geometry
radius_hard = 0.4           # R_hard: hard sphere radius
radius_hard_div = 0.7       # R_hard_div: hard sphere radius during division
radius_soft = 1.2           # R_soft: soft interaction radius

# Cell cycle
lifespan = [5.5, 6.5]       # [lifespan_start, lifespan_end]: division time range
g2_duration = 0.5           # dur_G2: G2 phase duration
mitosis_duration = 0.5      # dur_mitosis: mitosis duration

# Stiffness (spring constants)
k_apical = 5.0              # stiffness_apical_apical
k_apical_div = 10.0         # stiffness_apical_apical_div (during division)
k_nuclei_apical = 2.0       # stiffness_nuclei_apical
k_nuclei_basal = 2.0        # stiffness_nuclei_basal
k_repulsion = 1.0           # stiffness_repulsion
k_straightness = 15.0       # stiffness_straightness
k_junction = 1.0            # k_apical_junction
k_cytoskeleton = 5.0        # k_cytos

# Movement
p_running = 0.0             # run: probability of running behavior [0,1]
running_speed = 1.0
running_mode = "none"       # "none", "after_extrusion", "retain_length", "immediate"

# Interkinetic Nuclear Migration
p_inm = 0.0                 # INM: probability of INM being active [0,1]

# EMT events: [start_time, end_time] or "never"
# Time window during which the event occurs (sampled uniformly)
emt_lose_apical = "never"       # time_A: lose apical adhesion
emt_lose_basal = "never"        # time_B: lose basal adhesion
emt_lose_straightness = "never" # time_S: lose straightness constraint
emt_polarized_running = "never" # time_P: start polarized running

# Heterogeneous EMT (each cell samples its own event times)
heterogeneous = false       # hetero

# Other physical properties
diffusion = 0.1
basal_damping = 1.0             # basal_damping_ratio
max_basal_junction_dist = 0.33
cytoskeleton_init = 1.5         # cytos_init
basal_membrane_repulsion = 0.0
apical_junction_init = 0.33
max_cytoskeleton_length = 0.0

# === Specific Cell Types ===

[cells.control]
count = 45
# Inherits all other values from [cells.default]

[cells.emt]
count = 5
location = "bottom"
color = "#FF00FF"

# Override stiffness for EMT cells
k_junction = 0.5
k_repulsion = 2.0

# EMT events occur between these times
emt_lose_apical = [3.0, 12.0]
emt_lose_basal = [3.0, 12.0]
emt_lose_straightness = [5.0, 15.0]
emt_polarized_running = [10.0, 20.0]

heterogeneous = true
p_running = 0.8
running_mode = "after_extrusion"

# === Batch Configuration (optional) ===

[batch]
seeds = 5              # Number of random seeds per parameter combination
sample_interval = 12   # Save state every 12 hours

[[batch.sweep]]
param = "cells.emt.count"
values = [0, 1, 5, 10]

[[batch.sweep]]
param = "friction"
range = [0.1, 0.5]
steps = 5
```

---

### Toy Model - Simplified

```toml
model = "Toy"

# === Simulation ===
t_end = 60.0
dt = 0.1
seed = 42
substeps = 1

# === Domain ===
domain = [100, 100]     # [width, height] in microns
boundary = "box"        # "box", "periodic", "none"

# === Cells ===
count = 20
radius = 5.0            # soft_radius
repulsion = 10.0        # repulsion_strength
friction = 1.0          # mu

# === Run-and-Tumble Dynamics ===
running_speed = 2.0
tumble_speed = 0.5
running_duration = 5.0
tumbling_duration = 2.0
tumbling_period = 0.5   # Time between polarity changes during tumbling

# === Display (optional) ===
view_width = 100
view_height = 100
```

---

## Parameter Mapping Reference

### EHT Model

| Current Path | Proposed | Type | Description |
|--------------|----------|------|-------------|
| `general.t_end` | `t_end` | float | Simulation end time |
| `general.dt` | `dt` | float | Time step |
| `general.random_seed` | `seed` | int | Random seed |
| `general.n_substeps` | `substeps` | int | Substeps per dt |
| `general.alg_dt` | `alg_dt` | float | Algorithm time step |
| `general.mu` | `friction` | float | Friction coefficient |
| `general.w_init` | `tissue_width` | int | Initial tissue width |
| `general.h_init` | `tissue_height` | int | Initial tissue height |
| `general.perimeter` | `perimeter` | float | Ellipse perimeter |
| `general.aspect_ratio` | `aspect_ratio` | float | Ellipse aspect ratio |
| `general.full_circle` | `full_circle` | bool | Close tissue ring |
| `general.p_div_out` | `p_division_in_plane` | float | Division in-plane probability |
| `general.w_screen` | `view_width` | float | Display width |
| `general.h_screen` | `view_height` | float | Display height |
| `cell_types.X.N_init` | `cells.X.count` | int | Initial cell count |
| `cell_types.X.R_hard` | `cells.X.radius_hard` | float | Hard sphere radius |
| `cell_types.X.R_soft` | `cells.X.radius_soft` | float | Soft interaction radius |
| `cell_types.X.color.{r,g,b}` | `cells.X.color` | string | Hex color "#RRGGBB" |
| `cell_types.X.lifespan_start/end` | `cells.X.lifespan` | [float, float] | Lifespan range |
| `cell_types.X.stiffness_apical_apical` | `cells.X.k_apical` | float | Apical stiffness |
| `cell_types.X.INM` | `cells.X.p_inm` | float | INM probability [0,1] |
| `cell_types.X.run` | `cells.X.p_running` | float | Running probability [0,1] |
| `cell_types.X.running_mode` | `cells.X.running_mode` | string | Mode enum |
| `cell_types.X.hetero` | `cells.X.heterogeneous` | bool | Heterogeneous EMT |
| `cell_types.X.events.time_A_start/end` | `cells.X.emt_lose_apical` | [float, float] or "never" | Apical loss timing |
| `cell_types.X.events.time_B_start/end` | `cells.X.emt_lose_basal` | [float, float] or "never" | Basal loss timing |
| `cell_types.X.events.time_S_start/end` | `cells.X.emt_lose_straightness` | [float, float] or "never" | Straightness loss timing |
| `cell_types.X.events.time_P_start/end` | `cells.X.emt_polarized_running` | [float, float] or "never" | Polarized running timing |

### Toy Model

| Current Path | Proposed | Type | Description |
|--------------|----------|------|-------------|
| `general.t_end` | `t_end` | float | Simulation end time |
| `general.dt` | `dt` | float | Time step |
| `general.random_seed` | `seed` | int | Random seed |
| `general.N` | `count` | int | Number of cells |
| `general.soft_radius` | `radius` | float | Cell radius |
| `general.repulsion_strength` | `repulsion` | float | Repulsion force |
| `general.mu` | `friction` | float | Friction coefficient |
| `general.domain_size` | `domain` | [float, float] | Domain dimensions |
| `general.boundary_type` | `boundary` | string | Boundary type |
| `general.running_speed` | `running_speed` | float | Running speed |
| `general.tumble_speed` | `tumble_speed` | float | Tumbling speed |
| `general.running_duration` | `running_duration` | float | Running phase duration |
| `general.tumbling_duration` | `tumbling_duration` | float | Tumbling phase duration |
| `general.tumbling_period` | `tumbling_period` | float | Polarity change period |

---

## Running Mode Enum

| Current (int) | Proposed (string) | Description |
|---------------|-------------------|-------------|
| 0 | `"none"` | No running behavior |
| 1 | `"after_extrusion"` | Run after cell extrudes |
| 2 | `"retain_length"` | Run while retaining cytoskeleton length |
| 3 | `"immediate"` | Start running immediately |

---

## Special Values

| Current | Proposed | Meaning |
|---------|----------|---------|
| `1e308` or `Infinity` | `"never"` | Event never occurs |
| `{r: 30, g: 100, b: 20}` | `"#1E6414"` | Color as hex string |

---

## Example: Minimal EHT Config

```toml
model = "EHT"
t_end = 100
seed = 123

[cells.control]
count = 30

[cells.emt]
count = 10
emt_lose_apical = [5, 20]
emt_lose_basal = [5, 20]
```

All other parameters use sensible defaults.

---

## Example: Full Chick Embryo Control (Current ~120 lines → Proposed ~35 lines)

```toml
model = "EHT"

# Simulation
t_end = 54
dt = 0.1
seed = 0
substeps = 40

# Geometry
tissue_width = 10
tissue_height = 8
perimeter = 20
aspect_ratio = 0
full_circle = false

# Physics
friction = 0.2
p_division_in_plane = 0.8

# Display
view_width = 15

[cells.default]
radius_hard = 0.3
radius_soft = 1.0
lifespan = [10, 21]
k_apical = 5
k_apical_div = 10
k_nuclei_apical = 2
k_nuclei_basal = 2
k_repulsion = 1
k_straightness = 15
k_junction = 1
k_cytoskeleton = 5
p_inm = 0.0

[cells.control]
count = 45
color = "#008000"

[cells.emt]
count = 0
location = "bottom"
color = "#FF00FF"
```

---

## Migration Strategy

### Phase 1: Support Both Formats
1. Detect format by presence of `model` key at root level
2. If old format: convert internally to new format
3. All internal code works with new format only

### Phase 2: Provide Conversion Tool
```bash
npm run cli -- convert-params old.toml -o new.toml
```

### Phase 3: Deprecate Old Format
1. Show warning when loading old format
2. Update documentation
3. Eventually remove old parser

---

## Implementation Checklist

- [ ] Define new TypeScript types for simplified params
- [ ] Create parser for new TOML format
- [ ] Create converter from old format to new
- [ ] Update defaults to use new structure
- [ ] Update UI components for new param paths
- [ ] Update batch parameter definitions
- [ ] Convert example preset files
- [ ] Update documentation
