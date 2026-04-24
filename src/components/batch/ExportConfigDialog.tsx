import { useState, useEffect } from 'react';
import { Film, Camera, FileText, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import type { BatchExportDialogConfig } from '@/core/batch/types';

export interface ExportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: BatchExportDialogConfig) => void;
  totalParamConfigs: number;
  totalSeeds: number;
  disabled?: boolean;
}

const RESOLUTION_OPTIONS = [400, 800, 1200, 1920, 2560, 3840];
const FRAME_RATE_OPTIONS = [24, 30, 60];

export function ExportConfigDialog({
  open,
  onOpenChange,
  onExport,
  totalParamConfigs,
  totalSeeds,
  disabled = false,
}: ExportConfigDialogProps) {
  const [config, setConfig] = useState<BatchExportDialogConfig>({
    screenshots: {
      enabled: true,
      intervalHours: 24,
      includeInitial: true,
      includeTerminal: true,
      resolution: 1920,
      maxParamConfigs: null,
      maxSeeds: null,
    },
    videos: {
      enabled: false,
      resolution: 1920,
      frameRate: 30,
      format: 'mp4',
      maxParamConfigs: totalParamConfigs > 5 ? 5 : null,
      maxSeeds: totalSeeds > 3 ? 3 : null,
    },
    data: {
      csvSnapshots: true,
      tomlParams: true,
      statisticsCsv: true,
    },
  });

  const [screenshotLimitEnabled, setScreenshotLimitEnabled] = useState(false);
  const [videoLimitEnabled, setVideoLimitEnabled] = useState(totalParamConfigs > 5 || totalSeeds > 3);

  useEffect(() => {
    if (open) {
      setConfig(prev => ({
        ...prev,
        videos: {
          ...prev.videos,
          maxParamConfigs: totalParamConfigs > 5 ? 5 : null,
          maxSeeds: totalSeeds > 3 ? 3 : null,
        },
      }));
      setVideoLimitEnabled(totalParamConfigs > 5 || totalSeeds > 3);
    }
  }, [open, totalParamConfigs, totalSeeds]);

  const updateScreenshots = (patch: Partial<BatchExportDialogConfig['screenshots']>) =>
    setConfig(prev => ({ ...prev, screenshots: { ...prev.screenshots, ...patch } }));
  const updateVideos = (patch: Partial<BatchExportDialogConfig['videos']>) =>
    setConfig(prev => ({ ...prev, videos: { ...prev.videos, ...patch } }));
  const updateData = (patch: Partial<BatchExportDialogConfig['data']>) =>
    setConfig(prev => ({ ...prev, data: { ...prev.data, ...patch } }));

  const screenshotRuns = screenshotLimitEnabled
    ? (config.screenshots.maxParamConfigs ?? totalParamConfigs) * (config.screenshots.maxSeeds ?? totalSeeds)
    : totalParamConfigs * totalSeeds;
  const videoRuns = videoLimitEnabled
    ? (config.videos.maxParamConfigs ?? totalParamConfigs) * (config.videos.maxSeeds ?? totalSeeds)
    : totalParamConfigs * totalSeeds;

  const handleExport = () => {
    const finalConfig: BatchExportDialogConfig = {
      ...config,
      screenshots: {
        ...config.screenshots,
        maxParamConfigs: screenshotLimitEnabled ? config.screenshots.maxParamConfigs : null,
        maxSeeds: screenshotLimitEnabled ? config.screenshots.maxSeeds : null,
      },
      videos: {
        ...config.videos,
        maxParamConfigs: videoLimitEnabled ? config.videos.maxParamConfigs : null,
        maxSeeds: videoLimitEnabled ? config.videos.maxSeeds : null,
      },
    };
    onExport(finalConfig);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Batch Results</DialogTitle>
          <DialogDescription>
            Configure what to include in the ZIP export.
            Total: {totalParamConfigs} parameter config{totalParamConfigs !== 1 ? 's' : ''} × {totalSeeds} seed{totalSeeds !== 1 ? 's' : ''} = {totalParamConfigs * totalSeeds} runs.
          </DialogDescription>
        </DialogHeader>

        {/* Screenshots Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Screenshots</h3>
          </div>

          <div className="pl-6 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="screenshots-enabled"
                checked={config.screenshots.enabled}
                onCheckedChange={(c) => updateScreenshots({ enabled: c === true })}
              />
              <Label htmlFor="screenshots-enabled" className="cursor-pointer text-sm">
                Export screenshots
              </Label>
            </div>

            {config.screenshots.enabled && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Label className="w-32">Every</Label>
                  <input
                    type="number"
                    value={config.screenshots.intervalHours}
                    onChange={(e) => updateScreenshots({ intervalHours: parseFloat(e.target.value) || 1 })}
                    className="w-20 px-2 py-1 border rounded text-sm"
                    min="0.1"
                    step="1"
                  />
                  <span className="text-muted-foreground">hours</span>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-initial"
                      checked={config.screenshots.includeInitial}
                      onCheckedChange={(c) => updateScreenshots({ includeInitial: c === true })}
                    />
                    <Label htmlFor="include-initial" className="cursor-pointer text-sm">
                      Include t=0
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-terminal"
                      checked={config.screenshots.includeTerminal}
                      onCheckedChange={(c) => updateScreenshots({ includeTerminal: c === true })}
                    />
                    <Label htmlFor="include-terminal" className="cursor-pointer text-sm">
                      Include terminal
                    </Label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-32">Resolution</Label>
                  <select
                    value={config.screenshots.resolution}
                    onChange={(e) => updateScreenshots({ resolution: parseInt(e.target.value) })}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    {RESOLUTION_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}px</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="screenshot-limit"
                    checked={screenshotLimitEnabled}
                    onCheckedChange={(c) => setScreenshotLimitEnabled(c === true)}
                  />
                  <Label htmlFor="screenshot-limit" className="cursor-pointer text-sm">
                    Limit to subset
                  </Label>
                </div>

                {screenshotLimitEnabled && (
                  <div className="flex items-center gap-2 pl-6">
                    <Label className="text-sm">First</Label>
                    <input
                      type="number"
                      value={config.screenshots.maxParamConfigs ?? totalParamConfigs}
                      onChange={(e) => updateScreenshots({ maxParamConfigs: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                      min="1"
                      max={totalParamConfigs}
                    />
                    <Label className="text-sm">configs ×</Label>
                    <input
                      type="number"
                      value={config.screenshots.maxSeeds ?? totalSeeds}
                      onChange={(e) => updateScreenshots({ maxSeeds: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                      min="1"
                      max={totalSeeds}
                    />
                    <Label className="text-sm">seeds = {screenshotRuns} runs</Label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Videos Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Videos</h3>
          </div>

          <div className="pl-6 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="videos-enabled"
                checked={config.videos.enabled}
                onCheckedChange={(c) => updateVideos({ enabled: c === true })}
              />
              <Label htmlFor="videos-enabled" className="cursor-pointer text-sm">
                Export videos
              </Label>
            </div>

            {config.videos.enabled && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Label className="w-32">Resolution</Label>
                  <select
                    value={config.videos.resolution}
                    onChange={(e) => updateVideos({ resolution: parseInt(e.target.value) })}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    {RESOLUTION_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}px</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-32">Frame rate</Label>
                  <select
                    value={config.videos.frameRate}
                    onChange={(e) => updateVideos({ frameRate: parseInt(e.target.value) })}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    {FRAME_RATE_OPTIONS.map(r => (
                      <option key={r} value={r}>{r} FPS</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-32">Format</Label>
                  <select
                    value={config.videos.format}
                    onChange={(e) => updateVideos({ format: e.target.value as 'mp4' | 'webm' | 'mp4-av1' })}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="webm">WebM (VP9)</option>
                    <option value="mp4-av1">MP4 (AV1)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="video-limit"
                    checked={videoLimitEnabled}
                    onCheckedChange={(c) => setVideoLimitEnabled(c === true)}
                  />
                  <Label htmlFor="video-limit" className="cursor-pointer text-sm">
                    Limit to subset
                  </Label>
                </div>

                {videoLimitEnabled && (
                  <div className="flex items-center gap-2 pl-6">
                    <Label className="text-sm">First</Label>
                    <input
                      type="number"
                      value={config.videos.maxParamConfigs ?? totalParamConfigs}
                      onChange={(e) => updateVideos({ maxParamConfigs: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                      min="1"
                      max={totalParamConfigs}
                    />
                    <Label className="text-sm">configs ×</Label>
                    <input
                      type="number"
                      value={config.videos.maxSeeds ?? totalSeeds}
                      onChange={(e) => updateVideos({ maxSeeds: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                      min="1"
                      max={totalSeeds}
                    />
                    <Label className="text-sm">seeds = {videoRuns} runs</Label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Data Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Data (all runs)</h3>
          </div>

          <div className="pl-6 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="csv-snapshots"
                checked={config.data.csvSnapshots}
                onCheckedChange={(c) => updateData({ csvSnapshots: c === true })}
              />
              <Label htmlFor="csv-snapshots" className="cursor-pointer text-sm">
                CSV snapshots
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="toml-params"
                checked={config.data.tomlParams}
                onCheckedChange={(c) => updateData({ tomlParams: c === true })}
              />
              <Label htmlFor="toml-params" className="cursor-pointer text-sm">
                TOML parameter files (per run)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="stats-csv"
                checked={config.data.statisticsCsv}
                onCheckedChange={(c) => updateData({ statisticsCsv: c === true })}
              />
              <Label htmlFor="stats-csv" className="cursor-pointer text-sm">
                Statistics CSV
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={disabled} className="gap-2">
            <Download className="w-4 h-4" />
            Export ZIP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
