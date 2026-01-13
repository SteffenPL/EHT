/**
 * Simulation control buttons (play, pause, reset, step) and time slider.
 */
import { Play, Pause, RotateCcw, SkipForward, Camera, Video, FileDown, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
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
  time: number;
  endTime: number;
  /** Maximum time that has been simulated (for slider track visualization) */
  maxSimulatedTime: number;
  /** Whether simulation is computing to catch up to a seek target */
  isCatchingUp: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  /** Seek to a specific time */
  onSeek: (time: number) => void;
  paramChangeBehavior: ParamChangeBehavior;
  onParamChangeBehaviorChange: (behavior: ParamChangeBehavior) => void;
  // Export callbacks
  onSaveScreenshot?: () => void;
  onSaveMovie?: () => void;
  onExportCSV?: () => void;
  isRecording?: boolean;
  /** Model-specific render options panel (optional) */
  renderOptionsPanel?: React.ReactNode;
}

export function SimulationControls({
  isRunning,
  time,
  endTime,
  maxSimulatedTime,
  isCatchingUp,
  onStart,
  onPause,
  onReset,
  onStep,
  onSeek,
  paramChangeBehavior,
  onParamChangeBehaviorChange,
  onSaveScreenshot,
  onSaveMovie,
  onExportCSV,
  isRecording = false,
  renderOptionsPanel,
}: SimulationControlsProps) {
  // Calculate percentage of simulation that has been computed (for visual feedback)
  const computedPercent = endTime > 0 ? (maxSimulatedTime / endTime) * 100 : 0;

  const handleSliderChange = (values: number[]) => {
    const newTime = values[0];
    onSeek(newTime);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        {isRunning || isCatchingUp ? (
          <Button onClick={onPause} variant="outline" size="sm">
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        ) : (
          <Button onClick={onStart} size="sm">
            {isCatchingUp ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Start
          </Button>
        )}

        <Button onClick={onStep} disabled={isRunning || isCatchingUp} variant="outline" size="sm">
          <SkipForward className="h-4 w-4 mr-1" />
          Step
        </Button>

        <Button onClick={onReset} variant="outline" size="sm" disabled={isCatchingUp}>
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

      {/* Time Slider */}
      <div className="relative">
        {/* Background track showing computed portion */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 bg-muted/50 rounded-full pointer-events-none"
          style={{ width: `${computedPercent}%` }}
        />
        <Slider
          value={[time]}
          min={0}
          max={endTime}
          step={endTime / 1000} // Fine-grained steps
          onValueChange={handleSliderChange}
          disabled={isCatchingUp}
          className="cursor-pointer"
        />
      </div>

      {/* Model-specific render options */}
      {renderOptionsPanel}

      {/* Export Actions */}
      <div className="flex gap-2 flex-wrap items-center pt-1 border-t border-border/40">
        {onSaveScreenshot && (
          <Button onClick={onSaveScreenshot} variant="outline" size="sm" className="text-xs">
            <Camera className="h-3.5 w-3.5 mr-1" />
            Screenshot
          </Button>
        )}
        {onSaveMovie && (
          <Button
            onClick={onSaveMovie}
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            className="text-xs"
          >
            <Video className="h-3.5 w-3.5 mr-1" />
            {isRecording ? "Stop Recording" : "Record"}
          </Button>
        )}
        {onExportCSV && (
          <Button onClick={onExportCSV} variant="outline" size="sm" className="text-xs">
            <FileDown className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}
