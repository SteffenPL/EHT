/**
 * Model-specific parameter panel with tabs.
 * Provides a container with tabs (Parameters, Cell Types, Simulation)
 * into which each model can render its own UI components.
 */
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useModel } from '@/contexts';
import { ParameterRangeList } from '@/components/batch/ParameterRangeList';
import type { ParameterRange } from '@/core/batch';
import type { BaseSimulationParams } from '@/core/registry';

export interface ParameterTabProps<P = any> {
  params: P;
  onChange: (params: P) => void;
  disabled?: boolean;
}

export interface ModelParameterPanelProps {
  params: BaseSimulationParams;
  onChange: (params: BaseSimulationParams) => void;
  parameterRanges?: ParameterRange[];
  onParameterRangesChange?: (ranges: ParameterRange[]) => void;
  disabled?: boolean;
}

export function ModelParameterPanel({
  params,
  onChange,
  parameterRanges,
  onParameterRangesChange,
  disabled,
}: ModelParameterPanelProps) {
  const { currentModel } = useModel();

  // Get model-specific UI components
  const WarningBanner = currentModel.ui?.WarningBanner;
  const ParametersTab = currentModel.ui?.ParametersTab;
  const ConstantsTab = currentModel.ui?.ConstantsTab;
  const CellTypesTab = currentModel.ui?.CellTypesTab;
  const CellEventsTab = currentModel.ui?.CellEventsTab;
  const SimulationTab = currentModel.ui?.SimulationTab;

  // Determine which tabs to show based on what the model provides
  const hasConstants = !!ConstantsTab;
  const hasCellTypes = !!CellTypesTab;
  const hasCellEvents = !!CellEventsTab;
  const hasSimulation = !!SimulationTab;
  const hasParameterRanges = !!parameterRanges && !!onParameterRangesChange;

  return (
    <div className="flex flex-col">
      {/* Warning banner - always visible above tabs */}
      {WarningBanner && (
        <div className="shrink-0 p-2">
          <WarningBanner params={params} onChange={onChange} disabled={disabled} />
        </div>
      )}

      <Tabs defaultValue="parameters" className="flex flex-col">
        <TabsList className="h-auto min-h-9 w-full flex-wrap justify-start shrink-0">
          <TabsTrigger value="parameters" className="text-xs">Parameters</TabsTrigger>
          {hasConstants && <TabsTrigger value="constants" className="text-xs">Constants</TabsTrigger>}
          {hasCellTypes && <TabsTrigger value="celltypes" className="text-xs">Cell Types</TabsTrigger>}
          {hasCellEvents && <TabsTrigger value="cellevents" className="text-xs">Events</TabsTrigger>}
          {hasSimulation && <TabsTrigger value="simulation" className="text-xs">Simulation</TabsTrigger>}
          {hasParameterRanges && <TabsTrigger value="ranges" className="text-xs">Parameter Ranges</TabsTrigger>}
        </TabsList>

        <TabsContent value="parameters" className="mt-0">
          <div className="p-4 space-y-3">
            {ParametersTab ? (
              <ParametersTab params={params} onChange={onChange} disabled={disabled} />
            ) : (
              <div className="text-sm text-muted-foreground">
                No parameter UI defined for this model.
              </div>
            )}
          </div>
        </TabsContent>

        {hasConstants && (
          <TabsContent value="constants" className="mt-0">
            <div className="p-4 space-y-3">
              <ConstantsTab params={params} onChange={onChange} disabled={disabled} />
            </div>
          </TabsContent>
        )}

        {hasCellTypes && (
          <TabsContent value="celltypes" className="mt-0">
            <div className="p-4">
              <CellTypesTab params={params} onChange={onChange} disabled={disabled} />
            </div>
          </TabsContent>
        )}

        {hasCellEvents && (
          <TabsContent value="cellevents" className="mt-0">
            <div className="p-4">
              <CellEventsTab params={params} onChange={onChange} disabled={disabled} />
            </div>
          </TabsContent>
        )}

        {hasSimulation && (
          <TabsContent value="simulation" className="mt-0">
            <div className="p-4 space-y-3">
              <SimulationTab params={params} onChange={onChange} disabled={disabled} />
            </div>
          </TabsContent>
        )}

        {hasParameterRanges && (
          <TabsContent value="ranges" className="mt-0">
            <div className="p-4">
              <ParameterRangeList
                ranges={parameterRanges}
                onChange={onParameterRangesChange}
                baseParams={params}
                disabled={disabled}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
