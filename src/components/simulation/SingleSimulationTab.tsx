/**
 * Single simulation tab - combines canvas, controls, params, and stats.
 */
import { useSimulation } from '@/hooks';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationControls } from './SimulationControls';
import { StatsPanel } from './StatsPanel';
import { ParameterPanel } from '../params';
import { Card } from '../ui/card';
import type { SimulationParams } from '@/core/types';

export interface SingleSimulationTabProps {
  params: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
}

export function SingleSimulationTab({ params, onParamsChange }: SingleSimulationTabProps) {
  const {
    state,
    isRunning,
    isComplete,
    time,
    start,
    pause,
    reset,
    step,
    setParams,
  } = useSimulation({ params });

  const handleParamsChange = (newParams: SimulationParams) => {
    onParamsChange(newParams);
    setParams(newParams);
  };

  const handleScreenshot = () => {
    // TODO: Implement screenshot
    console.log('Screenshot not yet implemented');
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    console.log('CSV export not yet implemented');
  };

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <Card className="overflow-hidden">
        <SimulationCanvas
          state={state}
          params={params}
          width={900}
          height={350}
          className="w-full"
        />
      </Card>

      {/* Controls */}
      <SimulationControls
        isRunning={isRunning}
        isComplete={isComplete}
        time={time}
        endTime={params.general.t_end}
        onStart={start}
        onPause={pause}
        onReset={reset}
        onStep={step}
      />

      {/* Params and Stats side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ParameterPanel
          params={params}
          onChange={handleParamsChange}
          disabled={isRunning}
        />
        <StatsPanel
          state={state}
          params={params}
          onScreenshot={handleScreenshot}
          onExportCSV={handleExportCSV}
        />
      </div>
    </div>
  );
}
