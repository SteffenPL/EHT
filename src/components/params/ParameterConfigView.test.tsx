// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cloneDeep } from 'lodash-es';
import { ParameterConfigView } from './ParameterConfigView';
import { ModelProvider } from '@/contexts/ModelContext';
import { DEFAULT_TIME_SAMPLES, type SimulationConfig } from '@/core/params';
import { DEFAULT_EHT_PARAMS } from '@/models/eht/params/defaults';
import '@/models';

function createConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    params: cloneDeep(DEFAULT_EHT_PARAMS),
    parameterRanges: [],
    timeSamples: { ...DEFAULT_TIME_SAMPLES },
    seedsPerConfig: 1,
    ...overrides,
  };
}

function renderParameterConfig(config = createConfig()) {
  const onConfigChange = vi.fn();

  const view = render(
    <ModelProvider>
      <ParameterConfigView config={config} onConfigChange={onConfigChange} />
    </ModelProvider>
  );

  return { ...view, onConfigChange };
}

describe('ParameterConfigView', () => {
  it('routes parameter edits through the shared live config callback', () => {
    const { onConfigChange } = renderParameterConfig();

    fireEvent.change(screen.getAllByDisplayValue('48')[0], { target: { value: '72' } });

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          general: expect.objectContaining({ t_end: 72 }),
        }),
        parameterRanges: [],
        seedsPerConfig: 1,
      })
    );
  });

  it('uses the workspace as the vertical scroll owner while Cell Types keeps horizontal overflow only', () => {
    renderParameterConfig();

    const workspace = screen.getByTestId('parameter-workspace-scroll');
    expect(workspace).toHaveClass('overflow-y-auto');

    const cellTypesTab = screen.getByRole('tab', { name: 'Cell Types' });
    fireEvent.pointerDown(cellTypesTab);
    fireEvent.mouseDown(cellTypesTab);
    fireEvent.click(cellTypesTab);

    const cellTypesScroll = screen.getByTestId('cell-types-table-scroll');
    expect(cellTypesScroll).toHaveClass('overflow-x-auto');
    expect(cellTypesScroll).not.toHaveClass('overflow-y-auto');
    expect(cellTypesScroll.className).not.toContain('max-h');
  });

  it('uses the expanded inline workspace sizing without a separate extend control', () => {
    renderParameterConfig();

    const workspace = screen.getByTestId('parameter-workspace-scroll');

    expect(workspace.className).toContain('h-[min(78vh,900px)]');
    expect(screen.queryByRole('button', { name: 'Extend' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Collapse' })).not.toBeInTheDocument();
  });

  it('shows parameter format version and public micron unit state separately from model controls', () => {
    renderParameterConfig();

    const summary = screen.getByTestId('parameter-format-summary');
    expect(within(summary).getByText('Parameter format v2.0.0')).toBeInTheDocument();
    expect(within(summary).getByText('Length fields in microns')).toBeInTheDocument();
  });

  it('shows migration and curation warnings when metadata carries them', () => {
    const params = cloneDeep(DEFAULT_EHT_PARAMS);
    params.metadata.migrated_from = '1.5.0';
    params.metadata.curation_warnings = ['Review formula for cell_types.control.R_soft; v2 stores this target in microns.'];

    renderParameterConfig(createConfig({ params }));

    const summary = screen.getByTestId('parameter-format-summary');
    expect(within(summary).getByText('Migrated from v1.5.0')).toBeInTheDocument();
    expect(within(summary).getByText(/cell_types\.control\.R_soft/)).toBeInTheDocument();
  });

  it('places batch setup in the model parameter tab row', () => {
    renderParameterConfig();

    const batchTab = screen.getByRole('tab', { name: 'Batch Setup' });
    expect(batchTab).toBeInTheDocument();

    fireEvent.pointerDown(batchTab);
    fireEvent.mouseDown(batchTab);
    fireEvent.click(batchTab);

    const modelFrame = screen.getByTestId('model-parameter-panel-frame');
    expect(within(modelFrame).getByText('No parameter ranges defined. Add parameters to sweep.')).toBeInTheDocument();
    expect(within(modelFrame).getByRole('combobox', { name: 'Add parameter range' })).toBeInTheDocument();
    expect(within(modelFrame).getByText('Batch Sampling')).toBeInTheDocument();
    expect(within(modelFrame).getByLabelText('Seeds per configuration')).toBeInTheDocument();
  });

  it('opens a maximized modal that renders the same editor controls', () => {
    renderParameterConfig();

    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('parameter-workspace-modal-scroll')).toHaveClass('overflow-y-auto');
    expect(within(dialog).getByRole('button', { name: 'Load' })).toBeInTheDocument();
    const batchTab = within(dialog).getByRole('tab', { name: 'Batch Setup' });
    expect(batchTab).toBeInTheDocument();
    fireEvent.pointerDown(batchTab);
    fireEvent.mouseDown(batchTab);
    fireEvent.click(batchTab);
    expect(within(dialog).getByText('Batch Sampling')).toBeInTheDocument();
  });
});
