/**
 * Combined parameter editor for base params, ranges, and batch sampling settings.
 * Handles unified load/save to TOML so all values stay together.
 */
import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Link2, Maximize2, Upload } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ModelParameterPanel } from './ModelParameterPanel';
import { TimeSampleConfig } from '../batch/TimeSampleConfig';
import type { SimulationConfig } from '@/core/params';
import type { BaseSimulationParams } from '@/core/registry';
import { PARAM_PRESETS, parseSimulationConfigToml, toSimulationConfigToml, encodeParamsToUrl } from '@/core/params';
import { importXLSXToParams } from '@/models/eht/params/legacy-import';
import { useModel } from '@/contexts/ModelContext';

export interface ParameterConfigViewProps {
  config: SimulationConfig;
  onConfigChange: (config: SimulationConfig) => void;
  disabled?: boolean;
}

interface ParameterConfigBodyProps {
  config: SimulationConfig;
  disabled?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  xlsxInputRef: React.RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  linkCopied: boolean;
  presetOptions: typeof PARAM_PRESETS;
  onLoadConfig: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImportXLSX: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveConfig: () => void;
  onCopyShareLink: () => void;
  onApplyPreset: (key: string) => void;
  onParamsChange: (params: BaseSimulationParams) => void;
  onRangesChange: (parameterRanges: SimulationConfig['parameterRanges']) => void;
  onTimeSamplesChange: (timeSamples: SimulationConfig['timeSamples']) => void;
  onSeedsChange: (value: string) => void;
}

function ParameterConfigBody({
  config,
  disabled,
  fileInputRef,
  xlsxInputRef,
  isImporting,
  linkCopied,
  presetOptions,
  onLoadConfig,
  onImportXLSX,
  onSaveConfig,
  onCopyShareLink,
  onApplyPreset,
  onParamsChange,
  onRangesChange,
  onTimeSamplesChange,
  onSeedsChange,
}: ParameterConfigBodyProps) {
  return (
    <div className="space-y-4">
      {/* File Operations - compact toolbar */}
      <div className="flex gap-1.5 items-center flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".toml"
          onChange={onLoadConfig}
          className="hidden"
        />
        <input
          ref={xlsxInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onImportXLSX}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-7 text-xs gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          Load
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveConfig}
          disabled={disabled}
          className="h-7 text-xs gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => xlsxInputRef.current?.click()}
          disabled={disabled || isImporting}
          className="h-7 text-xs gap-1.5"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {isImporting ? 'Importing...' : 'XLSX'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCopyShareLink}
          disabled={disabled}
          className="h-7 text-xs gap-1.5"
        >
          <Link2 className="h-3.5 w-3.5" />
          {linkCopied ? 'Copied!' : 'Share'}
        </Button>
      </div>

      <Separator />

      <div className="space-y-1">
        <Label className="text-sm font-medium">Select preset</Label>
        <Select onValueChange={onApplyPreset} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a preset" />
          </SelectTrigger>
          <SelectContent>
            {(() => {
              // Group presets by their group path
              const grouped = new Map<string, typeof presetOptions>();
              for (const preset of presetOptions) {
                const group = (preset as { group?: string }).group ?? '';
                if (!grouped.has(group)) grouped.set(group, []);
                grouped.get(group)!.push(preset);
              }
              const elements: React.ReactNode[] = [];
              for (const [group, items] of grouped) {
                if (group === '') {
                  // Root-level presets without a group header
                  for (const preset of items) {
                    elements.push(
                      <SelectItem key={preset.key} value={preset.key}>
                        {preset.label}
                      </SelectItem>
                    );
                  }
                } else {
                  elements.push(
                    <SelectGroup key={group}>
                      <SelectLabel className="text-xs text-muted-foreground">{group}</SelectLabel>
                      {items.map((preset) => (
                        <SelectItem key={preset.key} value={preset.key}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                }
              }
              return elements;
            })()}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="border rounded-md" data-testid="model-parameter-panel-frame">
        <ModelParameterPanel
          params={config.params}
          onChange={onParamsChange}
          parameterRanges={config.parameterRanges}
          onParameterRangesChange={onRangesChange}
          disabled={disabled}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Batch Sampling</Label>
        <TimeSampleConfig
          config={config.timeSamples}
          onChange={onTimeSamplesChange}
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
            onChange={(e) => onSeedsChange(e.target.value)}
            disabled={disabled}
            className="h-8 w-32"
          />
        </div>
      </div>
    </div>
  );
}

export function ParameterConfigView({ config, onConfigChange, disabled }: ParameterConfigViewProps) {
  const { currentModel } = useModel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
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

  const handleImportXLSX = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const params = await importXLSXToParams(file);
      onConfigChange({
        ...config,
        params: params as SimulationConfig['params'],
      });
    } catch (err) {
      console.error('Failed to import XLSX:', err);
      alert('Failed to import legacy XLSX file. Check console for details.');
    } finally {
      setIsImporting(false);
    }

    if (xlsxInputRef.current) {
      xlsxInputRef.current.value = '';
    }
  };

  const handleCopyShareLink = async () => {
    const url = encodeParamsToUrl(currentModel.name, config.params);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback: show the URL in a prompt
      prompt('Copy this link:', url);
    }
  };

  const body = (
    <ParameterConfigBody
      config={config}
      disabled={disabled}
      fileInputRef={fileInputRef}
      xlsxInputRef={xlsxInputRef}
      isImporting={isImporting}
      linkCopied={linkCopied}
      presetOptions={presetOptions}
      onLoadConfig={handleLoadConfig}
      onImportXLSX={handleImportXLSX}
      onSaveConfig={handleSaveConfig}
      onCopyShareLink={handleCopyShareLink}
      onApplyPreset={applyPreset}
      onParamsChange={handleParamsChange}
      onRangesChange={handleRangesChange}
      onTimeSamplesChange={handleTimeSamplesChange}
      onSeedsChange={handleSeedsChange}
    />
  );

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3 flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Parameters &amp; Ranges</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMaximized(true)}
          className="h-7 text-xs gap-1.5"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Maximize
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div
          data-testid="parameter-workspace-scroll"
          className="h-[min(78vh,900px)] min-h-[520px] overflow-y-auto overflow-x-hidden px-6 pb-4 pt-0"
        >
          {!isMaximized && body}
        </div>
      </CardContent>

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="w-[min(1280px,calc(100vw-2rem))] max-w-none max-h-[92vh] gap-0 overflow-hidden p-0">
          <div className="flex max-h-[92vh] min-h-0 flex-col">
            <div className="border-b bg-background px-4 py-3 pr-14">
              <DialogHeader>
                <DialogTitle>Parameters &amp; Ranges</DialogTitle>
                <DialogDescription className="sr-only">
                  Edit parameters, parameter ranges, and batch sampling in a larger workspace.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="parameter-workspace-modal-scroll">
              {body}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
