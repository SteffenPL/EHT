/**
 * Parameter descriptions with LaTeX support for help popovers.
 *
 * Keys use dot notation for nested parameters:
 * - "general.t_end" for general parameters
 * - "cell_types.stiffness_repulsion" for cell type parameters
 */

export const PARAMETER_DESCRIPTIONS: Record<string, string> = {
  // === General Parameters ===
  'general.t_end': `Simulation end time in hours.`,

  'general.random_seed': `Seed for the random number generator. Using the same seed produces identical simulations.`,

  'general.p_div_out': `Probability that cell division occurs perpendicular to the epithelial plane (out-of-plane division). Value between 0 and 1.`,

  'general.full_circle': `If enabled, the tissue forms a complete circular (or elliptical) shape. Otherwise, it's an open arc.`,

  'general.w_init': `Initial width of the tissue domain.`,

  'general.h_init': `Initial height of the tissue domain.`,

  'general.perimeter': `Perimeter of the basal membrane curve. Larger values create a longer tissue.`,

  'general.aspect_ratio': `Aspect ratio $b/a$ of the ellipse. 0 = straight line, 1 = circle.`,

  'general.hard_sphere_nuclei': `If enabled, nuclei are treated as hard spheres that cannot overlap.`,

  'general.mu': `Friction coefficient $\\mu$ for overdamped dynamics:
$$\\mu \\frac{d\\mathbf{x}}{dt} = \\mathbf{F}$$`,

  // === Cell Type Geometry ===
  'cell_types.R_hard': `Hard sphere radius $R_{hard}$. Nuclei cannot overlap within this radius.`,

  'cell_types.R_hard_div': `Hard sphere radius during cell division. Typically smaller to allow daughter cells to separate.`,

  'cell_types.R_soft': `Soft interaction radius $R_{soft}$. Used for repulsive forces between nearby nuclei.`,

  // === Stiffness Parameters ===
  'cell_types.stiffness_repulsion': `Repulsion stiffness $k_{rep}$ between nuclei. Force increases as nuclei approach:
$$F_{rep} = k_{rep} \\cdot \\max\\left(0, \\frac{R_{soft} - d}{R_{soft}}\\right)$$
where $d$ is the distance between nuclei.`,

  'cell_types.k_apical_junction': `Apical junction spring stiffness $k_{aj}$. Controls how strongly neighboring cells' apical points are connected:
$$F_{aj} = k_{aj} \\cdot (d - d_0)$$`,

  'cell_types.k_cytos': `Cytoskeleton relaxation rate. Controls how quickly the cytoskeleton length adjusts to its target length.`,

  'cell_types.stiffness_apical_apical': `Stiffness for apical-to-apical interactions between neighboring cells.`,

  'cell_types.stiffness_apical_apical_div': `Apical-apical stiffness during cell division. Often reduced to allow cells to round up.`,

  'cell_types.stiffness_nuclei_apical': `Spring stiffness connecting the nucleus to the apical surface:
$$F_{na} = k_{na} \\cdot (|\\mathbf{x}_n - \\mathbf{x}_a| - L_{cytos})$$`,

  'cell_types.stiffness_nuclei_basal': `Spring stiffness connecting the nucleus to the basal surface.`,

  'cell_types.stiffness_straightness': `Penalty stiffness for cell straightness. Higher values keep the cell axis more aligned.`,

  // === Division & Lifecycle ===
  'cell_types.lifespan_start': `Time (in hours) when cell division becomes possible. Set to infinity (unchecked) to disable division.`,

  'cell_types.lifespan_end': `Time (in hours) when cell division ends. Division occurs uniformly at random between start and end.`,

  'cell_types.dur_G2': `Duration of G2 phase in hours. During G2, the cell prepares for division.`,

  'cell_types.dur_mitosis': `Duration of mitosis (M phase) in hours. The cell rounds up and then divides.`,

  'cell_types.INM': `**Interkinetic Nuclear Migration** (INM). Probability that the nucleus moves toward the apical surface before division. Value between 0 (no INM) and 1 (always INM).`,

  // === Cell Properties ===
  'cell_types.N_init': `Initial number of cells of this type to spawn at simulation start.`,

  'cell_types.location': `Initial placement along the basal membrane:
- \`"top"\`: upper region
- \`"bottom"\`: lower region
- \`"rest"\`: remaining space
- Numeric value in $[-1, 1]$: specific position`,

  'cell_types.diffusion': `Diffusion coefficient $D$ for random motion of the nucleus. Adds Brownian noise:
$$d\\mathbf{x} = \\sqrt{2D}\\, d\\mathbf{W}$$`,

  'cell_types.basal_damping_ratio': `Damping ratio for basal point motion. Higher values make basal movement more sluggish.`,

  'cell_types.max_basal_junction_dist': `Maximum distance for basal junction formation between neighboring cells.`,

  'cell_types.cytos_init': `Initial cytoskeleton length $L_{cytos}$ (distance from basal to apical point).`,

  'cell_types.basal_membrane_repulsion': `Repulsion strength keeping nuclei inside the basal membrane boundary.`,

  'cell_types.apical_junction_init': `Initial rest length for apical junctions between neighboring cells.`,

  'cell_types.max_cytoskeleton_length': `Maximum allowed cytoskeleton length. Prevents cells from stretching too far.`,

  'cell_types.external_force': `External force formula applied to cell nuclei. A **math.js** expression evaluated per cell per substep.

**Available variables:**
- \`x\`, \`y\`: Cartesian position relative to geometry center
- \`alpha\`: Polar angle ($0$ at bottom, $\\pm\\pi$ at top)
- \`r\`: Distance from geometry center
- \`t\`: Simulation time (hours)
- \`N\`: Unit inward normal from basal geometry (into tissue, toward center). Computed from the basal curve at the cell's projected position. Points in the same direction as \`delta\`.
- \`T\`: Unit tangent vector, perpendicular to \`N\` (counter-clockwise: $T = (-N_y, N_x)$).
- \`delta\`: Signed distance from basal curve ($\\langle \\mathbf{N}, \\mathbf{X} - \\mathbf{a} \\rangle$ where $\\mathbf{N}$ is the inward normal, $\\mathbf{a}$ the projection onto the curve). Positive above, zero on, negative below the basal line. $\\mathbf{N} \\approx \\nabla \\delta$.

**Auto-wrapping:** If the formula does not contain \`T\` or \`N\`, it is treated as a scalar and wrapped as \`-(scalar) * sign(alpha) * T\`, producing tangential flow converging at the bottom ($\\alpha = 0$).

**Examples:**
- \`10\` → magnitude-10 tangential flow toward bottom
- \`5 * T + 3 * N\` → tangential + radial force (used as-is)
- \`10 * sin(t)\` → time-varying tangential flow
- \`delta * N\` → push cells away from basal surface proportional to distance`,

  // === Running Behavior ===
  'cell_types.run': `Probability that an extruded cell becomes a "running" cell (migrating along the basal membrane). Value between 0 and 1.`,

  'cell_types.running_speed': `Speed of running cells in $\\mu m/h$.`,

  'cell_types.running_mode': `Running behavior mode:
- **0**: No running
- **1**: Run after extrusion (leaves tissue)
- **2**: Run but retain length (stays connected)
- **3**: Immediate running (starts running instantly)`,

  // === Cytoskeleton Strain ===
  'cell_types.apical_cytos_strain_init': `Initial apical cytoskeleton strain. Controls the rest length scaling of the apical cytoskeleton:
- **-1**: Inactive (rest length = 0)
- **0**: No change (default)
- **> 0**: Increased rest length
- **< 0**: Decreased rest length

Formula: $drl \\times (1 + \\text{strain})$`,

  'cell_types.basal_cytos_strain_init': `Initial basal cytoskeleton strain. Controls the rest length scaling of the basal cytoskeleton:
- **-1**: Inactive (rest length = 0)
- **0**: No change (default)
- **> 0**: Increased rest length
- **< 0**: Decreased rest length

Formula: $drl \\times (1 + \\text{strain})$`,

  'cell_types.skip_default_events': `List of default event IDs that should NOT apply to this cell type. Use to opt specific cell types out of shared default events.`,

  'general.default_events': `Default events applied to all cell types. Each cell type can opt out of specific events using \`skip_default_events\`.`,

  // === Event System (v1.1.0) ===
  'events.formula': `A **math.js** expression to compute the new parameter value. Available variables:

- \`old_value\`: current value of the parameter
- \`t\`: current simulation time (hours)
- \`dt\`: timestep size
- \`period\`: event repeat interval (0 if one-time)

**Examples:**
- \`old_value * 0.1\` — reduce to 10%
- \`old_value + 1\` — increment by 1
- \`0\` — set to zero
- \`sin(t) + 1\` — oscillate over time`,

  'events.time_range': `Time window during which the event can trigger. A random trigger time is sampled uniformly from this range at cell birth.

Uncheck to disable the event entirely.`,

  'events.period': `Repeat interval in hours.
- **0** = one-time event (fires once at trigger time)
- **> 0** = periodic event (fires at trigger time, then every $period$ hours)`,

  'events.probability': `Probability formula evaluated at cell birth (should return 0\u20131). Can use **math.js** expressions and reference general parameters.

**Examples:**
- \`1\` \u2014 all cells get this event
- \`0.5\` \u2014 50% of cells
- \`0\` \u2014 event disabled
- \`p_div_out\` \u2014 use the division-out probability from general params`,

  'events.prereq': `Prerequisite event that must fire first (on the same cell) before this event can trigger.

Use this to create event chains, e.g., "lose basal adhesion" → "start running".`,

  'events.cell_phase': `Cell cycle phase requirement. The event only fires if the cell has reached this phase:

- **Any**: No restriction
- **Birth**: Immediately after cell birth
- **G1**: After entering G1 phase
- **G2**: After entering G2 phase (preparing for division)
- **Mitosis**: During mitosis`,

  'events.special.lose_apical_adhesion': `Removes the cell's apical connections to neighbors and reduces apical stiffness (\`stiffness_nuclei_apical\`) to 10%. The cell's apical point detaches from the apical junction network.`,

  'events.special.lose_basal_adhesion': `Removes the cell's basal connections and reduces basal stiffness (\`stiffness_nuclei_basal\`) to 10%. The cell detaches from the basal membrane.`,

  'events.special.lose_apical_interface': `Severs apical links between this cell type and other cell types at the interface, while preserving links between cells of the same type. Neighboring non-interface cells are reconnected.`,

  'events.special.start_running': `Sets the cell's running mode to 3 (immediate running), enabling active migration.`,

  'events.special.cell_division': `Triggers cell division. The cell divides into two daughter cells (or resets if \`p_div_out\` applies). Bypasses the normal phase-based division timing.`,

  'events.special.cell_cycle_reset': `Resets the cell's cycle without dividing. The cell gets a fresh lifespan and re-sampled event trigger times, but remains a single cell.`,

  // === Cell Events Tab Overview ===
  'events.overview': `# Cell Events System

The event system controls time-dependent changes to individual cells — adhesion loss, parameter modifications, division, migration, and more. Events can be **shared across all cell types** (default events) or **specific to one cell type** (per-type events).

## Event Types

There are two kinds of events:

- **Special events** (\`S\` badge): Hard-coded actions that modify the simulation state structurally.
- **Parameter change events** (\`P\` badge): Modify a numeric cell parameter using a math.js formula.

## Available Special Events

| Name | Description |
|------|-------------|
| \`lose_apical_adhesion\` | Removes the cell's apical links and reduces apical stiffness to 10%. |
| \`lose_basal_adhesion\` | Removes the cell's basal links and reduces basal stiffness to 10%. |
| \`lose_apical_interface\` | Severs apical links between this cell type and other types at the interface, reconnecting non-interface neighbors. |
| \`start_running\` | Sets running mode to 3, enabling active cell migration along the basal membrane. |
| \`cell_division\` | Triggers cell division into two daughter cells (subject to \`p_div_out\`). |
| \`cell_cycle_reset\` | Resets the cell cycle without dividing — fresh lifespan and re-sampled events. |

## Targetable Cell Parameters

Parameter change events can modify these cell properties via the \`target_parameter\` field:

\`stiffness_nuclei_apical\`, \`stiffness_nuclei_basal\`, \`stiffness_straightness\`, \`stiffness_apical_apical\`, \`R_soft\`, \`R_hard\`, \`eta_A\`, \`eta_B\`, \`running_mode\`, \`apical_cytos_strain\`, \`basal_cytos_strain\`

## Trigger Mechanisms

### Time-based triggering
Each event has a **start** and **end** time. At cell birth, a random trigger time $t_{trigger}$ is sampled uniformly from $[\\text{start}, \\text{end}]$. The event fires when the simulation crosses $t_{trigger}$.

### Phase-gated triggering
Events can require a **cell cycle phase** (\`Any\`, \`G1\`, \`G2\`, \`Mitosis\`, \`Division\`). The event only fires once the cell has reached that phase.

### Phase-only triggering
When both start and end are **0**, the event fires as soon as the phase requirement is met (no time sampling). This is used for INM events that should activate exactly when G2 begins.

### Periodic events
If \`period > 0\`, the event repeats every \`period\` hours after its initial trigger.

### One-time events
If \`period = 0\`, the event fires exactly once.

## Probability

The **probability** field is a math.js formula evaluated at cell birth. It determines whether the event is active for that cell. Available variables:

- \`p_div_out\` — division-out probability (general param)
- \`mu\`, \`h_init\`, \`w_init\`, \`t_end\` — general simulation parameters
- \`INM\` — interkinetic nuclear migration probability (cell type param)

**Examples:** \`1\` (always), \`0.5\` (50%), \`INM\` (use cell type's INM value), \`p_div_out\` (use division probability)

If the probability evaluates to 0, the event is skipped entirely for that cell. If it evaluates to a value less than 1, each cell independently samples whether the event is active.

## Formula (Parameter Change Events)

The \`formula\` field is a math.js expression that computes the new parameter value. Available variables:

- \`old_value\` — current value of the target parameter
- \`t\` — current simulation time (hours)
- \`dt\` — timestep size
- \`period\` — event repeat interval
- \`p_div_out\`, \`mu\`, \`h_init\`, \`w_init\`, \`t_end\` — general params

**Examples:**
- \`old_value * 0.1\` — reduce to 10%
- \`old_value + 0.01 * dt\` — gradual increase over time
- \`-1\` — set to -1 (e.g. for strain = inactive)
- \`2\` — set to 2

## Prerequisites

Events can depend on other events via the \`prereq\` field. A prerequisite event must have fired (on the same cell) before the dependent event can trigger. This creates event chains, e.g.:

1. \`lose_apical_adhesion\` fires → 2. \`start_running\` fires (prereq: \`lose_apical\`)

## Default vs Per-Type Events

**Default events** (in \`general.default_events\`) apply to all cell types. Each cell type can opt out of specific default events using the **skip** checkboxes.

**Per-type events** (in \`cell_types.X.events_v2\`) apply only to that cell type. If a per-type event has the same ID as a default event, the per-type event takes precedence.

## Daughter Cell Events

When a cell divides, daughter cells get **fresh event states** — new trigger times are sampled, and one-time events can fire again. This ensures each cell has its own independent event lifecycle.

## Built-in Default Events

The following events are included by default:

| Event | Probability | Phase | Description |
|-------|-------------|-------|-------------|
| Cell Division | \`p_div_out\` | Division | Triggers cell division when the cell reaches Division phase |
| Increase R_hard | \`1\` | Any | Gradually increases hard radius: \`old_value + 0.01 * dt\` (periodic, every 0.1h) |
| INM: Contract Apical | \`INM\` | G2 | Sets apical strain to -1 (contracts apical cytoskeleton) |
| INM: Extend Basal | \`1\` (prereq: apical) | G2 | Sets basal strain to 2 (extends basal cytoskeleton) |
`,
};

/**
 * Get description for a parameter by its key.
 * Returns undefined if no description exists.
 */
export function getParameterDescription(key: string): string | undefined {
  return PARAMETER_DESCRIPTIONS[key];
}
