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

  // === Running Behavior ===
  'cell_types.run': `Probability that an extruded cell becomes a "running" cell (migrating along the basal membrane). Value between 0 and 1.`,

  'cell_types.running_speed': `Speed of running cells in $\\mu m/h$.`,

  'cell_types.running_mode': `Running behavior mode:
- **0**: No running
- **1**: Run after extrusion (leaves tissue)
- **2**: Run but retain length (stays connected)
- **3**: Immediate running (starts running instantly)`,
};

/**
 * Get description for a parameter by its key.
 * Returns undefined if no description exists.
 */
export function getParameterDescription(key: string): string | undefined {
  return PARAMETER_DESCRIPTIONS[key];
}
