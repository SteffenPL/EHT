/**
 * Simulation view - the main single-simulation workspace.
 *
 * Combines the model selector, live simulation canvas, parameter editor,
 * and batch tools for the currently selected model. This is the former
 * root page of the app, moved behind the view registry.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { SingleSimulationTab } from '@/components/simulation';
import { BatchTab } from '@/components/batch';
import { ParameterConfigView } from '@/components/params';
import { ModelSelector } from '@/components/layout/ModelSelector';
import { DEFAULT_TIME_SAMPLES, decodeParamsFromUrl, clearUrlParams } from '@/core/params';
import type { SimulationConfig } from '@/core/params';
import { useModel } from '@/contexts';

export function SimulationView() {
  const { currentParams, setParams, setModel } = useModel();

  // Load params from URL on mount
  useEffect(() => {
    const urlData = decodeParamsFromUrl();
    if (urlData) {
      setModel(urlData.modelName);
      setParams(urlData.params);
      clearUrlParams();
    }
  }, [setModel, setParams]);

  // Batch-related config (ranges, time samples, seeds) - separate from core params
  const [batchConfig, setBatchConfig] = useState({
    parameterRanges: [] as SimulationConfig['parameterRanges'],
    timeSamples: { ...DEFAULT_TIME_SAMPLES },
    seedsPerConfig: 10,
  });

  // Combine params from context with batch config
  const config: SimulationConfig = useMemo(() => ({
    params: currentParams as SimulationConfig['params'],
    ...batchConfig,
  }), [currentParams, batchConfig]);

  const handleConfigChange = useCallback((newConfig: SimulationConfig) => {
    // Update params via context (keeps model and params in sync)
    setParams(newConfig.params);
    // Update batch config locally
    setBatchConfig({
      parameterRanges: newConfig.parameterRanges,
      timeSamples: newConfig.timeSamples,
      seedsPerConfig: newConfig.seedsPerConfig,
    });
  }, [setParams]);

  return (
    <div className="min-w-0 space-y-4">
      {/* Model selection lives here: it only concerns this view */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Model</span>
        <ModelSelector />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="min-w-0">
          <SingleSimulationTab />
        </section>
        <section className="min-w-0">
          <ParameterConfigView config={config} onConfigChange={handleConfigChange} />
        </section>
        <section className="min-w-0 lg:col-span-2">
          <BatchTab config={config} onConfigChange={handleConfigChange} />
        </section>
      </div>
    </div>
  );
}
