/**
 * EHT Cell Types Tab - Table with rows per parameter, columns per cell type.
 */
import { cloneDeep } from 'lodash-es';
import type { ModelUITabProps } from '@/core/registry';
import type { EHTParams, EHTCellTypeParams, Range } from '../params/types';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { RGBColor } from '@/components/params/inputs/ColorInput';

interface CellTypeRowProps {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}

function CellTypeRow({ label, tooltip, children }: CellTypeRowProps) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      <td className="py-1.5 px-2 text-xs font-medium w-36" title={tooltip}>
        {label}
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

function NumberCell({ value, onChange, disabled, step = 0.1, min, max }: NumberCellProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      let clamped = parsed;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      onChange(clamped);
    }
  };

  return (
    <td className="py-1 px-1">
      <Input
        type="number"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        className="h-6 text-xs w-20"
      />
    </td>
  );
}

interface RangeCellProps {
  value: Range;
  onChange: (value: Range) => void;
  disabled?: boolean;
  step?: number;
}

function RangeCell({ value, onChange, disabled, step = 0.1 }: RangeCellProps) {
  const minVal = isFinite(value.min) ? value.min : '';
  const maxVal = isFinite(value.max) ? value.max : '';
  const isInfinite = !isFinite(value.min) && !isFinite(value.max);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (e.target.value === '') {
      onChange({ ...value, min: Infinity });
    } else if (!isNaN(parsed)) {
      onChange({ ...value, min: parsed });
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (e.target.value === '') {
      onChange({ ...value, max: Infinity });
    } else if (!isNaN(parsed)) {
      onChange({ ...value, max: parsed });
    }
  };

  const handleInfiniteToggle = (checked: boolean) => {
    if (checked) {
      onChange({ min: Infinity, max: Infinity });
    } else {
      onChange({ min: 0, max: 1 });
    }
  };

  return (
    <td className="py-1 px-1">
      <div className="flex items-center gap-1">
        <Checkbox
          checked={isInfinite}
          onCheckedChange={handleInfiniteToggle}
          disabled={disabled}
          title="Set to infinite (disabled)"
        />
        {isInfinite ? (
          <span className="text-xs text-muted-foreground">-</span>
        ) : (
          <>
            <Input
              type="number"
              value={minVal}
              onChange={handleMinChange}
              disabled={disabled}
              step={step}
              className="h-6 text-xs w-12"
              placeholder="min"
            />
            <span className="text-xs">-</span>
            <Input
              type="number"
              value={maxVal}
              onChange={handleMaxChange}
              disabled={disabled}
              step={step}
              className="h-6 text-xs w-12"
              placeholder="max"
            />
          </>
        )}
      </div>
    </td>
  );
}

interface BoolCellProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function BoolCell({ value, onChange, disabled }: BoolCellProps) {
  return (
    <td className="py-1 px-1">
      <Checkbox
        checked={value}
        onCheckedChange={(checked) => onChange(checked === true)}
        disabled={disabled}
      />
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

export function EHTCellTypesTab({ params, onChange, disabled }: ModelUITabProps<EHTParams>) {
  // Get cell type keys as strings
  const cellTypeKeys = Object.keys(params.cell_types);

  const updateCellType = <K extends keyof EHTCellTypeParams>(
    cellType: string,
    key: K,
    value: EHTCellTypeParams[K]
  ) => {
    const newParams = cloneDeep(params);
    (newParams.cell_types[cellType] as EHTCellTypeParams)[key] = value;
    onChange(newParams);
  };

  const updateCellTypeEvent = (
    cellType: string,
    eventKey: keyof EHTCellTypeParams['events'],
    value: Range
  ) => {
    const newParams = cloneDeep(params);
    (newParams.cell_types[cellType] as EHTCellTypeParams).events[eventKey] = value;
    onChange(newParams);
  };

  // Helper to get cell type params
  const getCellType = (key: string): EHTCellTypeParams => params.cell_types[key] as EHTCellTypeParams;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b-2 border-border">
            <th className="py-2 px-2 text-left font-semibold">Parameter</th>
            {cellTypeKeys.map((key) => (
              <th key={key} className="py-2 px-1 text-left font-semibold capitalize">
                {getCellType(key).name || key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Geometry */}
          <tr className="bg-muted/50">
            <td colSpan={cellTypeKeys.length + 1} className="py-1 px-2 text-xs font-semibold text-muted-foreground">
              Geometry
            </td>
          </tr>
          <CellTypeRow label="R Hard" tooltip="Hard sphere radius">
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
          <CellTypeRow label="R Hard (div)" tooltip="Hard sphere radius during division">
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
          <CellTypeRow label="R Soft" tooltip="Soft interaction radius">
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).R_soft}
                onChange={(v) => updateCellType(key, 'R_soft', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>

          {/* Appearance */}
          <tr className="bg-muted/50">
            <td colSpan={cellTypeKeys.length + 1} className="py-1 px-2 text-xs font-semibold text-muted-foreground">
              Appearance
            </td>
          </tr>
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
          <tr className="bg-muted/50">
            <td colSpan={cellTypeKeys.length + 1} className="py-1 px-2 text-xs font-semibold text-muted-foreground">
              Stiffness
            </td>
          </tr>
          <CellTypeRow label="k Apical Junction" tooltip="Apical junction spring constant">
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
          <CellTypeRow label="k Cytos" tooltip="Cytoskeleton relaxation rate">
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
          <CellTypeRow label="Stiff Apical-Apical">
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
          <CellTypeRow label="Stiff A-A (div)" tooltip="Apical-Apical stiffness during division">
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
          <CellTypeRow label="Stiff Nuclei-Apical">
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).stiffness_nuclei_apical}
                onChange={(v) => updateCellType(key, 'stiffness_nuclei_apical', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Stiff Nuclei-Basal">
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).stiffness_nuclei_basal}
                onChange={(v) => updateCellType(key, 'stiffness_nuclei_basal', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Stiff Repulsion">
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).stiffness_repulsion}
                onChange={(v) => updateCellType(key, 'stiffness_repulsion', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Stiff Straightness">
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).stiffness_straightness}
                onChange={(v) => updateCellType(key, 'stiffness_straightness', v)}
                disabled={disabled}
                min={0}
              />
            ))}
          </CellTypeRow>

          {/* Division */}
          <tr className="bg-muted/50">
            <td colSpan={cellTypeKeys.length + 1} className="py-1 px-2 text-xs font-semibold text-muted-foreground">
              Division & Lifecycle
            </td>
          </tr>
          <CellTypeRow label="Lifespan">
            {cellTypeKeys.map((key) => (
              <RangeCell
                key={key}
                value={getCellType(key).lifespan}
                onChange={(v) => updateCellType(key, 'lifespan', v)}
                disabled={disabled}
                step={0.5}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="G2 Duration">
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
          <CellTypeRow label="Mitosis Duration">
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
          <CellTypeRow label="INM" tooltip="Interkinetic nuclear migration probability">
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).INM}
                onChange={(v) => updateCellType(key, 'INM', v)}
                disabled={disabled}
                min={0}
                max={1}
                step={0.01}
              />
            ))}
          </CellTypeRow>

          {/* Running */}
          <tr className="bg-muted/50">
            <td colSpan={cellTypeKeys.length + 1} className="py-1 px-2 text-xs font-semibold text-muted-foreground">
              Running Behavior
            </td>
          </tr>
          <CellTypeRow label="Run Probability">
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).run}
                onChange={(v) => updateCellType(key, 'run', v)}
                disabled={disabled}
                min={0}
                max={1}
                step={0.01}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Running Speed">
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
          <CellTypeRow label="Running Mode" tooltip="0: none, 1: after extrusion, 2: retain length, 3: immediate">
            {cellTypeKeys.map((key) => (
              <NumberCell
                key={key}
                value={getCellType(key).running_mode}
                onChange={(v) => updateCellType(key, 'running_mode', Math.round(v))}
                disabled={disabled}
                min={0}
                max={3}
                step={1}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Max Cytos Length" tooltip="Maximum cytoskeleton length">
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

          {/* EMT Events */}
          <tr className="bg-muted/50">
            <td colSpan={cellTypeKeys.length + 1} className="py-1 px-2 text-xs font-semibold text-muted-foreground">
              EMT Events (time ranges)
            </td>
          </tr>
          <CellTypeRow label="Heterogeneous">
            {cellTypeKeys.map((key) => (
              <BoolCell
                key={key}
                value={getCellType(key).hetero}
                onChange={(v) => updateCellType(key, 'hetero', v)}
                disabled={disabled}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Time A (lose apical)">
            {cellTypeKeys.map((key) => (
              <RangeCell
                key={key}
                value={getCellType(key).events.time_A}
                onChange={(v) => updateCellTypeEvent(key, 'time_A', v)}
                disabled={disabled}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Time B (lose basal)">
            {cellTypeKeys.map((key) => (
              <RangeCell
                key={key}
                value={getCellType(key).events.time_B}
                onChange={(v) => updateCellTypeEvent(key, 'time_B', v)}
                disabled={disabled}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Time S (lose straightness)">
            {cellTypeKeys.map((key) => (
              <RangeCell
                key={key}
                value={getCellType(key).events.time_S}
                onChange={(v) => updateCellTypeEvent(key, 'time_S', v)}
                disabled={disabled}
              />
            ))}
          </CellTypeRow>
          <CellTypeRow label="Time P (start running)">
            {cellTypeKeys.map((key) => (
              <RangeCell
                key={key}
                value={getCellType(key).events.time_P}
                onChange={(v) => updateCellTypeEvent(key, 'time_P', v)}
                disabled={disabled}
              />
            ))}
          </CellTypeRow>
        </tbody>
      </table>
    </div>
  );
}
