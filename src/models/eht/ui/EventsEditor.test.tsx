// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventEditor } from './EventsEditor';
import type { EventDefinition } from '../params/types';
import { CellCyclePhase } from '../params/types';

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

describe('EventEditor dependency timing UI', () => {
  it('shows dependency-controlled start time and keeps end editable', () => {
    const upstream = makeEvent('upstream', { start: 6, end: 12 });
    const downstream = makeEvent('downstream', { prereq: 'upstream', start: 0, end: 12 });

    render(
      <EventEditor
        event={downstream}
        allEvents={[upstream, downstream]}
        onChange={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('time(upstream)')).toBeInTheDocument();
    expect(screen.getByText(/sampled after that event fires/i)).toBeInTheDocument();

    const endField = within(screen.getByText('End').parentElement!).getByRole('textbox');
    expect(endField).not.toBeDisabled();
  });

  it('surfaces dependency validation issues', () => {
    const looping = makeEvent('looping', { prereq: 'looping' });

    render(
      <EventEditor
        event={looping}
        allEvents={[looping]}
        onChange={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/cannot depend on itself/i)).toBeInTheDocument();
  });
});
