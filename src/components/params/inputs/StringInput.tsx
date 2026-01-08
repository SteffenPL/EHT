/**
 * String input component for parameter editing.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface StringInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function StringInput({ label, value, onChange, disabled, placeholder }: StringInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-32 shrink-0">{label}</Label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-7 text-xs"
      />
    </div>
  );
}
