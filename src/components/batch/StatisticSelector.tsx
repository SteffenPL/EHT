/**
 * Multi-select for choosing which statistics to compute.
 */
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { useModel } from '@/contexts';

export interface StatisticSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export function StatisticSelector({ selected, onChange, disabled }: StatisticSelectorProps) {
  const { currentModel } = useModel();
  const modelStatistics = currentModel.statistics || [];
  const selectedSet = new Set(selected);

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, id]);
    } else {
      onChange(selected.filter((s) => s !== id));
    }
  };

  const handleSelectAll = () => {
    onChange(modelStatistics.map((s) => s.id));
  };

  const handleSelectNone = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Statistics to Compute</Label>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            Select All
          </button>
          <span className="text-xs text-muted-foreground">|</span>
          <button
            onClick={handleSelectNone}
            disabled={disabled}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <ScrollArea className="h-[200px] border rounded-md p-3">
        <div className="space-y-2">
          {modelStatistics.map((stat) => (
            <div key={stat.id} className="flex items-start gap-2">
              <Checkbox
                id={stat.id}
                checked={selectedSet.has(stat.id)}
                onCheckedChange={(checked) => handleToggle(stat.id, checked === true)}
                disabled={disabled}
              />
              <div className="grid gap-0.5 leading-none">
                <Label
                  htmlFor={stat.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {stat.label}
                </Label>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        {selected.length} of {modelStatistics.length} selected
      </p>
    </div>
  );
}
