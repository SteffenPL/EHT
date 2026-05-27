// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { cloneDeep } from 'lodash-es';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import { EHTCellTypesTab } from './CellTypesTab';

describe('EHTCellTypesTab formula copy actions', () => {
  it('copies a parameter formula to the other cell types', () => {
    const params = cloneDeep(DEFAULT_EHT_PARAMS);
    params.cell_types.control.formulas = { R_soft: 'init_value * 2' };
    params.cell_types.emt.formulas = {};
    const onChange = vi.fn();

    render(<EHTCellTypesTab params={params} onChange={onChange} />);

    const row = screen.getByText('R Soft (um)').closest('tr');
    expect(row).not.toBeNull();
    const copyButtons = within(row!).getAllByRole('button', { name: /Copy R Soft.*other cell types/i });

    fireEvent.click(copyButtons[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].cell_types.emt.formulas.R_soft).toBe('init_value * 2');
  });

  it('copies an external force formula to the other cell types', () => {
    const params = cloneDeep(DEFAULT_EHT_PARAMS);
    params.cell_types.control.external_forces = ['5 * N'];
    params.cell_types.emt.external_forces = ['0'];
    const onChange = vi.fn();

    render(<EHTCellTypesTab params={params} onChange={onChange} />);

    const row = screen.getByText('External Force (1)').closest('tr');
    expect(row).not.toBeNull();
    const copyButtons = within(row!).getAllByRole('button', { name: /Copy External Force.*other cell types/i });

    fireEvent.click(copyButtons[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].cell_types.emt.external_forces[0]).toBe('5 * N');
  });

  it('edits numeric external force rows as scalar initial values', () => {
    const params = cloneDeep(DEFAULT_EHT_PARAMS);
    params.cell_types.control.external_forces = ['0'];
    params.cell_types.emt.external_forces = ['0'];
    const onChange = vi.fn();

    render(<EHTCellTypesTab params={params} onChange={onChange} />);

    const row = screen.getByText('External Force (1)').closest('tr');
    expect(row).not.toBeNull();
    const scalarInputs = within(row!).getAllByDisplayValue('0');

    fireEvent.change(scalarInputs[0], { target: { value: '4' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].cell_types.control.external_forces[0]).toBe('4');
  });
});
