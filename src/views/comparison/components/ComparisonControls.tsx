/**
 * Controls for the comparison view: shared timeline transport
 * (play/pause/step/reset/seek) plus per-scenario visibility toggles.
 */
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

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
