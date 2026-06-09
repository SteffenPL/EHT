// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { cloneDeep } from 'lodash-es';
import { BatchTab } from './BatchTab';
import { ModelProvider } from '@/contexts/ModelContext';
import { DEFAULT_PARAMS, DEFAULT_TIME_SAMPLES, type SimulationConfig } from '@/core/params';
import '@/models';

function createConfig(): SimulationConfig {
  return {
    params: cloneDeep(DEFAULT_PARAMS),
    parameterRanges: [],
    timeSamples: { ...DEFAULT_TIME_SAMPLES, start: 0, end: 0, step: 1 },
    seedsPerConfig: 2,
  };
}

function BatchHarness() {
  const [config, setConfig] = useState<SimulationConfig>(createConfig());

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const next = structuredClone(config);
          next.params.general.t_end += 1;
          setConfig(next);
        }}
      >
        Bump End Time
      </button>
      <BatchTab config={config} onConfigChange={setConfig} />
    </>
  );
}

describe('BatchTab', () => {
  it('clears stale batch results when the shared config changes', async () => {
    render(
      <ModelProvider>
        <BatchHarness />
      </ModelProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Batch' }));

    await screen.findByText('2 snapshots loaded');

    fireEvent.click(screen.getByRole('button', { name: 'Bump End Time' }));

    await waitFor(() => {
      expect(screen.queryByText('2 snapshots loaded')).not.toBeInTheDocument();
    });
  });
});
