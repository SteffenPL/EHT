/**
 * Model context for managing the current simulation model across the app.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { modelRegistry, type ModelDefinition, type BaseSimulationParams } from '@/core/registry';

interface ModelContextType {
  /** The currently selected model */
  currentModel: ModelDefinition<BaseSimulationParams>;
  /** Set the current model by name */
  setModel: (modelName: string) => void;
  /** List of all available model names */
  availableModels: string[];
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const availableModels = modelRegistry.getModelNames();
  const defaultModel = modelRegistry.getDefault();

  if (!defaultModel) {
    throw new Error('No models registered. Import @/models to register models.');
  }

  const [currentModel, setCurrentModel] = useState<ModelDefinition<BaseSimulationParams>>(
    defaultModel
  );

  const setModel = useCallback((modelName: string) => {
    const model = modelRegistry.get(modelName);
    if (model) {
      setCurrentModel(model);
    } else {
      console.warn(`Model "${modelName}" not found in registry`);
    }
  }, []);

  return (
    <ModelContext.Provider value={{ currentModel, setModel, availableModels }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel(): ModelContextType {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
}
