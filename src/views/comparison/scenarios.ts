/**
 * Scenario definitions for the perimeter-oscillation comparison view.
 *
 * Two EHT parameter variants are simulated side by side on a shared
 * timeline (identical dt / t_end / seed, so lockstep frame k shows both
 * scenarios at simulation time k * dt):
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

// --- Shared comparison timing -------------------------------------------------

/** Heart rate of the oscillating scenario [beats per minute]. */
const HEART_RATE_BPM = 120;

/** Fractional perimeter change around the mean (±10%). */
const PERIMETER_AMPLITUDE = 0.1;

/** Number of heartbeat cycles to simulate. */
const CYCLES = 30;

/** Timesteps per heartbeat cycle (temporal resolution of the oscillation). */
const STEPS_PER_CYCLE = 12;

/** Physics substeps per timestep. */
const N_SUBSTEPS = 10;

/** Shared random seed so both scenarios start from the same tissue. */
const RANDOM_SEED = 42;

/** Period of one heartbeat in simulation hours (simulation t is in hours). */
export const HEART_PERIOD_H = 1 / (HEART_RATE_BPM * 60);

/** Timestep shared by all scenarios [hours]. */
export const DT_H = HEART_PERIOD_H / STEPS_PER_CYCLE;

/** End time shared by all scenarios [hours]. */
export const T_END_H = CYCLES * HEART_PERIOD_H;

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

/** Common timing and seeding for every comparison scenario. */
function baseComparisonParams(): EHTParams {
  const params = createDefaultEHTParams();
  params.general.t_end = T_END_H;
  params.general.dt = DT_H;
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
      const params = baseComparisonParams();
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
      const params = baseComparisonParams();

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
