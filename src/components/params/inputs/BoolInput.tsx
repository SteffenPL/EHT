/**
 * Boolean input component for parameter editing.
 */
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface BoolInputProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function BoolInput({ label, value, onChange, disabled }: BoolInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-32 shrink-0">{label}</Label>
      <Checkbox
        checked={value}
        onCheckedChange={(checked) => onChange(checked === true)}
        disabled={disabled}
      />
    </div>
  );
}
