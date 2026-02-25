/**
 * Label with drag-to-scrub behavior and optional help popover.
 */
import { Label } from '@/components/ui/label';
import { HelpPopover } from '@/components/ui/help-popover';
import { useScrubber } from '@/hooks/useScrubber';
import { cn } from '@/lib/utils';

export interface ScrubLabelProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  integer?: boolean;
  min?: number;
  max?: number;
  description?: string;
  className?: string;
}

export function ScrubLabel({ label, value, onChange, disabled, integer, min, max, description, className }: ScrubLabelProps) {
  const { scrubberProps } = useScrubber({ value, onChange, disabled, integer, min, max });

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Label className="text-xs" {...scrubberProps}>{label}</Label>
      {description && <HelpPopover content={description} />}
    </div>
  );
}
