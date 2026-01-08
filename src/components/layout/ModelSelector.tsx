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
    <Select value={currentModel.id} onValueChange={setModel}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {availableModels.map((modelId) => {
          const model = modelRegistry.get(modelId);
          const version = model ? model.version : '';
          const displayName = model?.name || modelId;

          return (
            <SelectItem key={modelId} value={modelId}>
              {displayName} {version && `v${version}`}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

