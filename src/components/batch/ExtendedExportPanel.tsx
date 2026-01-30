/**
 * Panel for configuring extended batch export with screenshots and movies.
 */
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Film } from 'lucide-react';

export interface ExtendedExportConfig {
  exportMovie: boolean;
  resolution: { width: number; height: number };
  frameRate: number;
}

export interface ExtendedExportPanelProps {
  config: ExtendedExportConfig;
  onChange: (config: ExtendedExportConfig) => void;
  onExport: () => void;
  disabled?: boolean;
}

/**
 * UI panel for configuring extended export settings.
 */
export function ExtendedExportPanel({
  config,
  onChange,
  onExport,
  disabled = false,
}: ExtendedExportPanelProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Extended Export</h3>
        <Button
          onClick={onExport}
          disabled={disabled}
          className="gap-2"
        >
          <Film className="w-4 h-4" />
          Export as ZIP
        </Button>
      </div>

      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Export batch runs with screenshots at time samples, movies, and parameter files packaged as a ZIP archive.
        </p>

        {/* Movie Export Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="export-movie"
            checked={config.exportMovie}
            onCheckedChange={(checked) =>
              onChange({ ...config, exportMovie: checked === true })
            }
            disabled={disabled}
          />
          <Label htmlFor="export-movie" className="cursor-pointer">
            Export movies (MP4)
          </Label>
        </div>

        {/* Resolution */}
        <div className="space-y-1.5">
          <Label>Resolution</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={config.resolution.width}
              onChange={(e) =>
                onChange({
                  ...config,
                  resolution: {
                    ...config.resolution,
                    width: parseInt(e.target.value) || 800,
                  },
                })
              }
              disabled={disabled}
              className="w-20 px-2 py-1 border rounded text-sm"
              min="400"
              max="3840"
              step="100"
            />
            <span className="text-muted-foreground">×</span>
            <input
              type="number"
              value={config.resolution.height}
              onChange={(e) =>
                onChange({
                  ...config,
                  resolution: {
                    ...config.resolution,
                    height: parseInt(e.target.value) || 800,
                  },
                })
              }
              disabled={disabled}
              className="w-20 px-2 py-1 border rounded text-sm"
              min="400"
              max="3840"
              step="100"
            />
            <span className="text-muted-foreground text-xs">px</span>
          </div>
        </div>

        {/* Frame Rate */}
        {config.exportMovie && (
          <div className="space-y-1.5">
            <Label>Frame Rate</Label>
            <div className="flex items-center gap-2">
              <select
                value={config.frameRate}
                onChange={(e) =>
                  onChange({
                    ...config,
                    frameRate: parseInt(e.target.value),
                  })
                }
                disabled={disabled}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="24">24 FPS</option>
                <option value="30">30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
