/**
 * Model selector dropdown for switching between simulation models.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModel } from '@/contexts/ModelContext';
import { modelRegistry } from '@/core/registry';

export function ModelSelector() {
  const { currentModel, setModel, availableModels } = useModel();

  // Don't show selector if only one model is available
  if (availableModels.length <= 1) {
    return null;
  }

  return (
    <Select value={currentModel.name} onValueChange={setModel}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {availableModels.map((modelName) => {
          const model = modelRegistry.get(modelName);
          const version = model ? model.version : '';
          const displayName = model?.displayName || modelName;

          return (
            <SelectItem key={modelName} value={modelName}>
              {displayName} {version && `v${version}`}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
