/**
 * Boolean input component for parameter editing.
 */
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { HelpPopover } from '@/components/ui/help-popover';

export interface BoolInputProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  description?: string;
}

export function BoolInput({ label, value, onChange, disabled, description }: BoolInputProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-32 shrink-0">
        <Label className="text-xs">{label}</Label>
        {description && <HelpPopover content={description} />}
      </div>
      <Checkbox
        checked={value}
        onCheckedChange={(checked) => onChange(checked === true)}
        disabled={disabled}
      />
    </div>
  );
}
