/**
 * Single simulation tab - combines canvas, controls, params, and stats.
 */
import { useState } from 'react';
import { useSimulation, type ParamChangeBehavior } from '@/hooks';
import { useModel } from '@/contexts';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationControls } from './SimulationControls';
import { SimulationTerminal } from './SimulationTerminal';
import { Card } from '../ui/card';

/**
 * Wrapper that provides a key to force remount on model change.
 * This ensures all state (renderer, simulation engine) is recreated with correct params.
 */
export function SingleSimulationTab() {
  const { currentModel } = useModel();

  // Key forces complete remount when model changes
  return <SingleSimulationTabInner key={currentModel.name} />;
}

function SingleSimulationTabInner() {
  const [paramChangeBehavior, setParamChangeBehavior] = useState<ParamChangeBehavior>('run');
  const { currentModel, currentParams } = useModel();

  const {
    state,
    isRunning,
    isComplete,
    time,
    start,
    pause,
    reset,
    step,
  } = useSimulation({ model: currentModel, params: currentParams, paramChangeBehavior });

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <Card className="overflow-hidden">
        <SimulationCanvas
          state={state}
          params={currentParams}
          minHeight={350}
        />
      </Card>

      {/* Controls */}
      <SimulationControls
        isRunning={isRunning}
        isComplete={isComplete}
        time={time}
        endTime={currentParams.general.t_end}
        onStart={start}
        onPause={pause}
        onReset={reset}
        onStep={step}
        paramChangeBehavior={paramChangeBehavior}
        onParamChangeBehaviorChange={setParamChangeBehavior}
      />

      {/* Terminal */}
      <SimulationTerminal />
    </div>
  );
}
