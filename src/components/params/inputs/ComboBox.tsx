/**
 * Combo box / dropdown component for parameter editing.
 */
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HelpPopover } from '@/components/ui/help-popover';

export interface ComboBoxOption {
  value: string;
  label: string;
}

export interface ComboBoxProps {
  label: string;
  value: string;
  options: ComboBoxOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  description?: string;
}

export function ComboBox({ label, value, options, onChange, disabled, placeholder, description }: ComboBoxProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-32 shrink-0">
        <Label className="text-xs">{label}</Label>
        {description && <HelpPopover content={description} />}
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-7 text-xs w-32">
          <SelectValue placeholder={placeholder ?? 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
