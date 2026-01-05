/**
 * Generic parameter input component.
 * Renders appropriate input based on value type.
 */
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

/** Parameters that should be treated as integers */
const INTEGER_PARAMS = new Set([
  'N_init',
  'N_emt',
  'random_seed',
  'n_substeps',
]);

/** Check if a parameter path ends with an integer parameter name */
function isIntegerParam(path: string): boolean {
  const lastPart = path.split('.').pop() ?? '';
  return INTEGER_PARAMS.has(lastPart);
}

export interface ParameterInputProps {
  label: string;
  path: string;
  value: unknown;
  onChange: (path: string, value: unknown) => void;
  disabled?: boolean;
}

export function ParameterInput({ label, path, value, onChange, disabled }: ParameterInputProps) {
  const handleChange = (newValue: unknown) => {
    onChange(path, newValue);
  };

  // Boolean - checkbox
  if (typeof value === 'boolean') {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <Label htmlFor={path} className="text-sm font-normal cursor-pointer col-span-1">
          {label}
        </Label>
        <Checkbox
          className="col-span-1"
          id={path}
          checked={value}
          onCheckedChange={(checked) => handleChange(checked === true)}
          disabled={disabled}
        />
      </div>
    );
  }

  // Number - number input
  if (typeof value === 'number') {
    const isInteger = isIntegerParam(path);
    const step = isInteger ? 1 : 0.01;
    const parseValue = isInteger
      ? (v: string) => parseInt(v, 10) || 0
      : (v: string) => parseFloat(v) || 0;

    return (
      <div className="grid grid-cols-2 gap-1.5">
        <Label htmlFor={path} className="text-sm col-span-1">
          {label}
        </Label>
        <div className="col-span-1">
          <Input
            id={path}
            type="number"
            value={value}
            step={step}
            onChange={(e) => handleChange(parseValue(e.target.value))}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </div>
    );
  }

  // String - text input (including color hex)
  if (typeof value === 'string') {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <Label htmlFor={path} className="text-sm col-span-1">
          {label}
        </Label>
        <div className="col-span-1">
          <Input
            id={path}
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </div>
    );
  }

  // Object with r, g, b - color input
  if (
    value !== null &&
    typeof value === 'object' &&
    'r' in value &&
    'g' in value &&
    'b' in value
  ) {
    const rgb = value as { r: number; g: number; b: number };
    const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;

    return (
      <div className="grid grid-cols-2 gap-1.5">
        <Label htmlFor={path} className="text-sm col-span-1">
          {label}
        </Label>
        <div className="col-span-1">
          <Input
            id={path}
            type="text"
            value={hex}
            onChange={(e) => {
              const match = e.target.value.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
              if (match) {
                handleChange({
                  r: parseInt(match[1], 16),
                  g: parseInt(match[2], 16),
                  b: parseInt(match[3], 16),
                });
              }
            }}
            disabled={disabled}
            className="h-8 text-sm font-mono"
            placeholder="#rrggbb"
          />
        </div>
      </div>
    );
  }

  // Unsupported type
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <span className="text-xs text-muted-foreground">(unsupported type)</span>
    </div>
  );
}
