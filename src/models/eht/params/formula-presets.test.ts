import { evaluate } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { createBasalGeometry } from '@/core/math/basal-geometry';
import { Vector2 } from '@/core/math/vector2';
import { evaluateExternalForceAtPosition } from '../simulation/external-force-formula';
import { FORMULA_PRESETS, FORMULA_QUICK_PRESETS } from './formula-presets';
import { formulaFunctions } from '../simulation/formula-functions';

function composePresetFormula(preset: NonNullable<(typeof FORMULA_QUICK_PRESETS)[number]>) {
  return `init_value * (${preset.generate()})`;
}

describe('FORMULA_PRESETS', () => {
  it('includes a sine wave preset that oscillates between min and max values', () => {
    const preset = FORMULA_PRESETS.find(p => p.name === 'Sine Wave');

    expect(preset).toBeDefined();
    const formula = preset!.generate([10, 1, 2]);

    expect(evaluate(formula, { t: 0, ...formulaFunctions })).toBeCloseTo(1);
    expect(evaluate(formula, { t: 5, ...formulaFunctions })).toBeCloseTo(2);
    expect(evaluate(formula, { t: 10, ...formulaFunctions })).toBeCloseTo(1);
  });

  it('includes a 10% sine quick preset for multiply mode', () => {
    const preset = FORMULA_QUICK_PRESETS.find(p => p.key === 'sine_10_percent_6h');

    expect(preset).toBeDefined();
    expect(preset!.initialValueMode).toBe('multiply');
    const formula = preset!.generate();
    const scope = {
      ...formulaFunctions,
    };

    expect(evaluate(formula, { ...scope, t: 0 })).toBeCloseTo(1);
    expect(evaluate(formula, { ...scope, t: 3 })).toBeCloseTo(1.1);
    expect(evaluate(formula, { ...scope, t: 6 })).toBeCloseTo(1);
  });

  it('generates tangential force toward the bottom', () => {
    const preset = FORMULA_QUICK_PRESETS.find(p => p.key === 'towards_bottom');
    const geometry = createBasalGeometry(1 / 5, 1 / 5);

    expect(preset).toBeDefined();
    expect(preset!.initialValueMode).toBe('multiply');
    expect(preset!.initialValue).toBe(5);
    const formula = composePresetFormula(preset!);

    const force = evaluateExternalForceAtPosition({
      formula,
      initValue: preset!.initialValue,
      position: new Vector2(5, 0),
      basalGeometry: geometry,
      t: 0,
    }).force;

    expect(force.x).toBeCloseTo(0);
    expect(force.y).toBeCloseTo(-5);
  });

  it('generates radius-aware basal repulsion from the current soft radius', () => {
    const preset = FORMULA_QUICK_PRESETS.find(p => p.key === 'basal_repulsion');
    const geometry = createBasalGeometry(0, 0);

    expect(preset).toBeDefined();
    expect(preset!.initialValueMode).toBe('multiply');
    expect(preset!.initialValue).toBe(0.1);
    const formula = composePresetFormula(preset!);

    const outside = evaluateExternalForceAtPosition({
      formula,
      initValue: preset!.initialValue,
      position: new Vector2(0, -1),
      basalGeometry: geometry,
      t: 0,
      cellContext: { R_soft: 2 },
    }).force;
    const insideBeyondRadius = evaluateExternalForceAtPosition({
      formula,
      initValue: preset!.initialValue,
      position: new Vector2(0, 3),
      basalGeometry: geometry,
      t: 0,
      cellContext: { R_soft: 2 },
    }).force;

    expect(outside.x).toBeCloseTo(0);
    expect(outside.y).toBeCloseTo(0.075);
    expect(insideBeyondRadius.x).toBeCloseTo(0);
    expect(insideBeyondRadius.y).toBeCloseTo(0);
  });

  it('generates fluid pressure that starts past two soft radii', () => {
    const preset = FORMULA_QUICK_PRESETS.find(p => p.key === 'fluid_pressure');
    const geometry = createBasalGeometry(0, 0);

    expect(preset).toBeDefined();
    expect(preset!.initialValueMode).toBe('multiply');
    expect(preset!.initialValue).toBe(-0.1);
    const formula = composePresetFormula(preset!);

    const nearBoundary = evaluateExternalForceAtPosition({
      formula,
      initValue: preset!.initialValue,
      position: new Vector2(0, 3),
      basalGeometry: geometry,
      t: 0,
      cellContext: { R_soft: 2 },
    }).force;
    const pastThreshold = evaluateExternalForceAtPosition({
      formula,
      initValue: preset!.initialValue,
      position: new Vector2(0, 5),
      basalGeometry: geometry,
      t: 0,
      cellContext: { R_soft: 2 },
    }).force;

    expect(nearBoundary.y).toBeCloseTo(0);
    expect(pastThreshold.y).toBeCloseTo(-0.025);
  });
});
