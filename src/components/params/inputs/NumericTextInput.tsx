/**
 * Text-based numeric input that accepts "inf"/"-inf" and shows red border on invalid text.
 */
import { Input } from '@/components/ui/input';
import { useNumericText } from '@/hooks/useNumericText';
import { cn } from '@/lib/utils';

export interface NumericTextInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  integer?: boolean;
  min?: number;
  max?: number;
  className?: string;
}

export function NumericTextInput({ value, onChange, disabled, integer, min, max, className }: NumericTextInputProps) {
  const { text, isValid, handleChange, handleFocus, handleBlur } = useNumericText({
    value,
    onChange,
    integer,
    min,
    max,
  });

  return (
    <Input
      type="text"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      className={cn(
        className,
        !isValid && 'border-red-500 focus-visible:ring-red-500'
      )}
    />
  );
}
