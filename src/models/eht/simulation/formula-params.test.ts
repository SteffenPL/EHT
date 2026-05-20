import { describe, it, expect } from 'vitest';
import { generateFormulaEvents, initializeEHTSimulation } from './init';
import { performTimestep } from './step';
import { createInitialEHTState } from '../types';
import { LEGACY_DEFAULT_EHT_PARAMS } from '../params/defaults';
import { computeEllipseFromPerimeter } from '../params/geometry';
import { SeededRandom } from '@/core/math/random';

describe('generateFormulaEvents', () => {
  it('does nothing when formulas maps are empty', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    generateFormulaEvents(params);
    expect(params.general.global_events).toHaveLength(0);
  });

  it('generates global event for general formula', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    params.general.formulas = { perimeter: 'init_value - t * 2' };
    generateFormulaEvents(params);

    const generated = params.general.global_events.find(e => e.id === '__formula_perimeter');
    expect(generated).toBeDefined();
    expect(generated!.formula).toBe('init_value - t * 2');
    expect(generated!.init_value).toBe(105);
    expect(generated!.period).toBe('dt');
    expect(generated!.start).toBe(0);
    expect(generated!.end).toBe(Infinity);
    expect(generated!.target_parameter).toBe('general.perimeter');
  });

  it('generates per-cell event for cell type formula', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    params.cell_types.control.formulas = { R_soft: '1.2 + 0.1 * sin(t)' };
    generateFormulaEvents(params);

    const events = params.cell_types.control.events_v2!;
    const generated = events.find(e => e.id === '__formula_R_soft');
    expect(generated).toBeDefined();
    expect(generated!.type).toBe('parameter_change');
    if (generated!.type === 'parameter_change') {
      expect(generated!.formula).toBe('1.2 + 0.1 * sin(t)');
      expect(generated!.init_value).toBe(1.2);
      expect(generated!.target_parameter).toBe('R_soft');
    }
  });

  it('captures correct init_value from current param', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    params.general.perimeter = 200;
    params.general.formulas = { perimeter: 'init_value * 0.5' };
    generateFormulaEvents(params);

    const generated = params.general.global_events.find(e => e.id === '__formula_perimeter');
    expect(generated!.init_value).toBe(200);
  });

  it('evaluates formula at t=0 to set initial param value', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    params.general.perimeter = 999; // preset value that should be overridden
    params.general.formulas = { perimeter: '100 * (1 + t)' };
    generateFormulaEvents(params);

    // At t=0: 100 * (1 + 0) = 100, overrides the preset 999
    expect(params.general.perimeter).toBe(100);
    // init_value captures the original preset
    const generated = params.general.global_events.find(e => e.id === '__formula_perimeter');
    expect(generated!.init_value).toBe(999);
  });

  it('evaluates cell type formula at t=0 to set initial param value', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    params.cell_types.control.stiffness_nuclei_apical = 50;
    params.cell_types.control.formulas = { stiffness_nuclei_apical: 'init_value * 0.1' };
    generateFormulaEvents(params);

    // At t=0: 50 * 0.1 = 5
    expect(params.cell_types.control.stiffness_nuclei_apical).toBe(5);
  });

  it('generates events for multiple formulas', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    params.general.formulas = {
      perimeter: 'init_value - t',
      aspect_ratio: '1 + 0.1 * t',
    };
    generateFormulaEvents(params);

    expect(params.general.global_events).toHaveLength(2);
    expect(params.general.global_events.find(e => e.id === '__formula_perimeter')).toBeDefined();
    expect(params.general.global_events.find(e => e.id === '__formula_aspect_ratio')).toBeDefined();
  });
});

describe('integration: formula-driven parameters', () => {
  it('perimeter formula updates geometry each timestep', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    params.general.formulas = { perimeter: 'init_value - t * 2' };

    const state = createInitialEHTState();
    const rng = new SeededRandom('test');
    initializeEHTSimulation(params, state, rng);

    const initPerimeter = state.params!.general.perimeter;
    expect(initPerimeter).toBe(105);

    // First timestep: formula fires at t=0, gives 105 - 0*2 = 105 (no change yet)
    performTimestep(state, params, new SeededRandom('step_1'));

    // Second timestep: t has advanced, formula gives 105 - t*2 < 105
    performTimestep(state, params, new SeededRandom('step_2'));

    expect(state.params!.general.perimeter).toBeLessThan(initPerimeter);

    // Geometry should have been rebuilt with new curvatures
    const expectedGeom = computeEllipseFromPerimeter(
      state.params!.general.perimeter,
      state.params!.general.aspect_ratio
    );
    expect(state.geometry!.curvature_1).toBeCloseTo(expectedGeom.curvature_1, 6);
  });

  it('cell type formula updates per-cell parameter each timestep', () => {
    const params = structuredClone(LEGACY_DEFAULT_EHT_PARAMS);
    params.cell_types.control.formulas = { stiffness_nuclei_apical: '99' };

    const state = createInitialEHTState();
    const rng = new SeededRandom('test');
    initializeEHTSimulation(params, state, rng);

    // Run a timestep — formula fires and sets stiffness to 99
    performTimestep(state, params, new SeededRandom('step_1'));

    // All control cells should have updated stiffness
    const controlCells = state.cells.filter(c => c.typeIndex === 'control');
    expect(controlCells.length).toBeGreaterThan(0);

    for (const cell of controlCells) {
      expect(cell.stiffness_nuclei_apical).toBe(99);
    }
  });
});
