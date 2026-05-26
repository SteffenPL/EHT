// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cloneDeep } from 'lodash-es';
import { EHTCellEventsTab } from './CellEventsTab';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import { CellCyclePhase, type EventDefinition } from '../params/types';

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

describe('EHTCellEventsTab dependency display', () => {
  it('shows dependent event start as dependency-controlled in compact cards', () => {
    const params = cloneDeep(DEFAULT_EHT_PARAMS);
    params.general.default_events = [];
    params.cell_types.control.events_v2 = [
      makeEvent('upstream', { start: 6, end: 12 }),
      makeEvent('downstream', { prereq: 'upstream', start: 0, end: 12 }),
    ];

    render(<EHTCellEventsTab params={params} onChange={vi.fn()} />);

    expect(screen.getByText('time(upstream)')).toBeInTheDocument();
    expect(screen.getByText('Dep')).toBeInTheDocument();
  });

  it('marks invalid dependency cards visibly', () => {
    const params = cloneDeep(DEFAULT_EHT_PARAMS);
    params.general.default_events = [];
    params.cell_types.control.events_v2 = [
      makeEvent('looping', { prereq: 'looping' }),
    ];

    render(<EHTCellEventsTab params={params} onChange={vi.fn()} />);

    expect(screen.getByText('Invalid')).toBeInTheDocument();
  });
});
