import { useState, useCallback, useMemo } from 'react';
import { AppLayout } from './components/layout';
import { SingleSimulationTab } from './components/simulation';
import { BatchTab } from './components/batch';
import { ParameterConfigView } from './components/params';
import { DEFAULT_TIME_SAMPLES } from './core/params';
import type { SimulationConfig } from './core/params';
import { ModelProvider, useModel, MessagesProvider } from './contexts';

// Import models to register them
import './models';

function AppContent() {
  const { currentParams, setParams } = useModel();

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
    <ModelProvider>
      <MessagesProvider>
        <AppContent />
      </MessagesProvider>
    </ModelProvider>
  );
}

export default App;
