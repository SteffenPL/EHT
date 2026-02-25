/**
 * Optional float input - a number input with a checkbox to disable/set to infinity.
 * When disabled, the value is treated as Infinity (or a sentinel like null/undefined).
 */
import { Checkbox } from '@/components/ui/checkbox';
import { NumericTextInput } from './NumericTextInput';
import { ScrubLabel } from './ScrubLabel';

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
  disabledLabel = 'Infinite',
  description,
}: OptionalFloatProps) {
  const isEnabled = value !== null && isFinite(value);

  const handleCheckChange = (checked: boolean) => {
    if (checked) {
      onChange(min ?? 0);
    } else {
      onChange(null);
    }
  };

  const numericValue = value ?? 0;

  return (
    <div className="flex items-center gap-2">
      <ScrubLabel
        label={label}
        value={numericValue}
        onChange={(v) => onChange(v)}
        disabled={disabled || !isEnabled}
        min={min}
        max={max}
        description={description}
        className="w-32 shrink-0"
      />
      <Checkbox
        checked={isEnabled}
        onCheckedChange={handleCheckChange}
        disabled={disabled}
      />
      {isEnabled ? (
        <NumericTextInput
          value={numericValue}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          min={min}
          max={max}
          className="h-7 text-xs w-20"
        />
      ) : (
        <span className="text-xs text-muted-foreground">{disabledLabel}</span>
      )}
    </div>
  );
}
