/**
 * Model context for managing the current simulation model across the app.
 * Manages both model and params together to ensure they stay in sync.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { modelRegistry, type ModelDefinition, type BaseSimulationParams } from '@/core/registry';

interface ModelContextType {
  /** The currently selected model */
  currentModel: ModelDefinition<BaseSimulationParams>;
  /** Current params for the model */
  currentParams: BaseSimulationParams;
  /** Set the current model by name (resets params to model defaults) */
  setModel: (modelName: string) => void;
  /** Update current params */
  setParams: (params: BaseSimulationParams) => void;
  /** List of all available model names */
  availableModels: string[];
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  // console.log('[ModelProvider] Rendering, registry size:', modelRegistry.getModelNames().length);
  const availableModels = modelRegistry.getModelNames();
  const defaultModel = modelRegistry.getDefault() || (availableModels.length > 0 ? modelRegistry.get(availableModels[0]) : undefined);

  if (!defaultModel) {
    throw new Error('No models registered. Import @/models to register models.');
  }

  const [currentModel, setCurrentModel] = useState<ModelDefinition<BaseSimulationParams>>(
    defaultModel
  );
  const [currentParams, setCurrentParams] = useState<BaseSimulationParams>(
    defaultModel.defaultParams
  );

  const setModel = useCallback((modelName: string) => {
    const model = modelRegistry.get(modelName);
    if (model) {
      // Update both model and params together in the same render cycle
      setCurrentModel(model);
      setCurrentParams(model.defaultParams);
    } else {
      console.warn(`Model "${modelName}" not found in registry`);
    }
  }, []);

  const setParams = useCallback((params: BaseSimulationParams) => {
    setCurrentParams(params);
  }, []);

  return (
    <ModelContext.Provider value={{ currentModel, currentParams, setModel, setParams, availableModels }}>
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
