/**
 * Scenario definitions for the perimeter-oscillation comparison view.
 *
 * Two EHT parameter variants are simulated side by side with a shared end
 * time and independent timestep sizes on a shared elapsed-time timeline:
 *
 *  - "oscillating": the tissue perimeter follows a 120 bpm heartbeat
 *    with a ±10% amplitude, driven by a general perimeter formula.
 *  - "averaged": an averaged model - constant perimeter at the mean and
 *    parameters adapted to describe the mean behaviour of the oscillating
 *    tissue (adaptations are placeholders to be tuned per experiment).
 */
import type { EHTParams } from '@/models/eht/params/types';
import { createDefaultEHTParams } from '@/models/eht/params/defaults';
import type { EHTRenderStyleOverrides } from '@/models/eht/renderer';

// --- Comparison timing defaults ------------------------------------------------

/** Heart rate of the oscillating scenario [beats per minute]. */
const HEART_RATE_BPM = 120;

/** Fractional perimeter change around the mean (±10%). */
const PERIMETER_AMPLITUDE = 0.1;

/** Physics substeps per timestep. */
const N_SUBSTEPS = 10;

/** Shared random seed so both scenarios start from the same tissue. */
const RANDOM_SEED = 42;

/** Period of one heartbeat in simulation hours (simulation t is in hours). */
export const HEART_PERIOD_H = 1 / (HEART_RATE_BPM * 60);

/** Default oscillating scenario timestep [hours]. */
export const DT_H = 0.0001;

/** Default end time for comparison runs [hours]. */
export const T_END_H = 6;

/** Default timestep for the averaged model [hours]. */
export const AVERAGED_DT_H = 0.1;

/** Smallest timestep accepted by either comparison scenario [hours]. */
export const MIN_COMPARISON_DT_H = 1e-7;

/** Maximum shared playback frames and retained history samples per scenario. */
export const MAX_COMPARISON_FRAMES = 100_000;

// -----------------------------------------------------------------------------

export interface ComparisonScenario {
  id: string;
  label: string;
  description: string;
  /** Plot series color (CSS hex). */
  color: string;
  /** Render style overrides for superimposed drawing on one canvas. */
  style?: EHTRenderStyleOverrides;
  buildParams(): EHTParams;
}

/** Default timing and common seeding for a comparison scenario. */
function baseComparisonParams(dt: number): EHTParams {
  const params = createDefaultEHTParams();
  params.general.t_end = T_END_H;
  params.general.dt = dt;
  params.general.n_substeps = N_SUBSTEPS;
  params.general.random_seed = RANDOM_SEED;
  return params;
}

/** Perimeter oscillating with the heartbeat around its initial (mean) value. */
const OSCILLATING_PERIMETER_FORMULA =
  `sinwave(t, period=1 / (${HEART_RATE_BPM} * 60), ` +
  `from=init_value * ${1 - PERIMETER_AMPLITUDE}, to=init_value * ${1 + PERIMETER_AMPLITUDE})`;

/**
 * The comparison scenarios, in draw order: the first entry is drawn first
 * (fully opaque), later entries are drawn on top (semi-transparent tints).
 */
export const COMPARISON_SCENARIOS: ComparisonScenario[] = [
  {
    id: 'oscillating',
    label: 'Oscillating (120 bpm)',
    description:
      'Perimeter oscillates sinusoidally with a 120 bpm heartbeat (±10% around the mean).',
    color: '#dc2626',
    buildParams(): EHTParams {
      const params = baseComparisonParams(DT_H);
      params.general.formulas = {
        ...params.general.formulas,
        perimeter: OSCILLATING_PERIMETER_FORMULA,
      };
      // Note: params are used as built (derived from DEFAULT_EHT_PARAMS). The
      // zod schema cannot parse in-memory params because defaults contain
      // Infinity event bounds; validation happens at TOML/URL IO boundaries.
      return params;
    },
  },
  {
    id: 'averaged',
    label: 'Averaged model',
    description:
      'Perimeter constant at the oscillation mean; parameters adapted to describe the mean behaviour.',
    color: '#2563eb',
    style: {
      theme: {
        apicalPoint: 0x3b82f6,
        basalPoint: 0x94a3b8,
        apicalLink: 0x2563eb,
        basalLink: 0x64748b,
        cytoskeleton: 0x0ea5e9,
        membrane: 0x777777,
      },
      alphaScale: 0.55,
    },
    buildParams(): EHTParams {
      const params = baseComparisonParams(AVERAGED_DT_H);

      // Averaged-model adaptations: the perimeter stays constant at the
      // oscillation mean (the default value). Adapt stiffnesses and other
      // parameters here so the averaged model reproduces the mean behaviour
      // of the oscillating tissue (to be tuned per experiment).

      // Distinguish cell bodies from the oscillating scenario
      params.cell_types.control.color = { r: 30, g: 90, b: 200 };
      if (params.cell_types.emt) {
        params.cell_types.emt.color = { r: 90, g: 70, b: 200 };
      }

      return params;
    },
  },
];
