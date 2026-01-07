/**
 * Combined parameter editor for base params, ranges, and batch sampling settings.
 * Handles unified load/save to TOML so all values stay together.
 */
import { useRef } from 'react';
import { Upload, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { LevaParameterPanel } from './LevaParameterPanel';
import { ParameterRangeList } from '../batch/ParameterRangeList';
import { TimeSampleConfig } from '../batch/TimeSampleConfig';
import type { SimulationConfig } from '@/core/params';
import type { BaseSimulationParams } from '@/core/registry';
import { PARAM_PRESETS, parseSimulationConfigToml, toSimulationConfigToml } from '@/core/params';

export interface ParameterConfigViewProps {
  config: SimulationConfig;
  onConfigChange: (config: SimulationConfig) => void;
  disabled?: boolean;
}

export function ParameterConfigView({ config, onConfigChange, disabled }: ParameterConfigViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetOptions = PARAM_PRESETS;

  const applyPreset = (key: string) => {
    const preset = presetOptions.find((p) => p.key === key);
    if (!preset) return;
    const params = preset.create();
    onConfigChange({
      ...config,
      params,
    });
  };

  const handleParamsChange = (params: BaseSimulationParams) => {
    onConfigChange({ ...config, params: params as SimulationConfig['params'] });
  };

  const handleRangesChange = (parameterRanges: SimulationConfig['parameterRanges']) => {
    onConfigChange({ ...config, parameterRanges });
  };

  const handleTimeSamplesChange = (timeSamples: SimulationConfig['timeSamples']) => {
    onConfigChange({ ...config, timeSamples });
  };

  const handleSeedsChange = (value: string) => {
    const parsed = Math.max(1, parseInt(value, 10) || 1);
    onConfigChange({ ...config, seedsPerConfig: parsed });
  };

  const handleLoadConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const loaded = parseSimulationConfigToml(text);
      onConfigChange(loaded);
    } catch (err) {
      console.error('Failed to parse TOML:', err);
      alert('Failed to parse TOML file. Check console for details.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveConfig = () => {
    const tomlString = toSimulationConfigToml(config);
    const blob = new Blob([tomlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulation_config.toml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Parameters &amp; Ranges</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Select preset</Label>
          <Select onValueChange={applyPreset} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a preset" />
            </SelectTrigger>
            <SelectContent>
              {presetOptions.map((preset) => (
                <SelectItem key={preset.key} value={preset.key}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="h-[500px] border rounded-md overflow-hidden relative">
          <LevaParameterPanel
            params={config.params}
            onChange={handleParamsChange}
          />
        </div>

        <Separator />

        <ParameterRangeList
          ranges={config.parameterRanges}
          onChange={handleRangesChange}
          baseParams={config.params}
          disabled={disabled}
        />

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium">Batch Sampling</Label>
          <TimeSampleConfig
            config={config.timeSamples}
            onChange={handleTimeSamplesChange}
            disabled={disabled}
          />
          <div className="space-y-1">
            <Label htmlFor="seeds" className="text-xs text-muted-foreground">
              Seeds per configuration
            </Label>
            <Input
              id="seeds"
              type="number"
              min={1}
              step={1}
              value={config.seedsPerConfig}
              onChange={(e) => handleSeedsChange(e.target.value)}
              disabled={disabled}
              className="h-8 w-32"
            />
          </div>
        </div>

        <Separator />

        <div className="flex gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".toml"
            onChange={handleLoadConfig}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Load TOML
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveConfig}
            disabled={disabled}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Save TOML
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
