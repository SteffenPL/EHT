// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { cloneDeep } from 'lodash-es';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import { EHTParametersTab } from './ParametersTab';

describe('EHTParametersTab formula previews', () => {
  it('shows the formula term preview after the mode in parameter formula rows', () => {
    const params = cloneDeep(DEFAULT_EHT_PARAMS);
    params.general.formulas = {
      ...params.general.formulas,
      perimeter: 'init_value * (sinwave(t, period=6, from=1, to=1.1))',
    };

    render(<EHTParametersTab params={params} onChange={vi.fn()} />);

    const preview = screen.getByLabelText('Formula preview: sin');
    const row = preview.parentElement;
    const rowText = row?.textContent ?? '';

    expect(preview).toHaveTextContent('sin');
    expect(rowText.indexOf('*')).toBeLessThan(rowText.indexOf('sin'));
    expect(rowText.indexOf('sin')).toBeLessThan(rowText.indexOf('f(x)'));
  });
});
