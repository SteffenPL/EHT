/**
 * Single simulation tab - combines canvas, controls, params, and stats.
 */
import { useSimulation } from '@/hooks';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationControls } from './SimulationControls';
import { Card } from '../ui/card';
import type { SimulationParams } from '@/core/types';

export interface SingleSimulationTabProps {
  params: SimulationParams;
}

export function SingleSimulationTab({ params }: SingleSimulationTabProps) {
  const {
    state,
    isRunning,
    isComplete,
    time,
    start,
    pause,
    reset,
    step,
  } = useSimulation({ params });

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
    </div>
  );
}
