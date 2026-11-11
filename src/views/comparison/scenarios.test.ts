/**
 * Regression tests for the comparison view scenarios: shared lockstep
 * timing, perimeter oscillation behaviour, and identical initial tissue.
 */
import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '@/core/simulation';
import { EHTHeadlessModel } from '@/models/eht/headless';
import { AVERAGED_DT_H, COMPARISON_SCENARIOS, DT_H, T_END_H, HEART_PERIOD_H } from './scenarios';
import type { EHTSimulationState } from '@/models/eht/types';

function perimeterOf(state: EHTSimulationState): number {
  return state.params!.general.perimeter;
}

describe('comparison scenarios', () => {
  it('scenarios use independent default timing and share a seed', () => {
    const paramsList = COMPARISON_SCENARIOS.map((s) => s.buildParams());
    expect(paramsList[0].general.dt).toBe(DT_H);
    expect(paramsList[1].general.dt).toBe(AVERAGED_DT_H);
    expect(paramsList.map((params) => params.general.t_end)).toEqual([T_END_H, T_END_H]);
    expect(paramsList[1].general.random_seed).toBe(paramsList[0].general.random_seed);
    // One full heartbeat cycle spans STEPS_PER_CYCLE frames
    expect(HEART_PERIOD_H / DT_H).toBe(12);
  });

  it('has distinct ids, colors, and cell body colors', () => {
    const ids = COMPARISON_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const colors = COMPARISON_SCENARIOS.map((s) => s.color);
    expect(new Set(colors).size).toBe(colors.length);
    const [oscillating, averaged] = COMPARISON_SCENARIOS.map((s) => s.buildParams());
    expect(averaged.cell_types.control.color).not.toEqual(oscillating.cell_types.control.color);
  });

  it('oscillating scenario varies the perimeter; averaged keeps it constant', () => {
    const oscillating = COMPARISON_SCENARIOS.find((s) => s.id === 'oscillating')!;
    const averaged = COMPARISON_SCENARIOS.find((s) => s.id === 'averaged')!;

    const run = (scenario: typeof oscillating) => {
      const engine = new SimulationEngine({
        model: EHTHeadlessModel,
        params: scenario.buildParams(),
        snapshotInterval: Number.POSITIVE_INFINITY,
      });
      const perimeters: number[] = [perimeterOf(engine.getState() as EHTSimulationState)];
      for (let i = 0; i < 24; i++) {
        engine.step();
        perimeters.push(perimeterOf(engine.getState() as EHTSimulationState));
      }
      return perimeters;
    };

    const oscPerimeters = run(oscillating);
    const avgPerimeters = run(averaged);

    const oscRange = Math.max(...oscPerimeters) - Math.min(...oscPerimeters);
    const avgRange = Math.max(...avgPerimeters) - Math.min(...avgPerimeters);

    // ±10% around the mean of 105 engine units => range ≈ 21
    expect(oscRange).toBeGreaterThan(10);
    expect(avgRange).toBe(0);

    // Oscillation bounds stay within ±10% of the mean
    const mean = avgPerimeters[0];
    expect(Math.min(...oscPerimeters)).toBeGreaterThan(mean * 0.89);
    expect(Math.max(...oscPerimeters)).toBeLessThan(mean * 1.11);
  });

  it('both scenarios start from the same initial tissue', () => {
    const [a, b] = COMPARISON_SCENARIOS.map((s) => {
      const engine = new SimulationEngine({
        model: EHTHeadlessModel,
        params: s.buildParams(),
        snapshotInterval: Number.POSITIVE_INFINITY,
      });
      return engine.getState() as EHTSimulationState;
    });

    expect(a.cells.length).toBe(b.cells.length);
    for (let i = 0; i < a.cells.length; i++) {
      expect(a.cells[i].pos.x).toBe(b.cells[i].pos.x);
      expect(a.cells[i].pos.y).toBe(b.cells[i].pos.y);
    }
  });
});
