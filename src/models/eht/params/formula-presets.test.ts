import { evaluate } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { createBasalGeometry } from '@/core/math/basal-geometry';
import { Vector2 } from '@/core/math/vector2';
import { evaluateExternalForceAtPosition } from '../simulation/external-force-formula';
import { FORMULA_PRESETS, FORMULA_QUICK_PRESETS } from './formula-presets';
import { formulaFunctions } from '../simulation/formula-functions';

describe('FORMULA_PRESETS', () => {
  it('includes a sine wave preset that oscillates between min and max values', () => {
    const preset = FORMULA_PRESETS.find(p => p.name === 'Sine Wave');

    expect(preset).toBeDefined();
    const formula = preset!.generate([10, 1, 2]);

    expect(evaluate(formula, { t: 0, ...formulaFunctions })).toBeCloseTo(1);
    expect(evaluate(formula, { t: 5, ...formulaFunctions })).toBeCloseTo(2);
    expect(evaluate(formula, { t: 10, ...formulaFunctions })).toBeCloseTo(1);
  });

  it('includes a 10% heartbeat quick preset using the heartbeat constant', () => {
    const preset = FORMULA_QUICK_PRESETS.find(p => p.key === 'heartbeat_10_percent');

    expect(preset).toBeDefined();
    const formula = preset!.generate();
    const scope = {
      init_value: 100,
      heartbeat: 10,
      ...formulaFunctions,
    };

    expect(evaluate(formula, { ...scope, t: 0 })).toBeCloseTo(100);
    expect(evaluate(formula, { ...scope, t: 5 })).toBeCloseTo(110);
    expect(evaluate(formula, { ...scope, t: 10 })).toBeCloseTo(100);
  });

  it('generates radius-aware basal repulsion from the supplied soft radius', () => {
    const preset = FORMULA_QUICK_PRESETS.find(p => p.key === 'basal_repulsion');
    const geometry = createBasalGeometry(0, 0);

    expect(preset).toBeDefined();
    const formula = preset!.generate({ softRadius: 2 });

    const outside = evaluateExternalForceAtPosition({
      formula,
      position: new Vector2(0, -1),
      basalGeometry: geometry,
      t: 0,
    }).force;
    const insideBeyondRadius = evaluateExternalForceAtPosition({
      formula,
      position: new Vector2(0, 3),
      basalGeometry: geometry,
      t: 0,
    }).force;

    expect(outside.x).toBeCloseTo(0);
    expect(outside.y).toBeCloseTo(3);
    expect(insideBeyondRadius.x).toBeCloseTo(0);
    expect(insideBeyondRadius.y).toBeCloseTo(0);
  });

  it('generates fluid pressure that starts past two soft radii', () => {
    const preset = FORMULA_QUICK_PRESETS.find(p => p.key === 'fluid_pressure');
    const geometry = createBasalGeometry(0, 0);

    expect(preset).toBeDefined();
    const formula = preset!.generate({ softRadius: 2 });

    const nearBoundary = evaluateExternalForceAtPosition({
      formula,
      position: new Vector2(0, 3),
      basalGeometry: geometry,
      t: 0,
    }).force;
    const pastThreshold = evaluateExternalForceAtPosition({
      formula,
      position: new Vector2(0, 5),
      basalGeometry: geometry,
      t: 0,
    }).force;

    expect(nearBoundary.y).toBeCloseTo(0);
    expect(pastThreshold.y).toBeCloseTo(1);
  });
});
