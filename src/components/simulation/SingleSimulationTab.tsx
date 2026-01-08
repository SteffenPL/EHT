/**
 * Single simulation tab - combines canvas, controls, params, and stats.
 */
import { useState, useEffect, useRef } from 'react';
import { useSimulation, type ParamChangeBehavior } from '@/hooks';
import { useModel, useMessages } from '@/contexts';
import type { EHTParams } from '@/models/eht/params';
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
  const [paramChangeBehavior, setParamChangeBehavior] = useState<ParamChangeBehavior>('init');
  const { currentModel, currentParams } = useModel();
  const { addMessage, clearMessages } = useMessages();
  const hasWarnedRef = useRef(false);

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

  // Validate perimeter constraint for EHT model
  useEffect(() => {
    // Only check for EHT model
    if (currentModel.name !== 'EHT') return;

    const ehtParams = currentParams as EHTParams;
    const { N_init, perimeter } = ehtParams.general;
    const { max_basal_junction_dist } = ehtParams.cell_prop;

    // Clear messages on param change
    clearMessages();
    hasWarnedRef.current = false;

    // Check constraint: N * max_basal_dist > perimeter (only for non-zero perimeter)
    if (perimeter > 0 && ehtParams.general.full_circle) {
      const maxCoverage = N_init * max_basal_junction_dist;
      if (maxCoverage <= perimeter) {
        addMessage(
          `Perimeter constraint violated: N_init (${N_init}) × max_basal_junction_dist (${max_basal_junction_dist.toFixed(1)}) = ${maxCoverage.toFixed(1)} ≤ perimeter (${perimeter.toFixed(1)}). Cells may not cover the membrane.`,
          'warning'
        );
        hasWarnedRef.current = true;
      }
    }
  }, [currentModel.name, currentParams, addMessage, clearMessages]);

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
