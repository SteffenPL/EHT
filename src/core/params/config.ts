/**
 * Combined configuration used across single and batch simulations.
 * Includes base parameters, parameter ranges, and batch sampling settings.
 */
// import type { SimulationParams } from '../types';
type SimulationParams = any;
import type { ParameterRange, TimeSampleConfig } from '../batch';
import { createDefaultParams } from './defaults';

export interface SimulationConfig {
  params: SimulationParams;
  parameterRanges: ParameterRange[];
  timeSamples: TimeSampleConfig;
  seedsPerConfig: number;
}

export const DEFAULT_TIME_SAMPLES: TimeSampleConfig = {
  start: 0,
  end: 48,
  step: 12,
};

/**
 * Create a fresh configuration with defaults.
 */
export function createDefaultSimulationConfig(): SimulationConfig {
  return {
    params: createDefaultParams(),
    parameterRanges: [],
    timeSamples: { ...DEFAULT_TIME_SAMPLES },
    seedsPerConfig: 1,
  };
}
