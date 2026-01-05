/**
 * Time sample configuration for batch runs.
 */
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { TimeSampleConfig as TimeSampleConfigType } from '@/core/batch';

export interface TimeSampleConfigProps {
  config: TimeSampleConfigType;
  onChange: (config: TimeSampleConfigType) => void;
  disabled?: boolean;
}

export function TimeSampleConfig({ config, onChange, disabled }: TimeSampleConfigProps) {
  const handleChange = (field: keyof TimeSampleConfigType, value: string) => {
    onChange({ ...config, [field]: parseFloat(value) || 0 });
  };

  const sampleCount = Math.max(0, Math.floor((config.end - config.start) / config.step) + 1);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Time Samples</Label>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="time-start" className="text-xs text-muted-foreground">
            Start (h)
          </Label>
          <Input
            id="time-start"
            type="number"
            value={config.start}
            onChange={(e) => handleChange('start', e.target.value)}
            disabled={disabled}
            className="h-8"
            min={0}
            step="any"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="time-end" className="text-xs text-muted-foreground">
            End (h)
          </Label>
          <Input
            id="time-end"
            type="number"
            value={config.end}
            onChange={(e) => handleChange('end', e.target.value)}
            disabled={disabled}
            className="h-8"
            min={0}
            step="any"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="time-step" className="text-xs text-muted-foreground">
            Step (h)
          </Label>
          <Input
            id="time-step"
            type="number"
            value={config.step}
            onChange={(e) => handleChange('step', e.target.value)}
            disabled={disabled}
            className="h-8"
            min={0.1}
            step="any"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {sampleCount} time point{sampleCount !== 1 ? 's' : ''}: {config.start}h
        {sampleCount > 1 && ` → ${config.end}h`}
      </p>
    </div>
  );
}
