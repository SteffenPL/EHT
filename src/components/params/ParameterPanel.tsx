/**
 * Complete parameter editor panel.
 */
import { useRef } from 'react';
import { Upload, Download } from 'lucide-react';
import { Accordion } from '../ui/accordion';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { ParameterGroup } from './ParameterGroup';
// import type { SimulationParams } from '@/core/types';
type SimulationParams = any;
import { parseTomlWithDefaults, toToml, setNestedValue } from '@/core/params';

export interface ParameterPanelProps {
  params: SimulationParams;
  onChange: (params: SimulationParams) => void;
  disabled?: boolean;
  showFileActions?: boolean;
}

export function ParameterPanel({
  params,
  onChange,
  disabled,
  showFileActions = true,
}: ParameterPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParamChange = (path: string, value: unknown) => {
    const newParams = structuredClone(params);
    setNestedValue(newParams, path, value);
    onChange(newParams);
  };

  const handleLoadToml = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const loaded = parseTomlWithDefaults(text);
      onChange(loaded);
    } catch (err) {
      console.error('Failed to parse TOML:', err);
      alert('Failed to parse TOML file. Check console for details.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveToml = () => {
    const tomlString = toToml(params);
    const blob = new Blob([tomlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulation_params.toml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Parameters</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4">
          <Accordion type="multiple" defaultValue={['general']} className="w-full">
            <ParameterGroup
              title="General"
              groupKey="general"
              params={params.general}
              basePath="general"
              onChange={handleParamChange}
              disabled={disabled}
            />
            <ParameterGroup
              title="Control Cells"
              groupKey="control"
              params={params.cell_types.control}
              basePath="cell_types.control"
              onChange={handleParamChange}
              disabled={disabled}
            />
            <ParameterGroup
              title="EMT Cells"
              groupKey="emt"
              params={params.cell_types.emt}
              basePath="cell_types.emt"
              onChange={handleParamChange}
              disabled={disabled}
            />
          </Accordion>
        </ScrollArea>

        {showFileActions && (
          <>
            <Separator />

            <div className="p-4 flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".toml"
                onChange={handleLoadToml}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Load TOML
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={handleSaveToml}>
                <Download className="h-4 w-4 mr-2" />
                Save TOML
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
