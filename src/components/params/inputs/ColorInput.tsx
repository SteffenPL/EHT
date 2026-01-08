/**
 * Color input component for RGB color values.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface ColorInputProps {
  label: string;
  value: RGBColor;
  onChange: (value: RGBColor) => void;
  disabled?: boolean;
}

function rgbToHex(color: RGBColor): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 0, g: 0, b: 0 };
}

export function ColorInput({ label, value, onChange, disabled }: ColorInputProps) {
  const hexValue = rgbToHex(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rgb = hexToRgb(e.target.value);
    onChange(rgb);
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-32 shrink-0">{label}</Label>
      <Input
        type="color"
        value={hexValue}
        onChange={handleChange}
        disabled={disabled}
        className="h-7 w-12 p-0.5 cursor-pointer"
      />
      <span className="text-xs text-muted-foreground">{hexValue}</span>
    </div>
  );
}
