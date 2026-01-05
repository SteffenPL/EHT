import { useState } from 'react';
import { AppLayout } from './components/layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { SingleSimulationTab } from './components/simulation';
import { BatchTab } from './components/batch';
import { DEFAULT_PARAMS } from './core';
import type { SimulationParams } from './core/types';

function App() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);

  return (
    <AppLayout>
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="single">Single Simulation</TabsTrigger>
          <TabsTrigger value="batch">Batch Simulations</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <SingleSimulationTab params={params} onParamsChange={setParams} />
        </TabsContent>

        <TabsContent value="batch">
          <BatchTab baseParams={params} onParamsChange={setParams} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

export default App;
