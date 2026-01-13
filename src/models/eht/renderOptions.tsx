/**
 * EHT model render options and panel component.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { RenderOptionsPanelProps } from '@/core/interfaces/model';

export interface EHTRenderOptions {
  showCellIds: boolean;
  showScaleBar: boolean;
}

export const defaultEHTRenderOptions: EHTRenderOptions = {
  showCellIds: false,
  showScaleBar: true,
};

export function EHTRenderOptionsPanel({
  options,
  onChange,
}: RenderOptionsPanelProps<EHTRenderOptions>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Render Options
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {isOpen && (
        <div className="flex flex-wrap gap-4 pl-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={options.showCellIds}
              onCheckedChange={(checked) =>
                onChange({ ...options, showCellIds: !!checked })
              }
            />
            Show Cell IDs
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={options.showScaleBar}
              onCheckedChange={(checked) =>
                onChange({ ...options, showScaleBar: !!checked })
              }
            />
            Show Scale Bar
          </label>
        </div>
      )}
    </div>
  );
}
