/**
 * Range input component for min/max value pairs.
 * Uses text-based inputs (no scrubber on label — ambiguous which value to scrub).
 */
import { Label } from '@/components/ui/label';
import { HelpPopover } from '@/components/ui/help-popover';
import { NumericTextInput } from './NumericTextInput';

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

export function RangeInput({ label, value, onChange, disabled, description }: RangeInputProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-32 shrink-0">
        <Label className="text-xs">{label}</Label>
        {description && <HelpPopover content={description} />}
      </div>
      <NumericTextInput
        value={value.min}
        onChange={(v) => onChange({ ...value, min: v })}
        disabled={disabled}
        className="h-7 text-xs w-16"
      />
      <span className="text-xs text-muted-foreground">-</span>
      <NumericTextInput
        value={value.max}
        onChange={(v) => onChange({ ...value, max: v })}
        disabled={disabled}
        className="h-7 text-xs w-16"
      />
    </div>
  );
}
