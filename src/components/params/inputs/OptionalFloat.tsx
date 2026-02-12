/**
 * Optional float input - a number input with a checkbox to disable/set to infinity.
 * When disabled, the value is treated as Infinity (or a sentinel like null/undefined).
 */
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { HelpPopover } from '@/components/ui/help-popover';

export interface OptionalFloatProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** Label shown when the checkbox is unchecked (value is null/infinity) */
  disabledLabel?: string;
  description?: string;
}

export function OptionalFloat({
  label,
  value,
  onChange,
  disabled,
  min,
  max,
  step = 0.1,
  disabledLabel = 'Infinite',
  description,
}: OptionalFloatProps) {
  const isEnabled = value !== null && isFinite(value);

  const handleCheckChange = (checked: boolean) => {
    if (checked) {
      // Enable with default value
      onChange(min ?? 0);
    } else {
      // Disable (set to null/infinity)
      onChange(null);
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
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
      <Checkbox
        checked={isEnabled}
        onCheckedChange={handleCheckChange}
        disabled={disabled}
      />
      {isEnabled ? (
        <Input
          type="number"
          value={value ?? 0}
          onChange={handleValueChange}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className="h-7 text-xs w-20"
        />
      ) : (
        <span className="text-xs text-muted-foreground">{disabledLabel}</span>
      )}
    </div>
  );
}
