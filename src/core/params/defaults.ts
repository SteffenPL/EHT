/**
 * Default parameter values.
 *
 * This file re-exports from the EHT model for backwards compatibility.
 * For new code, prefer importing directly from @/models/eht.
 */

// Re-export everything from the EHT model defaults
export {
  DEFAULT_CONTROL_CELL,
  DEFAULT_EMT_CELL,
  DEFAULT_EHT_PARAMS as DEFAULT_PARAMS,
  createDefaultEHTParams as createDefaultParams,
  EHT_PRESETS as PARAM_PRESETS,
} from '@/models/eht/params/defaults';
