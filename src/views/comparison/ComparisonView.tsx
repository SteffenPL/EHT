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
import { COMPARISON_SCENARIOS, MAX_COMPARISON_FRAMES } from './scenarios';
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
  // Keep scenario params in state so timing edits rebuild their engines and
  // reset the comparison timeline.
  const [definitions, setDefinitions] = useState<LockstepScenarioDefinition[]>(() =>
    COMPARISON_SCENARIOS.map((scenario) => ({ scenario, params: scenario.buildParams() }))
  );

  const sim = useLockstepSimulations(definitions);

  const updateTiming = (id: string, key: 't_end' | 'dt' | 'n_substeps', value: number) => {
    setDefinitions((current) => {
      const updated = current.map((def) => def.scenario.id === id
        ? { ...def, params: { ...def.params, general: { ...def.params.general, [key]: value } } }
        : def
      );
      const minimumDt = Math.min(...updated.map((def) => def.params.general.dt));
      const maximumEnd = Math.max(...updated.map((def) => def.params.general.t_end));
      if (Math.ceil(maximumEnd / minimumDt - 1e-9) > MAX_COMPARISON_FRAMES) return current;
      return updated;
    });
  };

  const [renderOptions, setRenderOptions] = useState<Record<string, boolean>>(() => ({
    showTissueLines: false,
    ...Object.fromEntries(COMPARISON_SCENARIOS.map((s) => [`show_${s.id}`, true])),
  }));

  const comparisonParams = useMemo(
    () => buildComparisonParams(definitions.map((def) => def.params)),
    [definitions]
  );

  const frame: ComparisonFrame | null = useMemo(() => {
    const scenarios: ComparisonScenarioFrame[] = [];
    for (const def of definitions) {
      const state = sim.states[def.scenario.id];
      if (state) scenarios.push({ scenario: def.scenario, params: def.params, state });
    }
    return scenarios.length > 0 ? { scenarios } : null;
  }, [definitions, sim.states]);

  return (
    <div className="min-w-0 space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Compares a high-frequency perimeter oscillation ({'120 bpm, ±10%'}) with an averaged
        EHT model (constant perimeter at the mean, parameters adapted to describe the mean
        behaviour). Both scenarios start from the same tissue and are shown at matching
        elapsed times; the canvas superimposes them and the plots track statistics over time.
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
        scenarioTimings={definitions.map(({ scenario, params }) => ({
          id: scenario.id,
          label: scenario.label,
          tEnd: params.general.t_end,
          dt: params.general.dt,
          nSubsteps: params.general.n_substeps,
        }))}
        maxEndTime={Math.min(...definitions.map((def) => def.params.general.dt)) * MAX_COMPARISON_FRAMES}
        minTimeStep={Math.max(...definitions.map((def) => def.params.general.t_end)) / MAX_COMPARISON_FRAMES}
        onTimingChange={updateTiming}
        scenarios={COMPARISON_SCENARIOS.map(({ id, label, color }) => ({ id, label, color }))}
        renderOptions={renderOptions}
        onRenderOptionsChange={setRenderOptions}
      />

      <ScenarioPlots
        scenarios={COMPARISON_SCENARIOS}
        stats={sim.stats}
        scenarioTimes={sim.scenarioTimes}
        currentTime={sim.time}
      />
    </div>
  );
}
