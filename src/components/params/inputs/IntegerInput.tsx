/**
 * Integer input component for parameter editing.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpPopover } from '@/components/ui/help-popover';

export interface IntegerInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  description?: string;
}

export function IntegerInput({ label, value, onChange, disabled, min, max, description }: IntegerInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      let clamped = parsed;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      onChange(clamped);
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
        value={value}
        onChange={handleChange}
        disabled={disabled}
        min={min}
        max={max}
        step={1}
        className="h-7 text-xs w-24"
      />
    </div>
  );
}
