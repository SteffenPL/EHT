// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FormulaEditorDialog } from './FormulaEditorDialog';

vi.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Empty = () => null;

  return {
    ResponsiveContainer: Passthrough,
    LineChart: Passthrough,
    CartesianGrid: Empty,
    XAxis: Empty,
    YAxis: Empty,
    Tooltip: Empty,
    Line: Empty,
  };
});

describe('FormulaEditorDialog', () => {
  it('saves the formula and edited initial value together', () => {
    const onSave = vi.fn();

    render(
      <FormulaEditorDialog
        open
        onOpenChange={vi.fn()}
        fieldName="perimeter"
        label="Perimeter (um)"
        formula="init_value"
        currentNumericValue={100}
        tEnd={48}
        constants={{}}
        context="general"
        onSave={onSave}
        onClear={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Initial value'), { target: { value: '120' } });
    fireEvent.change(within(dialog).getByLabelText('Formula'), { target: { value: 'init_value * 1.05' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }));

    expect(onSave).toHaveBeenCalledWith('init_value * 1.05', 120);
  });

  it('blocks saving when the initial value violates the parameter minimum', () => {
    const onSave = vi.fn();

    render(
      <FormulaEditorDialog
        open
        onOpenChange={vi.fn()}
        fieldName="R_soft"
        label="R Soft (um)"
        formula="init_value"
        currentNumericValue={5}
        initialValueMin={0}
        tEnd={48}
        constants={{}}
        context="cell_type"
        onSave={onSave}
        onClear={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Initial value'), { target: { value: '-1' } });

    expect(within(dialog).getByText('Must be at least 0')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'OK' })).toBeDisabled();
  });

  it('shows a slim preset selector in the preset builders panel', () => {
    render(
      <FormulaEditorDialog
        open
        onOpenChange={vi.fn()}
        fieldName="perimeter"
        label="Perimeter (um)"
        formula="init_value"
        currentNumericValue={100}
        tEnd={48}
        constants={{ heartbeat: 10 }}
        context="general"
        onSave={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText('Preset builders')).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Insert' })).toBeInTheDocument();
    expect(within(dialog).getByText('10% heartbeat')).toBeInTheDocument();
  });
});
