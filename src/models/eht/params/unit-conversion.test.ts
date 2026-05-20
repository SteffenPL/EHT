import { describe, expect, it } from 'vitest';
import type { EHTParams } from './types';
import {
  EHT_PARAM_FORMAT_VERSION,
  isBeforeParamFormatV2,
  isLengthParameterPath,
  legacyParamsToMicrons,
  micronParamsToLegacy,
  scaleValueForPath,
} from './unit-conversion';

function makeParams(): EHTParams {
  return {
    metadata: { model: 'EHT', version: '1.5.0' },
    general: {
      t_end: 48,
      dt: 0.1,
      random_seed: 0,
      full_circle: true,
      w_init: 80,
      h_init: 5,
      mu: 0.2,
      n_substeps: 30,
      alg_dt: 0.01,
      w_screen: 50,
      h_screen: 25,
      p_div_out: 1,
      perimeter: 105,
      aspect_ratio: 1,
      hard_sphere_nuclei: true,
      default_events: [],
      global_events: [],
      formulas: {},
    },
    cell_prop: {},
    cell_types: {
      control: {
        N_init: 25,
        location: '',
        R_hard: 0.4,
        R_hard_div: 0.7,
        R_soft: 1.2,
        color: { r: 30, g: 100, b: 20 },
        dur_G2: 0.5,
        dur_mitosis: 0.5,
        k_apical_junction: 5,
        k_cytos: 5,
        max_cytoskeleton_length: 0.5,
        run: 0,
        running_speed: 1,
        running_mode: 0,
        stiffness_apical_apical: 2,
        stiffness_apical_apical_div: 4,
        stiffness_nuclei_apical: 3,
        stiffness_nuclei_basal: 2,
        stiffness_repulsion: 2,
        stiffness_straightness: 5,
        lifespan_start: 5.5,
        lifespan_end: 6.5,
        INM: 0,
        hetero: false,
        events: {
          time_A_start: Infinity,
          time_A_end: Infinity,
          time_B_start: Infinity,
          time_B_end: Infinity,
          time_S_start: Infinity,
          time_S_end: Infinity,
          time_P_start: Infinity,
          time_P_end: Infinity,
          time_AC_start: Infinity,
          time_AC_end: Infinity,
        },
        events_v2: [],
        apical_cytos_strain_init: 0,
        basal_cytos_strain_init: 0,
        skip_default_events: [],
        diffusion: 0.2,
        basal_damping_ratio: 1,
        max_basal_junction_dist: 4,
        cytos_init: 0,
        basal_membrane_repulsion: 0,
        apical_junction_init: 0,
        external_force: '0',
        formulas: {},
      },
      custom: {
        N_init: 1,
        location: '',
        R_hard: 2,
        R_hard_div: 3,
        R_soft: 4,
        color: { r: 0, g: 0, b: 0 },
        dur_G2: 1,
        dur_mitosis: 1,
        k_apical_junction: 1,
        k_cytos: 1,
        max_cytoskeleton_length: 0,
        run: 0,
        running_speed: 0,
        running_mode: 0,
        stiffness_apical_apical: 1,
        stiffness_apical_apical_div: 1,
        stiffness_nuclei_apical: 1,
        stiffness_nuclei_basal: 1,
        stiffness_repulsion: 1,
        stiffness_straightness: 1,
        lifespan_start: 1,
        lifespan_end: 1,
        INM: 0,
        hetero: false,
        events: {
          time_A_start: Infinity,
          time_A_end: Infinity,
          time_B_start: Infinity,
          time_B_end: Infinity,
          time_S_start: Infinity,
          time_S_end: Infinity,
          time_P_start: Infinity,
          time_P_end: Infinity,
          time_AC_start: Infinity,
          time_AC_end: Infinity,
        },
        events_v2: [],
        apical_cytos_strain_init: 0,
        basal_cytos_strain_init: 0,
        diffusion: 0,
        basal_damping_ratio: 1,
        max_basal_junction_dist: 1,
        cytos_init: 0,
        basal_membrane_repulsion: 0,
        apical_junction_init: 0,
        external_force: '0',
        formulas: {},
        skip_default_events: [],
      },
    },
    constants: {},
  };
}

describe('EHT unit conversion catalog', () => {
  it('round-trips cataloged length fields and leaves non-length values unchanged', () => {
    const legacy = makeParams();
    const publicParams = legacyParamsToMicrons(legacy);
    const roundTripped = micronParamsToLegacy(publicParams);

    expect(publicParams.general.perimeter).toBe(525);
    expect(publicParams.general.w_init).toBe(400);
    expect(publicParams.general.h_init).toBe(25);
    expect(publicParams.general.w_screen).toBe(250);
    expect(publicParams.general.h_screen).toBe(125);
    expect(publicParams.cell_types.control.R_soft).toBe(6);
    expect(publicParams.cell_types.control.R_hard).toBe(2);
    expect(publicParams.cell_types.control.R_hard_div).toBe(3.5);
    expect(publicParams.cell_types.control.running_speed).toBe(5);
    expect(publicParams.cell_types.control.diffusion).toBe(1);
    expect(publicParams.cell_types.custom.R_soft).toBe(20);
    expect(publicParams.cell_types.custom.max_cytoskeleton_length).toBe(0);

    expect(publicParams.general.aspect_ratio).toBe(legacy.general.aspect_ratio);
    expect(publicParams.general.mu).toBe(legacy.general.mu);
    expect(publicParams.cell_types.control.stiffness_repulsion).toBe(legacy.cell_types.control.stiffness_repulsion);
    expect(publicParams.cell_types.control.basal_damping_ratio).toBe(legacy.cell_types.control.basal_damping_ratio);
    expect(roundTripped.general.perimeter).toBeCloseTo(legacy.general.perimeter);
    expect(roundTripped.cell_types.control.R_soft).toBeCloseTo(legacy.cell_types.control.R_soft);
    expect(roundTripped.cell_types.control.R_hard_div).toBeCloseTo(legacy.cell_types.control.R_hard_div);
    expect(roundTripped.cell_types.custom.R_soft).toBeCloseTo(legacy.cell_types.custom.R_soft);
    expect(roundTripped.cell_types.control.stiffness_repulsion).toBe(legacy.cell_types.control.stiffness_repulsion);
  });

  it('recognizes converted parameter range paths without relying on specific cell type names', () => {
    expect(isLengthParameterPath('general.perimeter')).toBe(true);
    expect(isLengthParameterPath('cell_types.custom.R_soft')).toBe(true);
    expect(isLengthParameterPath('cell_types.custom.stiffness_repulsion')).toBe(false);
    expect(scaleValueForPath(4, 'cell_types.custom.R_soft', 'legacy-to-microns')).toBe(20);
    expect(scaleValueForPath(4, 'cell_types.custom.stiffness_repulsion', 'legacy-to-microns')).toBe(4);
  });

  it('compares parameter format versions semantically', () => {
    expect(EHT_PARAM_FORMAT_VERSION).toBe('2.0.0');
    expect(isBeforeParamFormatV2('1.5.0')).toBe(true);
    expect(isBeforeParamFormatV2('2.0.0')).toBe(false);
    expect(isBeforeParamFormatV2('10.0.0')).toBe(false);
  });
});
