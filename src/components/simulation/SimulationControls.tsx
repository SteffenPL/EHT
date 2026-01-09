/**
 * Simulation control buttons (play, pause, reset, step).
 */
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { ParamChangeBehavior } from '@/hooks/useSimulation';

export interface SimulationControlsProps {
  isRunning: boolean;
  isComplete: boolean;
  time: number;
  endTime: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  paramChangeBehavior: ParamChangeBehavior;
  onParamChangeBehaviorChange: (behavior: ParamChangeBehavior) => void;
}

export function SimulationControls({
  isRunning,
  isComplete,
  time,
  endTime,
  onStart,
  onPause,
  onReset,
  onStep,
  paramChangeBehavior,
  onParamChangeBehaviorChange,
}: SimulationControlsProps) {
  const progress = endTime > 0 ? (time / endTime) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        {isRunning ? (
          <Button onClick={onPause} variant="outline" size="sm">
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        ) : (
          <Button onClick={onStart} disabled={isComplete} size="sm">
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
        )}

        <Button onClick={onStep} disabled={isRunning || isComplete} variant="outline" size="sm">
          <SkipForward className="h-4 w-4 mr-1" />
          Step
        </Button>

        <Button onClick={onReset} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>

        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-muted-foreground whitespace-nowrap">On param change:</span>
          <Select
            value={paramChangeBehavior}
            onValueChange={(v) => onParamChangeBehaviorChange(v as ParamChangeBehavior)}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="run">Run</SelectItem>
              <SelectItem value="init">Init</SelectItem>
              <SelectItem value="step">One step</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="ml-auto text-sm text-muted-foreground self-center">
          {time.toFixed(2)}h / {endTime}h
        </span>
      </div>

      <Progress value={progress} className="h-2" />
    </div>
  );
}
