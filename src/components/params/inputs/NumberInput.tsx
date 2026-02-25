/**
 * Float number input component for parameter editing.
 * Uses text-based input with scrub label for drag adjustment.
 */
import { NumericTextInput } from './NumericTextInput';
import { ScrubLabel } from './ScrubLabel';

export interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export function NumberInput({ label, value, onChange, disabled, min, max, description }: NumberInputProps) {
  return (
    <div className="flex items-center gap-2">
      <ScrubLabel
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        description={description}
        className="w-32 shrink-0"
      />
      <NumericTextInput
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        className="h-7 text-xs w-24"
      />
    </div>
  );
}
