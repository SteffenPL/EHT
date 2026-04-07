import { describe, it, expect } from 'vitest';
import { generateFormulaEvents } from './init';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import type { EHTParams } from '../params/types';

describe('generateFormulaEvents', () => {
  it('does nothing when formulas maps are empty', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    generateFormulaEvents(params);
    expect(params.general.global_events).toHaveLength(0);
  });

  it('generates global event for general formula', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
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
    const params = structuredClone(DEFAULT_EHT_PARAMS);
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
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    params.general.perimeter = 200;
    params.general.formulas = { perimeter: 'init_value * 0.5' };
    generateFormulaEvents(params);

    const generated = params.general.global_events.find(e => e.id === '__formula_perimeter');
    expect(generated!.init_value).toBe(200);
  });

  it('generates events for multiple formulas', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
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
