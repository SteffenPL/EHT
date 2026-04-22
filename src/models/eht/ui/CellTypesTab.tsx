/**
 * EHT Cell Types Tab - Table with rows per parameter, columns per cell type.
 */
import { useState, useCallback } from 'react';
import type { ModelUITabProps } from '@/core/registry';
import type { EHTParams, EHTCellTypeParams } from '../params/types';
import { DEFAULT_CONTROL_CELL } from '../params/defaults';
import { getExternalForceError } from '../simulation/forces';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { NumericTextInput } from '@/components/params/inputs/NumericTextInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Copy, ClipboardPaste } from 'lucide-react';
import type { RGBColor } from '@/components/params/inputs/ColorInput';
import { HelpPopover } from '@/components/ui/help-popover';
import { getParameterDescription } from '../params/descriptions';
import { FormulaEditorDialog } from '@/components/params/FormulaEditorDialog';
// Section definitions for copy/paste
type SectionKey = 'initial' | 'geometry' | 'appearance' | 'stiffness' | 'strain' | 'division' | 'cellTypeProps' | 'running';

interface SectionDefinition {
  key: SectionKey;
  label: string;
  fields: (keyof EHTCellTypeParams)[];
}

const SECTIONS: SectionDefinition[] = [
  { key: 'initial', label: 'Initial Setup', fields: ['N_init', 'location'] },
  { key: 'geometry', label: 'Geometry', fields: ['R_hard', 'R_hard_div', 'R_soft'] },
  { key: 'appearance', label: 'Appearance', fields: ['color'] },
  { key: 'stiffness', label: 'Stiffness', fields: ['k_apical_junction', 'k_cytos', 'stiffness_apical_apical', 'stiffness_apical_apical_div', 'stiffness_nuclei_apical', 'stiffness_nuclei_basal', 'stiffness_repulsion', 'stiffness_straightness', 'external_force'] },
  { key: 'strain', label: 'Cytoskeleton Strain', fields: ['apical_cytos_strain_init', 'basal_cytos_strain_init'] },
  { key: 'division', label: 'Division & Lifecycle', fields: ['lifespan_start', 'lifespan_end', 'dur_G2', 'dur_mitosis', 'INM'] },
  { key: 'cellTypeProps', label: 'Cell-Type Properties', fields: ['diffusion', 'basal_damping_ratio', 'max_basal_junction_dist', 'cytos_init', 'basal_membrane_repulsion', 'apical_junction_init', 'max_cytoskeleton_length'] },
  { key: 'running', label: 'Running Behavior', fields: ['run', 'running_speed', 'running_mode'] },
];

interface CellTypeRowProps {
  label: string;
  tooltip?: string;
  description?: string;
  children: React.ReactNode;
}

function CellTypeRow({ label, tooltip, description, children }: CellTypeRowProps) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      <td className="py-1.5 px-2 text-xs font-medium w-36" title={tooltip}>
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {description && <HelpPopover content={description} />}
        </div>
      </td>
      {children}
    </tr>
  );
}

interface NumberCellProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  step?: number;
  min?: number;
  max?: number;
}

function NumberCell({ value, onChange, disabled, min, max }: NumberCellProps) {
  return (
    <td className="py-1 px-1">
      <NumericTextInput
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        className="h-6 text-xs w-20"
      />
    </td>
  );
}

/** Table cell that shows either a number input or read-only formula preview with f(x) popup */
function FormulaCell({
  fieldName,
  numericValue,
  formulas,
  onFormulaChange,
  onFormulaClear,
  onNumericChange,
  disabled,
  min,
  max,
  label,
  tEnd,
  constants,
}: {
  fieldName: string;
  numericValue: number;
  formulas: Record<string, string>;
  onFormulaChange: (field: string, formula: string) => void;
  onFormulaClear: (field: string) => void;
  onNumericChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  label: string;
  tEnd: number;
  constants: Record<string, number>;
}) {
  const formula = formulas[fieldName];
  const isFormula = formula !== undefined && formula !== '';
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <td className="py-1 px-1">
      <div className="flex items-center gap-0.5">
        {isFormula ? (
          <input
            type="text"
            value={formula}
            readOnly
            className="h-6 text-xs w-20 font-mono border rounded px-1 bg-muted cursor-pointer"
            title={formula}
            onClick={() => !disabled && setEditorOpen(true)}
          />
        ) : (
          <NumericTextInput
            value={numericValue}
            onChange={onNumericChange}
            disabled={disabled}
            min={min}
            max={max}
            className="h-6 text-xs w-20"
          />
        )}
        <button
          onClick={() => setEditorOpen(true)}
          disabled={disabled}
          className={`text-[9px] px-0.5 rounded border leading-none h-5 disabled:opacity-50 ${isFormula ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          title="Edit formula"
        >
          f(x)
        </button>
      </div>
      <FormulaEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        fieldName={fieldName}
        label={label}
        formula={isFormula ? formula : ''}
        currentNumericValue={numericValue}
        tEnd={tEnd}
        constants={constants}
        context="cell_type"
        onSave={(f) => onFormulaChange(fieldName, f)}
        onClear={() => onFormulaClear(fieldName)}
      />
    </td>
  );
}

function StringCell({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  return (
    <td className="py-1 px-1">
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="h-6 text-xs w-24"
      />
    </td>
  );
}

interface SplitRangeCellProps {
  valueStart: number;
  valueEnd: number;
  onChangeStart: (value: number) => void;
  onChangeEnd: (value: number) => void;
  disabled?: boolean;
  label: 'start' | 'end';
}

function SplitRangeCell({ valueStart, valueEnd, onChangeStart, onChangeEnd, disabled, label }: SplitRangeCellProps) {
  const isStartActive = isFinite(valueStart);
  const isEndActive = isFinite(valueEnd);

  const handleActiveToggle = (checked: boolean) => {
    if (label === 'start') {
      if (checked) {
        onChangeStart(0);
      } else {
        onChangeStart(Infinity);
      }
    } else {
      if (checked) {
        onChangeEnd(1);
      } else {
        onChangeEnd(Infinity);
      }
    }
  };

  const isActive = label === 'start' ? isStartActive : isEndActive;
  const value = label === 'start' ? valueStart : valueEnd;
  const handleValueChange = (v: number) => {
    if (label === 'start') {
      onChangeStart(v);
    } else {
      onChangeEnd(v);
    }
  };

  return (
    <td className="py-1 px-1">
      <div className="flex items-center gap-1">
        <Checkbox
          checked={isActive}
          onCheckedChange={handleActiveToggle}
          disabled={disabled}
          title="Active (enabled when checked)"
        />
        {!isActive ? (
          <span className="text-xs text-muted-foreground w-20">-</span>
        ) : (
          <NumericTextInput
            value={value}
            onChange={handleValueChange}
            disabled={disabled}
            className="h-6 text-xs w-20"
          />
        )}
      </div>
    </td>
  );
}

interface ColorCellProps {
  value: RGBColor;
  onChange: (value: RGBColor) => void;
  disabled?: boolean;
}

function rgbToHex(color: RGBColor): string {
  // Handle both 0-1 and 0-255 ranges
  const r = color.r > 1 ? color.r : Math.round(color.r * 255);
  const g = color.g > 1 ? color.g : Math.round(color.g * 255);
  const b = color.b > 1 ? color.b : Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }
  return { r: 0, g: 0, b: 0 };
}

function ColorCell({ value, onChange, disabled }: ColorCellProps) {
  const hexValue = rgbToHex(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rgb = hexToRgb(e.target.value);
    onChange(rgb);
  };

  return (
    <td className="py-1 px-1">
      <Input
        type="color"
        value={hexValue}
        onChange={handleChange}
        disabled={disabled}
        className="h-6 w-10 p-0.5 cursor-pointer"
      />
    </td>
  );
}

// Section header component with per-column copy/paste buttons
interface SectionHeaderProps {
  section: SectionDefinition;
  cellTypeKeys: string[];
  disabled?: boolean;
  params: EHTParams;
  onChange: (params: EHTParams) => void;
}


function SectionHeader({ section, cellTypeKeys, disabled, params, onChange }: SectionHeaderProps) {
  const [pasteStatus, setPasteStatus] = useState<Record<string, 'idle' | 'success' | 'error'>>({});

  // Serialize value: convert Infinity to "Infinity" string for JSON compatibility
  const serializeValue = useCallback((value: unknown): unknown => {
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(serializeValue);
      }
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = serializeValue(v);
      }
      return result;
    }
    return value;
  }, []);

  // Deserialize value: convert "Infinity" string back to Infinity number
  const deserializeValue = useCallback((value: unknown): unknown => {
    if (value === "Infinity") return Infinity;
    if (value === "-Infinity") return -Infinity;
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(deserializeValue);
      }
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = deserializeValue(v);
      }
      return result;
    }
    return value;
  }, []);

  const handleCopy = useCallback(async (cellTypeKey: string) => {
    const cellType = params.cell_types[cellTypeKey] as EHTCellTypeParams;
    const data: Partial<EHTCellTypeParams> = {};
    for (const field of section.fields) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any)[field] = serializeValue(structuredClone(cellType[field]));
    }
    const json = JSON.stringify({ section: section.key, cellType: cellTypeKey, data }, null, 2);
    await navigator.clipboard.writeText(json);
  }, [params.cell_types, section, serializeValue]);

  const handlePaste = useCallback(async (cellTypeKey: string) => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);

      // Validate that it's the same section type
      if (parsed.section !== section.key || !parsed.data) {
        setPasteStatus(s => ({ ...s, [cellTypeKey]: 'error' }));
        setTimeout(() => setPasteStatus(s => ({ ...s, [cellTypeKey]: 'idle' })), 2000);
        return;
      }

      const newParams = structuredClone(params);
      const targetCellType = newParams.cell_types[cellTypeKey] as EHTCellTypeParams;
      for (const field of section.fields) {
        if (field in parsed.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (targetCellType as any)[field] = deserializeValue(structuredClone(parsed.data[field]));
        }
      }
      onChange(newParams);
      setPasteStatus(s => ({ ...s, [cellTypeKey]: 'success' }));
      setTimeout(() => setPasteStatus(s => ({ ...s, [cellTypeKey]: 'idle' })), 2000);
    } catch {
      setPasteStatus(s => ({ ...s, [cellTypeKey]: 'error' }));
      setTimeout(() => setPasteStatus(s => ({ ...s, [cellTypeKey]: 'idle' })), 2000);
    }
  }, [params, section, onChange, deserializeValue]);

  return (
    <tr className="bg-muted/50">
      <td className="py-1 px-2">
        <span className="text-xs font-semibold text-muted-foreground">{section.label}</span>
      </td>
      {cellTypeKeys.map((key) => (
        <td key={key} className="py-1 px-1">
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(key)}
              disabled={disabled}
              className="h-5 w-5"
              title={`Copy ${section.label} from ${key}`}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePaste(key)}
              disabled={disabled}
              className={`h-5 w-5 ${pasteStatus[key] === 'success' ? 'text-green-500' : pasteStatus[key] === 'error' ? 'text-red-500' : ''}`}
              title={`Paste ${section.label} to ${key}`}
            >
              <ClipboardPaste className="h-3 w-3" />
            </Button>
          </div>
        </td>
      ))}
    </tr>
  );
}

export function EHTCellTypesTab({ params, onChange, disabled }: ModelUITabProps<EHTParams>) {
  // State for copy-from selection
  const [copyFromType, setCopyFromType] = useState<string>('');

  // Get cell type keys as strings
  const cellTypeKeys = Object.keys(params.cell_types);

  const updateCellType = <K extends keyof EHTCellTypeParams>(
    cellType: string,
    key: K,
    value: EHTCellTypeParams[K]
  ) => {
    const newParams = structuredClone(params);
    (newParams.cell_types[cellType] as EHTCellTypeParams)[key] = value;
    onChange(newParams);
  };

  const updateCellFormula = useCallback((typeKey: string, field: string, formula: string) => {
    const newParams = structuredClone(params);
    const ct = newParams.cell_types[typeKey] as EHTCellTypeParams;
    ct.formulas = { ...ct.formulas, [field]: formula };
    onChange(newParams);
  }, [params, onChange]);

  const clearCellFormula = useCallback((typeKey: string, field: string) => {
    const newParams = structuredClone(params);
    const ct = newParams.cell_types[typeKey] as EHTCellTypeParams;
    const { [field]: _, ...rest } = ct.formulas;
    ct.formulas = rest;
    onChange(newParams);
  }, [params, onChange]);

  const addCellType = useCallback((sourceKey?: string) => {
    const newParams = structuredClone(params);
    // Generate unique key
    let counter = 1;
    let newKey = `type_${counter}`;
    while (newParams.cell_types[newKey]) {
      counter++;
      newKey = `type_${counter}`;
    }

    // If source key provided, copy from that cell type
    if (sourceKey && params.cell_types[sourceKey]) {
      const source = params.cell_types[sourceKey] as EHTCellTypeParams;
      const newCellType: EHTCellTypeParams = {
        ...structuredClone(source),
        N_init: 0, // Always start with 0
        color: { r: Math.floor(Math.random() * 200) + 50, g: Math.floor(Math.random() * 200) + 50, b: Math.floor(Math.random() * 200) + 50 },
      };
      newParams.cell_types[newKey] = newCellType;
    } else {
      // Create new cell type based on defaults
      const newCellType: EHTCellTypeParams = {
        ...structuredClone(DEFAULT_CONTROL_CELL),
        N_init: 0,
        location: "",
        color: { r: Math.floor(Math.random() * 200) + 50, g: Math.floor(Math.random() * 200) + 50, b: Math.floor(Math.random() * 200) + 50 },
      };
      newParams.cell_types[newKey] = newCellType;
    }
    onChange(newParams);
  }, [params, onChange]);

  const deleteCellType = (key: string) => {
    if (cellTypeKeys.length <= 1) return; // Keep at least one cell type
    const newParams = structuredClone(params);
    delete newParams.cell_types[key];
    onChange(newParams);
  };

  const renameCellTypeKey = (oldKey: string, newKey: string) => {
    // Don't rename if key is empty or same as old key
    if (!newKey.trim() || newKey === oldKey) return;
    // Don't rename if key already exists
    if (params.cell_types[newKey]) return;

    const newParams = structuredClone(params);
    // Copy cell type to new key and delete old key
    newParams.cell_types[newKey] = newParams.cell_types[oldKey];
    delete newParams.cell_types[oldKey];
    onChange(newParams);
  };

  // Helper to get cell type params
  const getCellType = (key: string): EHTCellTypeParams => params.cell_types[key] as EHTCellTypeParams;

  // Helper to get description for a cell type parameter
  const desc = (key: string) => getParameterDescription(`cell_types.${key}`);

  const handleAddCellType = useCallback(() => {
    addCellType(copyFromType === '__new__' ? undefined : copyFromType);
    setCopyFromType('__new__'); // Reset selection
  }, [addCellType, copyFromType]);

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
      <div className="flex justify-end items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Copy from:</span>
        <Select value={copyFromType || '__new__'} onValueChange={setCopyFromType}>
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue placeholder="(new)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__new__">(new)</SelectItem>
            {cellTypeKeys.map((key) => (
              <SelectItem key={key} value={key}>{key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddCellType}
          disabled={disabled}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Cell Type
        </Button>
      </div>
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b-2 border-border">
            <th className="py-2 px-2 text-left font-semibold">Parameter</th>
            {cellTypeKeys.map((key) => (
              <th key={key} className="py-2 px-1 text-left">
                <div className="flex items-center gap-1">
                  <Input
                    defaultValue={key}
                    onBlur={(e) => renameCellTypeKey(key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameCellTypeKey(key, e.currentTarget.value);
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={disabled}
                    className="h-6 text-xs font-semibold w-24"
                  />
                  {cellTypeKeys.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCellType(key)}
                      disabled={disabled}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Initial Count */}
          <SectionHeader section={SECTIONS[0]} cellTypeKeys={cellTypeKeys} disabled={disabled} params={params} onChange={onChange} />
          <CellTypeRow label="N Init" description={desc('N_init')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).N_init}
                onChange={(v) => updateCellType(key, 'N_init', Math.round(v))}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>

          {/* Location */}
          <CellTypeRow label="Location" description={desc('location')}>
            {cellTypeKeys.map((key) => (
              <StringCell
                key={key}
                value={getCellType(key).location}
                onChange={(v) => updateCellType(key, 'location', v)}
                disabled={disabled}
              />
            ))}
          </CellTypeRow>

          {/* Geometry */}
          <SectionHeader section={SECTIONS[1]} cellTypeKeys={cellTypeKeys} disabled={disabled} params={params} onChange={onChange} />
          <CellTypeRow label="R Hard" description={desc('R_hard')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).R_hard}
                onChange={(v) => updateCellType(key, 'R_hard', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="R Hard (div)" description={desc('R_hard_div')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).R_hard_div}
                onChange={(v) => updateCellType(key, 'R_hard_div', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="R Soft" description={desc('R_soft')}>
            {cellTypeKeys.map((key) => (
              <FormulaCell
                key={key}
                fieldName="R_soft"
                numericValue={getCellType(key).R_soft}
                formulas={getCellType(key).formulas}
                onFormulaChange={(f, v) => updateCellFormula(key, f, v)}
                onFormulaClear={(f) => clearCellFormula(key, f)}
                onNumericChange={(v) => updateCellType(key, 'R_soft', v)}
                disabled={disabled}
                min={0}
                label="R Soft"
                tEnd={params.general.t_end}
                constants={params.constants ?? {}}
              />
            ))}
          </CellTypeRow>

          {/* Appearance */}
          <SectionHeader section={SECTIONS[2]} cellTypeKeys={cellTypeKeys} disabled={disabled} params={params} onChange={onChange} />
          <CellTypeRow label="Color">
            {cellTypeKeys.map((key) => (
              <ColorCell
                key={key}
                value={getCellType(key).color}
                onChange={(v) => updateCellType(key, 'color', v)}
                disabled={disabled}
              />
            ))}
          </CellTypeRow>

          {/* Stiffness */}
          <SectionHeader section={SECTIONS[3]} cellTypeKeys={cellTypeKeys} disabled={disabled} params={params} onChange={onChange} />
          <CellTypeRow label="k Apical Junction" description={desc('k_apical_junction')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).k_apical_junction}
                onChange={(v) => updateCellType(key, 'k_apical_junction', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="k Cytos" description={desc('k_cytos')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).k_cytos}
                onChange={(v) => updateCellType(key, 'k_cytos', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Stiff Apical-Apical" description={desc('stiffness_apical_apical')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).stiffness_apical_apical}
                onChange={(v) => updateCellType(key, 'stiffness_apical_apical', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Stiff A-A (div)" description={desc('stiffness_apical_apical_div')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).stiffness_apical_apical_div}
                onChange={(v) => updateCellType(key, 'stiffness_apical_apical_div', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Stiff Nuclei-Apical" description={desc('stiffness_nuclei_apical')}>
            {cellTypeKeys.map((key) => (
              <FormulaCell
                key={key}
                fieldName="stiffness_nuclei_apical"
                numericValue={getCellType(key).stiffness_nuclei_apical}
                formulas={getCellType(key).formulas}
                onFormulaChange={(f, v) => updateCellFormula(key, f, v)}
                onFormulaClear={(f) => clearCellFormula(key, f)}
                onNumericChange={(v) => updateCellType(key, 'stiffness_nuclei_apical', v)}
                disabled={disabled}
                min={0}
                label="Stiff Nuclei-Apical"
                tEnd={params.general.t_end}
                constants={params.constants ?? {}}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Stiff Nuclei-Basal" description={desc('stiffness_nuclei_basal')}>
            {cellTypeKeys.map((key) => (
              <FormulaCell
                key={key}
                fieldName="stiffness_nuclei_basal"
                numericValue={getCellType(key).stiffness_nuclei_basal}
                formulas={getCellType(key).formulas}
                onFormulaChange={(f, v) => updateCellFormula(key, f, v)}
                onFormulaClear={(f) => clearCellFormula(key, f)}
                onNumericChange={(v) => updateCellType(key, 'stiffness_nuclei_basal', v)}
                disabled={disabled}
                min={0}
                label="Stiff Nuclei-Basal"
                tEnd={params.general.t_end}
                constants={params.constants ?? {}}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Stiff Repulsion" description={desc('stiffness_repulsion')}>
            {cellTypeKeys.map((key) => (
              <FormulaCell
                key={key}
                fieldName="stiffness_repulsion"
                numericValue={getCellType(key).stiffness_repulsion}
                formulas={getCellType(key).formulas}
                onFormulaChange={(f, v) => updateCellFormula(key, f, v)}
                onFormulaClear={(f) => clearCellFormula(key, f)}
                onNumericChange={(v) => updateCellType(key, 'stiffness_repulsion', v)}
                disabled={disabled}
                min={0}
                label="Stiff Repulsion"
                tEnd={params.general.t_end}
                constants={params.constants ?? {}}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Stiff Straightness" description={desc('stiffness_straightness')}>
            {cellTypeKeys.map((key) => (
              <FormulaCell
                key={key}
                fieldName="stiffness_straightness"
                numericValue={getCellType(key).stiffness_straightness}
                formulas={getCellType(key).formulas}
                onFormulaChange={(f, v) => updateCellFormula(key, f, v)}
                onFormulaClear={(f) => clearCellFormula(key, f)}
                onNumericChange={(v) => updateCellType(key, 'stiffness_straightness', v)}
                disabled={disabled}
                min={0}
                label="Stiff Straightness"
                tEnd={params.general.t_end}
                constants={params.constants ?? {}}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="External Force" description={desc('external_force')}>
            {cellTypeKeys.map((key) => {
              const formula = getCellType(key).external_force;
              const error = getExternalForceError(formula);
              return (
                <td key={key} className="py-1 px-1">
                  <Input
                    type="text"
                    value={formula}
                    onChange={(e) => updateCellType(key, 'external_force', e.target.value)}
                    disabled={disabled}
                    className={`h-6 text-xs font-mono ${error ? 'border-destructive' : ''}`}
                  />
                  {error && (
                    <div className="text-[10px] text-destructive mt-0.5 truncate" title={error}>
                      {error}
                    </div>
                  )}
                </td>
              );
            })}
          </CellTypeRow>

          {/* Cytoskeleton Strain */}
          <SectionHeader section={SECTIONS[4]} cellTypeKeys={cellTypeKeys} disabled={disabled} params={params} onChange={onChange} />
          <CellTypeRow label="Apical Strain Init" description={desc('apical_cytos_strain_init')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).apical_cytos_strain_init}
                onChange={(v) => updateCellType(key, 'apical_cytos_strain_init', v)}
                disabled={disabled}
                step={0.1}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Basal Strain Init" description={desc('basal_cytos_strain_init')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).basal_cytos_strain_init}
                onChange={(v) => updateCellType(key, 'basal_cytos_strain_init', v)}
                disabled={disabled}
                step={0.1}
              />
            ))}
          </CellTypeRow>

          {/* Division */}
          <SectionHeader section={SECTIONS[5]} cellTypeKeys={cellTypeKeys} disabled={disabled} params={params} onChange={onChange} />
          <CellTypeRow label="Lifespan (start)" description={desc('lifespan_start')}>
            {cellTypeKeys.map((key) => (
              <SplitRangeCell
                key={key}
                valueStart={getCellType(key).lifespan_start}
                valueEnd={getCellType(key).lifespan_end}
                onChangeStart={(v) => updateCellType(key, 'lifespan_start', v)}
                onChangeEnd={(v) => updateCellType(key, 'lifespan_end', v)}
                disabled={disabled}
                label="start"
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Lifespan (end)" description={desc('lifespan_end')}>
            {cellTypeKeys.map((key) => (
              <SplitRangeCell
                key={key}
                valueStart={getCellType(key).lifespan_start}
                valueEnd={getCellType(key).lifespan_end}
                onChangeStart={(v) => updateCellType(key, 'lifespan_start', v)}
                onChangeEnd={(v) => updateCellType(key, 'lifespan_end', v)}
                disabled={disabled}
                label="end"
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="G2 Duration" description={desc('dur_G2')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).dur_G2}
                onChange={(v) => updateCellType(key, 'dur_G2', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Mitosis Duration" description={desc('dur_mitosis')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).dur_mitosis}
                onChange={(v) => updateCellType(key, 'dur_mitosis', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="INM" description={desc('INM')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).INM}
                onChange={(v) => updateCellType(key, 'INM', v)}
                disabled={disabled}
                min={0}
                max={1}
              />
            ))}
          </CellTypeRow>

          {/* Cell-Type Specific Properties */}
          <SectionHeader section={SECTIONS[6]} cellTypeKeys={cellTypeKeys} disabled={disabled} params={params} onChange={onChange} />
          <CellTypeRow label="Diffusion" description={desc('diffusion')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).diffusion}
                onChange={(v) => updateCellType(key, 'diffusion', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Basal Damping" description={desc('basal_damping_ratio')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).basal_damping_ratio}
                onChange={(v) => updateCellType(key, 'basal_damping_ratio', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Max Basal Junc Dist" description={desc('max_basal_junction_dist')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).max_basal_junction_dist}
                onChange={(v) => updateCellType(key, 'max_basal_junction_dist', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Cytos Init" description={desc('cytos_init')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).cytos_init}
                onChange={(v) => updateCellType(key, 'cytos_init', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Basal Repulsion" description={desc('basal_membrane_repulsion')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).basal_membrane_repulsion}
                onChange={(v) => updateCellType(key, 'basal_membrane_repulsion', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Apical Junc Init" description={desc('apical_junction_init')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).apical_junction_init}
                onChange={(v) => updateCellType(key, 'apical_junction_init', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Max Cytos Length" description={desc('max_cytoskeleton_length')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).max_cytoskeleton_length}
                onChange={(v) => updateCellType(key, 'max_cytoskeleton_length', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>

          {/* Running Behavior - at the end */}
          <SectionHeader section={SECTIONS[7]} cellTypeKeys={cellTypeKeys} disabled={disabled} params={params} onChange={onChange} />
          <CellTypeRow label="Run Probability" description={desc('run')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).run}
                onChange={(v) => updateCellType(key, 'run', v)}
                disabled={disabled}
                min={0}
                max={1}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Running Speed" description={desc('running_speed')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).running_speed}
                onChange={(v) => updateCellType(key, 'running_speed', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Running Mode" description={desc('running_mode')}>
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).running_mode}
                onChange={(v) => updateCellType(key, 'running_mode', Math.round(v))}
                disabled={disabled}
                min={0}
                max={3}
              />
            ))}
          </CellTypeRow>
        </tbody>
      </table>
    </div>
  );
}
