/**
 * Comparison view: high-frequency perimeter oscillation vs. averaged model.
 *
 * Runs two fixed EHT scenarios in lockstep on a shared timeline and renders
 * them superimposed on one canvas (oscillating scenario in normal colors,
 * averaged model tinted and semi-transparent), with per-scenario visibility
 * toggles and comparative statistics plots below.
 */
import { useMemo, useState } from 'react';
import { SimulationCanvas } from '@/components/simulation';
import { Card } from '@/components/ui/card';
import { COMPARISON_SCENARIOS } from './scenarios';
import {
  comparisonCanvasModel,
  buildComparisonParams,
  type ComparisonFrame,
  type ComparisonScenarioFrame,
} from './comparisonRenderer';
import { useLockstepSimulations, type LockstepScenarioDefinition } from './useLockstepSimulations';
import { ComparisonControls } from './components/ComparisonControls';
import { ScenarioPlots } from './components/ScenarioPlots';

export function ComparisonView() {
  // Resolve scenario params once; the definitions object identity stays
  // stable so the lockstep runner only re-initializes on remount.
  const [scenarioDefs] = useState<LockstepScenarioDefinition[]>(() =>
    COMPARISON_SCENARIOS.map((scenario) => ({ scenario, params: scenario.buildParams() }))
  );

  const sim = useLockstepSimulations(scenarioDefs);

  const [renderOptions, setRenderOptions] = useState<Record<string, boolean>>(() => ({
    showTissueLines: false,
    ...Object.fromEntries(COMPARISON_SCENARIOS.map((s) => [`show_${s.id}`, true])),
  }));

  const comparisonParams = useMemo(
    () => buildComparisonParams(scenarioDefs.map((def) => def.params)),
    [scenarioDefs]
  );

  const frame: ComparisonFrame | null = useMemo(() => {
    const scenarios: ComparisonScenarioFrame[] = [];
    for (const def of scenarioDefs) {
      const state = sim.states[def.scenario.id];
      if (state) scenarios.push({ scenario: def.scenario, params: def.params, state });
    }
    return scenarios.length > 0 ? { scenarios } : null;
  }, [scenarioDefs, sim.states]);

  return (
    <div className="min-w-0 space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Compares a high-frequency perimeter oscillation ({'120 bpm, ±10%'}) with an averaged
        EHT model (constant perimeter at the mean, parameters adapted to describe the mean
        behaviour). Both scenarios run in lockstep from the same initial tissue; the canvas
        superimposes them and the plots below track statistics over time.
      </p>

      <Card className="overflow-hidden">
        <SimulationCanvas
          state={frame}
          params={comparisonParams}
          model={comparisonCanvasModel}
          renderOptions={renderOptions}
          minHeight={350}
          maxHeight={600}
        />
      </Card>

      <ComparisonControls
        isRunning={sim.isRunning}
        isCatchingUp={sim.isCatchingUp}
        isComplete={sim.isComplete}
        frameIndex={sim.frameIndex}
        computedFrames={sim.computedFrames}
        totalFrames={sim.totalFrames}
        time={sim.time}
        tEnd={sim.tEnd}
        onStart={sim.start}
        onPause={sim.pause}
        onStep={sim.step}
        onReset={sim.reset}
        onSeekFrame={sim.seekToFrame}
        scenarios={COMPARISON_SCENARIOS.map(({ id, label, color }) => ({ id, label, color }))}
        renderOptions={renderOptions}
        onRenderOptionsChange={setRenderOptions}
      />

      <ScenarioPlots
        scenarios={COMPARISON_SCENARIOS}
        stats={sim.stats}
        visibleFrames={sim.computedFrames + 1}
        dt={sim.dt}
      />
    </div>
  );
}
