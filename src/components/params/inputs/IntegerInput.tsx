/**
 * Integer input component for parameter editing.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface IntegerInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export function IntegerInput({ label, value, onChange, disabled, min, max }: IntegerInputProps) {
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
      <Label className="text-xs w-32 shrink-0">{label}</Label>
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
