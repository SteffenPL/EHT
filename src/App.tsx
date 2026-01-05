import { useState } from 'react';
import { AppLayout } from './components/layout';
import { SingleSimulationTab } from './components/simulation';
import { BatchTab } from './components/batch';
import { ParameterConfigView } from './components/params';
import { createDefaultSimulationConfig } from './core/params';
import type { SimulationConfig } from './core/params';

function App() {
  const [config, setConfig] = useState<SimulationConfig>(createDefaultSimulationConfig());

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-7">
          <SingleSimulationTab params={config.params} />
        </section>
        <section className="lg:col-span-5">
          <ParameterConfigView config={config} onConfigChange={setConfig} />
        </section>
        <section className="lg:col-span-12">
          <BatchTab config={config} onConfigChange={setConfig} />
        </section>
      </div>
    </AppLayout>
  );
}

export default App;
