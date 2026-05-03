import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Camera, Download, FileText, Film } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type { BatchExportDialogConfig } from '@/core/batch/types';
import { parseExportTimeSpec } from '@/core/batch/exportConfig';

export interface ExportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: BatchExportDialogConfig) => void;
  totalParamConfigs: number;
  totalSeeds: number;
  tEnd: number;
  defaultStatisticsTimeSpec: string;
  disabled?: boolean;
}

const RESOLUTION_OPTIONS = [400, 800, 1200, 1920, 2560, 3840];
const FRAME_RATE_OPTIONS = [24, 30, 60];
const DEFAULT_SCREENSHOT_TIME_SPEC = '0:24:';

export function ExportConfigDialog({
  open,
  onOpenChange,
  onExport,
  totalParamConfigs,
  totalSeeds,
  tEnd,
  defaultStatisticsTimeSpec,
  disabled = false,
}: ExportConfigDialogProps) {
  const [config, setConfig] = useState<BatchExportDialogConfig>({
    screenshots: {
      enabled: true,
      timeSpec: DEFAULT_SCREENSHOT_TIME_SPEC,
      resolution: 1920,
      maxSamples: null,
      seedsPerSample: null,
    },
    videos: {
      enabled: false,
      resolution: 1920,
      frameRate: 30,
      format: 'mp4',
      maxSamples: totalParamConfigs > 5 ? 5 : null,
      seedsPerSample: totalSeeds > 3 ? 3 : null,
    },
    data: {
      csvSnapshots: true,
      tomlParams: true,
      statisticsCsv: true,
      statisticsTimeSpec: defaultStatisticsTimeSpec,
      statisticsMaxSamples: null,
      statisticsSeedsPerSample: null,
    },
  });

  const [screenshotLimitEnabled, setScreenshotLimitEnabled] = useState(false);
  const [videoLimitEnabled, setVideoLimitEnabled] = useState(totalParamConfigs > 5 || totalSeeds > 3);
  const [statisticsLimitEnabled, setStatisticsLimitEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;

    setConfig(prev => ({
      ...prev,
      videos: {
        ...prev.videos,
        maxSamples: totalParamConfigs > 5 ? Math.min(5, totalParamConfigs) : null,
        seedsPerSample: totalSeeds > 3 ? Math.min(3, totalSeeds) : null,
      },
      data: {
        ...prev.data,
        statisticsTimeSpec: prev.data.statisticsTimeSpec || defaultStatisticsTimeSpec,
      },
    }));
    setVideoLimitEnabled(totalParamConfigs > 5 || totalSeeds > 3);
  }, [open, totalParamConfigs, totalSeeds, defaultStatisticsTimeSpec]);

  const updateScreenshots = (patch: Partial<BatchExportDialogConfig['screenshots']>) =>
    setConfig(prev => ({ ...prev, screenshots: { ...prev.screenshots, ...patch } }));
  const updateVideos = (patch: Partial<BatchExportDialogConfig['videos']>) =>
    setConfig(prev => ({ ...prev, videos: { ...prev.videos, ...patch } }));
  const updateData = (patch: Partial<BatchExportDialogConfig['data']>) =>
    setConfig(prev => ({ ...prev, data: { ...prev.data, ...patch } }));

  const validation = useMemo(() => {
    const errors: string[] = [];
    let screenshotTimeCount = 0;
    let statisticsTimeCount = 0;

    if (
      !config.screenshots.enabled &&
      !config.videos.enabled &&
      !config.data.csvSnapshots &&
      !config.data.tomlParams &&
      !config.data.statisticsCsv
    ) {
      errors.push('Select at least one export item.');
    }

    if (config.screenshots.enabled) {
      try {
        screenshotTimeCount = parseExportTimeSpec(config.screenshots.timeSpec, tEnd).length;
      } catch (error) {
        errors.push(`Screenshots: ${(error as Error).message}`);
      }
      if (screenshotLimitEnabled) {
        validateLimit(config.screenshots.maxSamples, totalParamConfigs, 'Screenshot max samples', errors);
        validateLimit(config.screenshots.seedsPerSample, totalSeeds, 'Screenshot seeds per sample', errors);
      }
    }

    if (config.videos.enabled && videoLimitEnabled) {
      validateLimit(config.videos.maxSamples, totalParamConfigs, 'Video max samples', errors);
      validateLimit(config.videos.seedsPerSample, totalSeeds, 'Video seeds per sample', errors);
    }

    if (config.data.statisticsCsv) {
      try {
        statisticsTimeCount = parseExportTimeSpec(config.data.statisticsTimeSpec, tEnd).length;
      } catch (error) {
        errors.push(`Statistics: ${(error as Error).message}`);
      }
      if (statisticsLimitEnabled) {
        validateLimit(config.data.statisticsMaxSamples, totalParamConfigs, 'Statistics max samples', errors);
        validateLimit(config.data.statisticsSeedsPerSample, totalSeeds, 'Statistics seeds per sample', errors);
      }
    }

    return { errors, screenshotTimeCount, statisticsTimeCount };
  }, [
    config,
    screenshotLimitEnabled,
    videoLimitEnabled,
    statisticsLimitEnabled,
    totalParamConfigs,
    totalSeeds,
    tEnd,
  ]);

  const screenshotRuns = getRunCount(
    screenshotLimitEnabled,
    config.screenshots.maxSamples,
    config.screenshots.seedsPerSample,
    totalParamConfigs,
    totalSeeds
  );
  const videoRuns = getRunCount(
    videoLimitEnabled,
    config.videos.maxSamples,
    config.videos.seedsPerSample,
    totalParamConfigs,
    totalSeeds
  );
  const statisticsRuns = getRunCount(
    statisticsLimitEnabled,
    config.data.statisticsMaxSamples,
    config.data.statisticsSeedsPerSample,
    totalParamConfigs,
    totalSeeds
  );

  const handleExport = () => {
    if (validation.errors.length > 0) return;

    const finalConfig: BatchExportDialogConfig = {
      ...config,
      screenshots: {
        ...config.screenshots,
        maxSamples: screenshotLimitEnabled ? config.screenshots.maxSamples : null,
        seedsPerSample: screenshotLimitEnabled ? config.screenshots.seedsPerSample : null,
      },
      videos: {
        ...config.videos,
        maxSamples: videoLimitEnabled ? config.videos.maxSamples : null,
        seedsPerSample: videoLimitEnabled ? config.videos.seedsPerSample : null,
      },
      data: {
        ...config.data,
        statisticsMaxSamples: statisticsLimitEnabled ? config.data.statisticsMaxSamples : null,
        statisticsSeedsPerSample: statisticsLimitEnabled ? config.data.statisticsSeedsPerSample : null,
      },
    };
    onExport(finalConfig);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Batch Results</DialogTitle>
          <DialogDescription>
            Configure the ZIP export for {totalParamConfigs} sample{totalParamConfigs !== 1 ? 's' : ''} and {totalSeeds} seed{totalSeeds !== 1 ? 's' : ''} per sample.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Screenshots</h3>
          </div>

          <div className="pl-6 space-y-3">
            <CheckboxRow
              id="screenshots-enabled"
              checked={config.screenshots.enabled}
              label="Export screenshots"
              onChange={(checked) => updateScreenshots({ enabled: checked })}
            />

            {config.screenshots.enabled && (
              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <Label htmlFor="screenshot-times" className="text-sm">Times</Label>
                  <input
                    id="screenshot-times"
                    value={config.screenshots.timeSpec}
                    onChange={(event) => updateScreenshots({ timeSpec: event.target.value })}
                    placeholder="0, 12, 24:24:"
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use comma-separated times or start:step:end ranges. Empty end uses t_end.
                  </p>
                </div>

                <SelectRow
                  label="Resolution"
                  value={config.screenshots.resolution}
                  options={RESOLUTION_OPTIONS.map(value => ({ value, label: `${value}px` }))}
                  onChange={(value) => updateScreenshots({ resolution: value })}
                />

                <CheckboxRow
                  id="screenshot-limit"
                  checked={screenshotLimitEnabled}
                  label="Limit screenshots"
                  onChange={setScreenshotLimitEnabled}
                />

                {screenshotLimitEnabled && (
                  <LimitInputs
                    maxSamples={config.screenshots.maxSamples ?? totalParamConfigs}
                    seedsPerSample={config.screenshots.seedsPerSample ?? totalSeeds}
                    totalSamples={totalParamConfigs}
                    totalSeeds={totalSeeds}
                    onMaxSamplesChange={(value) => updateScreenshots({ maxSamples: value })}
                    onSeedsPerSampleChange={(value) => updateScreenshots({ seedsPerSample: value })}
                  />
                )}

                <p className="text-xs text-muted-foreground">
                  {screenshotRuns} run{screenshotRuns !== 1 ? 's' : ''}, {validation.screenshotTimeCount} time point{validation.screenshotTimeCount !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Movies</h3>
          </div>

          <div className="pl-6 space-y-3">
            <CheckboxRow
              id="videos-enabled"
              checked={config.videos.enabled}
              label="Export movies"
              onChange={(checked) => updateVideos({ enabled: checked })}
            />

            {config.videos.enabled && (
              <div className="space-y-3 text-sm">
                <SelectRow
                  label="Resolution"
                  value={config.videos.resolution}
                  options={RESOLUTION_OPTIONS.map(value => ({ value, label: `${value}px` }))}
                  onChange={(value) => updateVideos({ resolution: value })}
                />

                <SelectRow
                  label="Frame rate"
                  value={config.videos.frameRate}
                  options={FRAME_RATE_OPTIONS.map(value => ({ value, label: `${value} FPS` }))}
                  onChange={(value) => updateVideos({ frameRate: value })}
                />

                <div className="flex items-center gap-2">
                  <Label htmlFor="video-format" className="w-32">Format</Label>
                  <select
                    id="video-format"
                    value={config.videos.format}
                    onChange={(event) => updateVideos({ format: event.target.value as BatchExportDialogConfig['videos']['format'] })}
                    className="h-8 px-2 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="webm">WebM (VP9)</option>
                    <option value="mp4-av1">MP4 (AV1)</option>
                  </select>
                </div>

                <CheckboxRow
                  id="video-limit"
                  checked={videoLimitEnabled}
                  label="Limit movies"
                  onChange={setVideoLimitEnabled}
                />

                {videoLimitEnabled && (
                  <LimitInputs
                    maxSamples={config.videos.maxSamples ?? totalParamConfigs}
                    seedsPerSample={config.videos.seedsPerSample ?? totalSeeds}
                    totalSamples={totalParamConfigs}
                    totalSeeds={totalSeeds}
                    onMaxSamplesChange={(value) => updateVideos({ maxSamples: value })}
                    onSeedsPerSampleChange={(value) => updateVideos({ seedsPerSample: value })}
                  />
                )}

                <p className="text-xs text-muted-foreground">
                  {videoRuns} movie{videoRuns !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Data and Statistics</h3>
          </div>

          <div className="pl-6 space-y-3">
            <CheckboxRow
              id="csv-snapshots"
              checked={config.data.csvSnapshots}
              label="CSV snapshots"
              onChange={(checked) => updateData({ csvSnapshots: checked })}
            />
            <CheckboxRow
              id="toml-params"
              checked={config.data.tomlParams}
              label="TOML parameter files"
              onChange={(checked) => updateData({ tomlParams: checked })}
            />
            <CheckboxRow
              id="stats-csv"
              checked={config.data.statisticsCsv}
              label="Statistics CSV"
              onChange={(checked) => updateData({ statisticsCsv: checked })}
            />

            {config.data.statisticsCsv && (
              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <Label htmlFor="statistics-times" className="text-sm">Statistics times</Label>
                  <input
                    id="statistics-times"
                    value={config.data.statisticsTimeSpec}
                    onChange={(event) => updateData({ statisticsTimeSpec: event.target.value })}
                    placeholder={defaultStatisticsTimeSpec}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                  />
                </div>

                <CheckboxRow
                  id="statistics-limit"
                  checked={statisticsLimitEnabled}
                  label="Limit statistics"
                  onChange={setStatisticsLimitEnabled}
                />

                {statisticsLimitEnabled && (
                  <LimitInputs
                    maxSamples={config.data.statisticsMaxSamples ?? totalParamConfigs}
                    seedsPerSample={config.data.statisticsSeedsPerSample ?? totalSeeds}
                    totalSamples={totalParamConfigs}
                    totalSeeds={totalSeeds}
                    onMaxSamplesChange={(value) => updateData({ statisticsMaxSamples: value })}
                    onSeedsPerSampleChange={(value) => updateData({ statisticsSeedsPerSample: value })}
                  />
                )}

                <p className="text-xs text-muted-foreground">
                  {statisticsRuns} run{statisticsRuns !== 1 ? 's' : ''}, {validation.statisticsTimeCount} time point{validation.statisticsTimeCount !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
        </div>

        {validation.errors.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              Export settings need attention
            </div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {validation.errors.map(error => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={disabled || validation.errors.length > 0} className="gap-2">
            <Download className="w-4 h-4" />
            Export ZIP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CheckboxRowProps {
  id: string;
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

function CheckboxRow({ id, checked, label, onChange }: CheckboxRowProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <Label htmlFor={id} className="cursor-pointer text-sm">
        {label}
      </Label>
    </div>
  );
}

interface SelectRowProps {
  label: string;
  value: number;
  options: Array<{ value: number; label: string }>;
  onChange: (value: number) => void;
}

function SelectRow({ label, value, options, onChange }: SelectRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-32">{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(parseInt(event.target.value, 10))}
        className="h-8 px-2 rounded-md border border-input bg-background text-sm"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface LimitInputsProps {
  maxSamples: number;
  seedsPerSample: number;
  totalSamples: number;
  totalSeeds: number;
  onMaxSamplesChange: (value: number) => void;
  onSeedsPerSampleChange: (value: number) => void;
}

function LimitInputs({
  maxSamples,
  seedsPerSample,
  totalSamples,
  totalSeeds,
  onMaxSamplesChange,
  onSeedsPerSampleChange,
}: LimitInputsProps) {
  return (
    <div className="flex items-center gap-2 pl-6 flex-wrap">
      <Label className="text-sm">Max samples</Label>
      <input
        type="number"
        value={maxSamples}
        onChange={(event) => onMaxSamplesChange(parseIntegerInput(event.target.value))}
        className="w-20 h-8 px-2 rounded-md border border-input bg-background text-sm"
        min={1}
        max={totalSamples}
        step={1}
      />
      <Label className="text-sm">Seeds/sample</Label>
      <input
        type="number"
        value={seedsPerSample}
        onChange={(event) => onSeedsPerSampleChange(parseIntegerInput(event.target.value))}
        className="w-20 h-8 px-2 rounded-md border border-input bg-background text-sm"
        min={1}
        max={totalSeeds}
        step={1}
      />
    </div>
  );
}

function parseIntegerInput(value: string): number {
  return Math.max(1, parseInt(value, 10) || 1);
}

function validateLimit(
  value: number | null,
  total: number,
  label: string,
  errors: string[]
): void {
  if (value === null) return;
  if (!Number.isInteger(value) || value < 1 || value > total) {
    errors.push(`${label} must be between 1 and ${total}.`);
  }
}

function getRunCount(
  limitEnabled: boolean,
  maxSamples: number | null,
  seedsPerSample: number | null,
  totalSamples: number,
  totalSeeds: number
): number {
  const sampleCount = limitEnabled ? Math.min(maxSamples ?? totalSamples, totalSamples) : totalSamples;
  const seedCount = limitEnabled ? Math.min(seedsPerSample ?? totalSeeds, totalSeeds) : totalSeeds;
  return sampleCount * seedCount;
}
