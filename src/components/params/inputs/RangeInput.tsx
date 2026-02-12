/**
 * Range input component for min/max value pairs.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpPopover } from '@/components/ui/help-popover';

export interface Range {
  min: number;
  max: number;
}

export interface RangeInputProps {
  label: string;
  value: Range;
  onChange: (value: Range) => void;
  disabled?: boolean;
  step?: number;
  description?: string;
}

export function RangeInput({ label, value, onChange, disabled, step = 0.1, description }: RangeInputProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onChange({ ...value, min: parsed });
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onChange({ ...value, max: parsed });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-32 shrink-0">
        <Label className="text-xs">{label}</Label>
        {description && <HelpPopover content={description} />}
      </div>
      <Input
        type="number"
        value={value.min}
        onChange={handleMinChange}
        disabled={disabled}
        step={step}
        className="h-7 text-xs w-16"
        title="Min"
      />
      <span className="text-xs text-muted-foreground">-</span>
      <Input
        type="number"
        value={value.max}
        onChange={handleMaxChange}
        disabled={disabled}
        step={step}
        className="h-7 text-xs w-16"
        title="Max"
      />
    </div>
  );
}
