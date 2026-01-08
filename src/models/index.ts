console.log('[Models] Loading index');
import { modelRegistry } from '@/core/registry';
import { EHTModel } from './eht';
import { ToyModel } from './toy';

// Register models
modelRegistry.register(EHTModel);
modelRegistry.register(ToyModel);

// Set default
modelRegistry.setDefault(EHTModel.id);

// Re-export for convenience
export { EHTModel, ToyModel };
