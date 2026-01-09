/**
 * Model-specific parameter panel with tabs.
 * Provides a container with tabs (Parameters, Cell Types, Simulation)
 * into which each model can render its own UI components.
 */
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useModel } from '@/contexts';
import type { BaseSimulationParams } from '@/core/registry';

export interface ParameterTabProps<P = any> {
  params: P;
  onChange: (params: P) => void;
  disabled?: boolean;
}

export interface ModelParameterPanelProps {
  params: BaseSimulationParams;
  onChange: (params: BaseSimulationParams) => void;
  disabled?: boolean;
}

export function ModelParameterPanel({ params, onChange, disabled }: ModelParameterPanelProps) {
  const { currentModel } = useModel();

  // Get model-specific UI components
  const WarningBanner = currentModel.ui?.WarningBanner;
  const ParametersTab = currentModel.ui?.ParametersTab;
  const CellTypesTab = currentModel.ui?.CellTypesTab;
  const SimulationTab = currentModel.ui?.SimulationTab;

  // Determine which tabs to show based on what the model provides
  const hasCellTypes = !!CellTypesTab;
  const hasSimulation = !!SimulationTab;

  return (
    <div className="h-full flex flex-col">
      {/* Warning banner - always visible above tabs */}
      {WarningBanner && (
        <div className="shrink-0 p-2">
          <WarningBanner params={params} />
        </div>
      )}

      <Tabs defaultValue="parameters" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start shrink-0">
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          {hasCellTypes && <TabsTrigger value="celltypes">Cell Types</TabsTrigger>}
          {hasSimulation && <TabsTrigger value="simulation">Simulation</TabsTrigger>}
        </TabsList>

        <TabsContent value="parameters" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {ParametersTab ? (
                <ParametersTab params={params} onChange={onChange} disabled={disabled} />
              ) : (
                <div className="text-sm text-muted-foreground">
                  No parameter UI defined for this model.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {hasCellTypes && (
          <TabsContent value="celltypes" className="flex-1 mt-0 overflow-auto">
            <div className="p-4">
              <CellTypesTab params={params} onChange={onChange} disabled={disabled} />
            </div>
          </TabsContent>
        )}

        {hasSimulation && (
          <TabsContent value="simulation" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                <SimulationTab params={params} onChange={onChange} disabled={disabled} />
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
