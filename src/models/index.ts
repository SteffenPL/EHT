/**
 * Models module.
 * Import this file to register all available simulation models.
 */

// Import models to trigger their registration
import './eht';
import './toy';

// Re-export for convenience
export { EHTModel } from './eht';
export { ToyModel } from './toy';
