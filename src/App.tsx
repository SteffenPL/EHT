import { useState, useCallback, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { SingleSimulationTab } from './components/simulation';
import { BatchTab } from './components/batch';
import { ParameterConfigView } from './components/params';
import { MarkdownPage } from './components/MarkdownPage';
import { DEFAULT_TIME_SAMPLES, decodeParamsFromUrl, clearUrlParams } from './core/params';
import type { SimulationConfig } from './core/params';
import { ModelProvider, useModel, MessagesProvider } from './contexts';

// Import models to register them
import './models';

// Static doc imports
import docsIndex from './docs/index.md?raw';
import ehtModel from './docs/EHT/model.md?raw';
import ehtStatistics from './docs/EHT/statistics.md?raw';

function AppContent() {
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
    seedsPerConfig: 1,
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
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section>
          <SingleSimulationTab />
        </section>
        <section>
          <ParameterConfigView config={config} onConfigChange={handleConfigChange} />
        </section>
        <section className="lg:col-span-2">
          <BatchTab config={config} onConfigChange={handleConfigChange} />
        </section>
      </div>
    </AppLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ModelProvider>
        <MessagesProvider>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/docs" element={<MarkdownPage content={docsIndex} />} />
            <Route path="/docs/eht/model" element={<MarkdownPage content={ehtModel} />} />
            <Route path="/docs/eht/statistics" element={<MarkdownPage content={ehtStatistics} />} />
          </Routes>
        </MessagesProvider>
      </ModelProvider>
    </BrowserRouter>
  );
}

export default App;
