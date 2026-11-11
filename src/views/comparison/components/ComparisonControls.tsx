/**
 * Controls for the comparison view: shared timeline transport, per-scenario
 * timing inputs, and visibility toggles.
 */
import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

export interface ComparisonControlsProps {
  isRunning: boolean;
  isCatchingUp: boolean;
  isComplete: boolean;
  /** Currently displayed frame index. */
  frameIndex: number;
  /** Frames computed so far (for slider track context). */
  computedFrames: number;
  /** Total frames until t_end. */
  totalFrames: number;
  /** Simulation time at the current frame [hours]. */
  time: number;
  /** End time [hours]. */
  tEnd: number;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSeekFrame: (frame: number) => void;
  /** Timing values and update callback for each scenario. */
  scenarioTimings: { id: string; label: string; dt: number; nSubsteps: number }[];
  minTimeStep: number;
  onEndTimeChange: (value: number) => void;
  onTimingChange: (id: string, key: 'dt' | 'n_substeps', value: number) => void;
  /** Scenario legend entries: { id, label, color }. */
  scenarios: { id: string; label: string; color: string }[];
  renderOptions: Record<string, boolean>;
  onRenderOptionsChange: (options: Record<string, boolean>) => void;
}

/** Format simulation time: short runs are shown in seconds, longer in hours. */
function formatTime(t: number): string {
  if (t < 0.5) return `${(t * 3600).toFixed(2)} s`;
  return `${t.toFixed(2)} h`;
}

function TimingNumberInput({
  label,
  value,
  min,
  max,
  integer = false,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  integer?: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= min && (!integer || Number.isInteger(parsed)) && (max === undefined || parsed <= max)) {
      onCommit(parsed);
    } else {
      setDraft(String(value));
    }
  };

  return (
    <Input
      aria-label={label}
      type="number"
      min={min}
      max={max}
      step={integer ? 1 : 'any'}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

export function ComparisonControls({
  isRunning,
  isCatchingUp,
  isComplete,
  frameIndex,
  computedFrames,
  totalFrames,
  time,
  tEnd,
  onStart,
  onPause,
  onStep,
  onReset,
  onSeekFrame,
  scenarioTimings,
  minTimeStep,
  onEndTimeChange,
  onTimingChange,
  scenarios,
  renderOptions,
  onRenderOptionsChange,
}: ComparisonControlsProps) {
  const sliderMax = Math.max(totalFrames, 1);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {isRunning ? (
          <Button size="sm" variant="outline" onClick={onPause}>
            <Pause className="mr-1 h-4 w-4" /> Pause
          </Button>
        ) : (
          <Button size="sm" onClick={onStart} disabled={isComplete && frameIndex >= totalFrames}>
            <Play className="mr-1 h-4 w-4" /> Play
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onStep} disabled={isComplete && frameIndex >= totalFrames}>
          <SkipForward className="mr-1 h-4 w-4" /> Step
        </Button>
        <Button size="sm" variant="outline" onClick={onReset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
        <span className="ml-2 text-sm tabular-nums text-muted-foreground">
          {formatTime(time)} / {formatTime(tEnd)}
          <span className="ml-2 text-xs">
            (frame {frameIndex}/{totalFrames}, computed {computedFrames}
            {isCatchingUp ? ', computing…' : ''})
          </span>
        </span>
      </div>

      <Slider
        value={[Math.min(frameIndex, sliderMax)]}
        min={0}
        max={sliderMax}
        step={1}
        onValueChange={(values) => onSeekFrame(values[0] ?? 0)}
        aria-label="Timeline"
      />

      <label className="block max-w-xs space-y-1 text-xs text-muted-foreground">
        Shared end time (t_end, h)
        <TimingNumberInput
          label="Shared end time t_end (hours)"
          value={tEnd}
          min={0.000001}
          onCommit={onEndTimeChange}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {scenarioTimings.map((scenario) => (
          <fieldset key={scenario.id} className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">{scenario.label} timing</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs text-muted-foreground">
                Timestep (h)
                <TimingNumberInput
                  label={`${scenario.label} timestep (hours)`}
                  min={minTimeStep}
                  value={scenario.dt}
                  onCommit={(value) => onTimingChange(scenario.id, 'dt', value)}
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Substeps
                <TimingNumberInput
                  label={`${scenario.label} physics substeps`}
                  min={1}
                  integer
                  value={scenario.nSubsteps}
                  onCommit={(value) => onTimingChange(scenario.id, 'n_substeps', value)}
                />
              </label>
            </div>
          </fieldset>
        ))}
      </div>

      {/* Scenario visibility (doubles as the color legend) */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {scenarios.map((scenario) => (
          <label key={scenario.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={renderOptions[`show_${scenario.id}`] !== false}
              onCheckedChange={(checked) =>
                onRenderOptionsChange({ ...renderOptions, [`show_${scenario.id}`]: checked === true })
              }
            />
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: scenario.color }}
            />
            {scenario.label}
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={renderOptions.showTissueLines === true}
            onCheckedChange={(checked) =>
              onRenderOptionsChange({ ...renderOptions, showTissueLines: checked === true })
            }
          />
          Tissue lines
        </label>
      </div>
    </Card>
  );
}
