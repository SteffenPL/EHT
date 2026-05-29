/**
 * Simulation control buttons (play, pause, reset, step) and time slider.
 */
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Camera,
  Video,
  FileDown,
  Loader2,
  MousePointer2,
  Shuffle,
  SlidersHorizontal,
  Activity,
} from 'lucide-react';
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
import type { SimulationMode } from '@/hooks/useSimulation';
import type { SimulationProfilerSnapshot } from '@/hooks/useSimulationProfiler';
import type { VideoFormat } from '@/core/export/videoEncoder';

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
  onResetRandom: () => void;
  /** Seek to a specific time */
  onSeek: (time: number) => void;
  simulationMode: SimulationMode;
  onSimulationModeChange: (mode: SimulationMode) => void;
  paramChangeBehavior: ParamChangeBehavior;
  onParamChangeBehaviorChange: (behavior: ParamChangeBehavior) => void;
  // Export callbacks
  onSaveScreenshot?: () => void;
  onSaveMovie?: () => void;
  onExportCSV?: () => void;
  isRecording?: boolean;
  // Video format selection
  videoFormat?: VideoFormat;
  onVideoFormatChange?: (format: VideoFormat) => void;
  /** Model-specific render options panel (optional) */
  renderOptionsPanel?: React.ReactNode;
  /** Opt-in visible simulation profiler controls and readouts. */
  profilerEnabled?: boolean;
  onProfilerEnabledChange?: (enabled: boolean) => void;
  profilerSnapshot?: SimulationProfilerSnapshot | null;
}

function formatMs(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '--';
  if (value >= 10) return `${value.toFixed(1)}ms`;
  if (value >= 1) return `${value.toFixed(2)}ms`;
  return `${value.toFixed(3)}ms`;
}

function formatCount(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '--';
  return value.toLocaleString();
}

function ProfilerMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-muted-foreground">{label}</span>{' '}
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </span>
  );
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
  onResetRandom,
  onSeek,
  simulationMode,
  onSimulationModeChange,
  paramChangeBehavior,
  onParamChangeBehaviorChange,
  onSaveScreenshot,
  onSaveMovie,
  onExportCSV,
  isRecording = false,
  videoFormat = 'mp4',
  onVideoFormatChange,
  renderOptionsPanel,
  profilerEnabled = false,
  onProfilerEnabledChange,
  profilerSnapshot,
}: SimulationControlsProps) {
  // Calculate percentage of simulation that has been computed (for visual feedback)
  const computedPercent = endTime > 0 ? (maxSimulatedTime / endTime) * 100 : 0;

  const handleSliderChange = (values: number[]) => {
    const newTime = values[0];
    onSeek(newTime);
  };

  return (
    <div className="space-y-3">
      {/* Time Slider - moved to top */}
      {simulationMode === 'slider' && (
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {time.toFixed(2)}h / {endTime}h
          </span>
        </div>
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
      </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex items-center rounded-md border border-input overflow-hidden">
          <Button
            type="button"
            variant={simulationMode === 'slider' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-none border-0"
            onClick={() => onSimulationModeChange('slider')}
            aria-pressed={simulationMode === 'slider'}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Slider
          </Button>
          <Button
            type="button"
            variant={simulationMode === 'realtime' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-none border-0 border-l border-input"
            onClick={() => onSimulationModeChange('realtime')}
            aria-pressed={simulationMode === 'realtime'}
          >
            <MousePointer2 className="h-4 w-4 mr-1" />
            Realtime
          </Button>
        </div>

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

        <Button onClick={onResetRandom} variant="outline" size="sm" disabled={isCatchingUp}>
          <Shuffle className="h-4 w-4 mr-1" />
          Reset Random
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

        {onProfilerEnabledChange && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={profilerEnabled ? 'secondary' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onProfilerEnabledChange(!profilerEnabled)}
              aria-pressed={profilerEnabled}
            >
              <Activity className="h-3.5 w-3.5 mr-1" />
              Profiler
            </Button>

            {profilerEnabled && (
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-5">
                <ProfilerMetric label="Frame" value={formatMs(profilerSnapshot?.frameMs)} />
                <ProfilerMetric label="Step" value={formatMs(profilerSnapshot?.stepMs)} />
                <ProfilerMetric label="Forces" value={formatMs(profilerSnapshot?.forcesMs)} />
                <ProfilerMetric label="Formula" value={formatMs(profilerSnapshot?.formulaMs)} />
                <ProfilerMetric label="Constraints" value={formatMs(profilerSnapshot?.constraintsMs)} />
                <ProfilerMetric label="Render" value={formatMs(profilerSnapshot?.renderMs)} />
                <ProfilerMetric label="Clone" value={formatMs(profilerSnapshot?.cloneMs)} />
                <ProfilerMetric label="Cells" value={formatCount(profilerSnapshot?.cellCount)} />
                <ProfilerMetric label="History" value={formatCount(profilerSnapshot?.stateHistoryLength)} />
                <ProfilerMetric label="Formula cache" value={formatCount(profilerSnapshot?.formulaCacheSize)} />
              </div>
            )}
          </div>
        )}
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
          <>
            <Button
              onClick={onSaveMovie}
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              className="text-xs"
            >
              <Video className="h-3.5 w-3.5 mr-1" />
              {isRecording ? "Stop Recording" : "Record"}
            </Button>
            {onVideoFormatChange && !isRecording && (
              <Select
                value={videoFormat}
                onValueChange={(v) => onVideoFormatChange(v as VideoFormat)}
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                  <SelectItem value="mp4-av1">MP4 (AV1)</SelectItem>
                  <SelectItem value="webm">WebM (Auto)</SelectItem>
                  <SelectItem value="webm-vp9">WebM (VP9)</SelectItem>
                  <SelectItem value="webm-vp8">WebM (VP8)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </>
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
