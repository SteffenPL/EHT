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

  it('toggles extended inline sizing without opening the modal', () => {
    renderParameterConfig();

    const workspace = screen.getByTestId('parameter-workspace-scroll');
    const extendButton = screen.getByRole('button', { name: 'Extend' });

    expect(extendButton).toHaveAttribute('aria-expanded', 'false');
    expect(workspace.className).toContain('h-[min(560px,calc(100vh-280px))]');

    fireEvent.click(extendButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true');
    expect(workspace.className).toContain('h-[min(78vh,900px)]');

    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));

    expect(screen.getByRole('button', { name: 'Extend' })).toHaveAttribute('aria-expanded', 'false');
    expect(workspace.className).toContain('h-[min(560px,calc(100vh-280px))]');
  });

  it('opens a maximized modal that renders the same editor controls', () => {
    renderParameterConfig();

    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('parameter-workspace-modal-scroll')).toHaveClass('overflow-y-auto');
    expect(within(dialog).getByRole('button', { name: 'Load' })).toBeInTheDocument();
    expect(within(dialog).getByText('Parameter Ranges')).toBeInTheDocument();
    expect(within(dialog).getByText('Batch Sampling')).toBeInTheDocument();
  });
});
