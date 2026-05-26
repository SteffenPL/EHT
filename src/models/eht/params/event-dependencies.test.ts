import { describe, expect, it } from 'vitest';
import { analyzeEventDependencies } from './event-dependencies';
import type { EventDefinition } from './types';
import { CellCyclePhase } from './types';

function makeEvent(id: string, overrides: Partial<EventDefinition> = {}): EventDefinition {
  return {
    id,
    type: 'parameter_change',
    start: 0,
    end: 10,
    period: 0,
    probability: '1',
    prereq: null,
    cell_cycle_phase: CellCyclePhase.Any,
    target_parameter: 'R_soft',
    formula: 'old_value',
    ...overrides,
  } as EventDefinition;
}

describe('analyzeEventDependencies', () => {
  it('orders dependencies before dependent events', () => {
    const analysis = analyzeEventDependencies([
      makeEvent('downstream', { prereq: 'upstream' }),
      makeEvent('upstream'),
    ]);

    expect(analysis.hasErrors).toBe(false);
    expect(analysis.orderedEvents.map(event => event.id)).toEqual(['upstream', 'downstream']);
  });

  it('preserves stable order for independent events', () => {
    const analysis = analyzeEventDependencies([
      makeEvent('first'),
      makeEvent('second'),
      makeEvent('third'),
    ]);

    expect(analysis.orderedEvents.map(event => event.id)).toEqual(['first', 'second', 'third']);
  });

  it('reports self dependencies', () => {
    const analysis = analyzeEventDependencies([
      makeEvent('loop', { prereq: 'loop' }),
    ]);

    expect(analysis.hasErrors).toBe(true);
    expect(analysis.issues).toContainEqual(expect.objectContaining({
      type: 'self_dependency',
      eventId: 'loop',
      dependencyId: 'loop',
    }));
  });

  it('reports dependency cycles', () => {
    const analysis = analyzeEventDependencies([
      makeEvent('a', { prereq: 'b' }),
      makeEvent('b', { prereq: 'a' }),
    ]);

    expect(analysis.hasErrors).toBe(true);
    expect(analysis.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'cycle', eventId: 'a' }),
      expect.objectContaining({ type: 'cycle', eventId: 'b' }),
    ]));
  });

  it('reports missing dependencies', () => {
    const analysis = analyzeEventDependencies([
      makeEvent('downstream', { prereq: 'missing' }),
    ]);

    expect(analysis.hasErrors).toBe(true);
    expect(analysis.issues).toContainEqual(expect.objectContaining({
      type: 'missing_dependency',
      eventId: 'downstream',
      dependencyId: 'missing',
    }));
  });

  it('reports duplicate ids', () => {
    const analysis = analyzeEventDependencies([
      makeEvent('same'),
      makeEvent('same'),
    ]);

    expect(analysis.hasErrors).toBe(true);
    expect(analysis.issues).toContainEqual(expect.objectContaining({
      type: 'duplicate_id',
      eventId: 'same',
    }));
  });

  it('warns when a dependency may sample after the dependent event ends', () => {
    const analysis = analyzeEventDependencies([
      makeEvent('upstream', { start: 6, end: 12 }),
      makeEvent('downstream', { prereq: 'upstream', end: 10 }),
    ]);

    expect(analysis.hasErrors).toBe(false);
    expect(analysis.issues).toContainEqual(expect.objectContaining({
      type: 'impossible_window',
      severity: 'warning',
      eventId: 'downstream',
      dependencyId: 'upstream',
    }));
  });

  it('reports an error when a dependency cannot start before the dependent event ends', () => {
    const analysis = analyzeEventDependencies([
      makeEvent('upstream', { start: 12, end: 14 }),
      makeEvent('downstream', { prereq: 'upstream', end: 10 }),
    ]);

    expect(analysis.hasErrors).toBe(true);
    expect(analysis.issues).toContainEqual(expect.objectContaining({
      type: 'impossible_window',
      severity: 'error',
      eventId: 'downstream',
      dependencyId: 'upstream',
    }));
  });

  it('does not report window issues for inactive dependent events', () => {
    const analysis = analyzeEventDependencies([
      makeEvent('upstream', { start: 12, end: 14 }),
      makeEvent('downstream', { prereq: 'upstream', end: -1 }),
    ]);

    expect(analysis.issues).not.toContainEqual(expect.objectContaining({
      type: 'impossible_window',
      eventId: 'downstream',
    }));
  });
});
