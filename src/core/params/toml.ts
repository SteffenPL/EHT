/**
 * TOML parsing and serialization for parameters.
 */
import TOML from '@iarna/toml';
// import type { SimulationParams, PartialSimulationParams } from '../types';
type SimulationParams = any;
type PartialSimulationParams = any;
import type { ParameterRange } from '../batch/types';
import { mergeWithDefaults } from './merge';
import type { SimulationConfig } from './config';
import { DEFAULT_TIME_SAMPLES } from './config';
import { validatePartialParams, safeValidatePartialParams } from './schema';

/** Result of parsing TOML with optional batch config */
export interface TomlParseResult {
  params: SimulationParams;
  parameterRanges?: ParameterRange[];
}

/**
 * Parse TOML string into partial parameters.
 * Does not merge with defaults - returns only what was in the file.
 *
 * @param tomlString - TOML formatted string
 * @returns Parsed partial parameters
 * @throws Error if TOML parsing fails
 */
export function parseToml(tomlString: string): PartialSimulationParams {
  const parsed = TOML.parse(tomlString);
  return parsed as PartialSimulationParams;
}

/**
 * Parse TOML string and merge with defaults.
 * This is the main function for loading parameters from files.
 *
 * @param tomlString - TOML formatted string
 * @returns Complete parameters with defaults applied
 * @throws Error if TOML parsing fails
 */
export function parseTomlWithDefaults(tomlString: string): SimulationParams {
  const partial = parseToml(tomlString);
  return mergeWithDefaults(partial);
}

/**
 * Parse and validate TOML string.
 *
 * @param tomlString - TOML formatted string
 * @returns Complete validated parameters
 * @throws Error if parsing or validation fails
 */
export function parseAndValidateToml(tomlString: string): SimulationParams {
  const partial = parseToml(tomlString);
  validatePartialParams(partial);
  return mergeWithDefaults(partial);
}

/**
 * Safe version that returns result object instead of throwing.
 */
export function safeParseToml(tomlString: string): {
  success: boolean;
  data?: SimulationParams;
  error?: Error;
} {
  try {
    const partial = parseToml(tomlString);
    const validation = safeValidatePartialParams(partial);
    if (!validation.success) {
      return {
        success: false,
        error: new Error(`Validation failed: ${validation.error.message}`),
      };
    }
    return {
      success: true,
      data: mergeWithDefaults(partial),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/**
 * Serialize parameters to TOML string.
 * Handles Infinity values by converting them to a special marker.
 *
 * @param params - Parameters to serialize
 * @returns TOML formatted string
 */
export function toToml(params: SimulationParams): string {
  // Convert Infinity to a large number that TOML can handle
  const prepared = JSON.parse(JSON.stringify(params, (_, value) => {
    if (value === Infinity) return 1e308;
    if (value === -Infinity) return -1e308;
    return value;
  }));

  return TOML.stringify(prepared);
}

/**
 * Serialize only the differences from defaults to TOML.
 * Useful for creating minimal config files.
 *
 * @param params - Parameters to serialize
 * @param defaults - Default parameters to compare against
 * @returns TOML formatted string with only non-default values
 */
export function toMinimalToml(
  params: SimulationParams,
  defaults: SimulationParams
): string {
  function getDiff(current: unknown, base: unknown): unknown {
    if (typeof current !== 'object' || current === null) {
      return current !== base ? current : undefined;
    }

    if (Array.isArray(current)) {
      return JSON.stringify(current) !== JSON.stringify(base) ? current : undefined;
    }

    const result: Record<string, unknown> = {};
    let hasChanges = false;

    for (const key of Object.keys(current as Record<string, unknown>)) {
      const currentVal = (current as Record<string, unknown>)[key];
      const baseVal = base && typeof base === 'object' ?
        (base as Record<string, unknown>)[key] : undefined;

      const diff = getDiff(currentVal, baseVal);
      if (diff !== undefined) {
        result[key] = diff;
        hasChanges = true;
      }
    }

    return hasChanges ? result : undefined;
  }

  const diff = getDiff(params, defaults) as PartialSimulationParams | undefined;
  if (!diff) {
    return '# Using all default values\n';
  }

  return toToml(diff as SimulationParams);
}

/**
 * Load parameters from a TOML file (browser environment).
 * Uses the Fetch API.
 *
 * @param url - URL to the TOML file
 * @returns Promise resolving to complete parameters
 */
export async function loadTomlFromUrl(url: string): Promise<SimulationParams> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load TOML from ${url}: ${response.statusText}`);
  }
  const tomlString = await response.text();
  return parseTomlWithDefaults(tomlString);
}

/**
 * Parse TOML string and extract both parameters and optional parameter_ranges.
 * The parameter_ranges section is stored separately and not merged with simulation params.
 *
 * @param tomlString - TOML formatted string
 * @returns Object containing params and optional parameterRanges
 */
export function parseTomlWithRanges(tomlString: string): TomlParseResult {
  const parsed = TOML.parse(tomlString) as Record<string, unknown>;

  // Extract parameter_ranges if present
  let parameterRanges: ParameterRange[] | undefined;
  if (parsed.parameter_ranges && Array.isArray(parsed.parameter_ranges)) {
    parameterRanges = (parsed.parameter_ranges as unknown[]).map((r) => {
      const range = r as Record<string, unknown>;
      return {
        path: String(range.path ?? ''),
        min: Number(range.min ?? 0),
        max: Number(range.max ?? 0),
        steps: Number(range.steps ?? 1),
      };
    });
    // Remove from parsed so it doesn't interfere with param validation
    delete parsed.parameter_ranges;
  }

  // Parse remaining as simulation params
  const partial = parsed as PartialSimulationParams;
  const params = mergeWithDefaults(partial);

  return { params, parameterRanges };
}

/**
 * Serialize parameters to TOML string, optionally including parameter_ranges.
 *
 * @param params - Simulation parameters to serialize
 * @param parameterRanges - Optional array of parameter ranges to include
 * @returns TOML formatted string
 */
export function toTomlWithRanges(
  params: SimulationParams,
  parameterRanges?: ParameterRange[]
): string {
  // Convert Infinity to a large number that TOML can handle
  const prepared = JSON.parse(JSON.stringify(params, (_, value) => {
    if (value === Infinity) return 1e308;
    if (value === -Infinity) return -1e308;
    return value;
  }));

  // Add parameter_ranges if provided and non-empty
  if (parameterRanges && parameterRanges.length > 0) {
    prepared.parameter_ranges = parameterRanges;
  }

  return TOML.stringify(prepared);
}

/**
 * Parse TOML string into a unified simulation configuration.
 * Includes base params, parameter ranges, time samples, and seeds per config.
 */
export function parseSimulationConfigToml(tomlString: string): SimulationConfig {
  const parsed = TOML.parse(tomlString) as Record<string, unknown>;

  // Extract parameter_ranges if present
  let parameterRanges: ParameterRange[] = [];
  if (parsed.parameter_ranges && Array.isArray(parsed.parameter_ranges)) {
    parameterRanges = (parsed.parameter_ranges as unknown[]).map((r) => {
      const range = r as Record<string, unknown>;
      return {
        path: String(range.path ?? ''),
        min: Number(range.min ?? 0),
        max: Number(range.max ?? 0),
        steps: Number(range.steps ?? 1),
      };
    });
    delete parsed.parameter_ranges;
  }

  // Extract time_samples if present
  let timeSamples = { ...DEFAULT_TIME_SAMPLES };
  if (parsed.time_samples && typeof parsed.time_samples === 'object') {
    const ts = parsed.time_samples as Record<string, unknown>;
    timeSamples = {
      start: Number(ts.start ?? DEFAULT_TIME_SAMPLES.start),
      end: Number(ts.end ?? DEFAULT_TIME_SAMPLES.end),
      step: Number(ts.step ?? DEFAULT_TIME_SAMPLES.step),
    };
    delete parsed.time_samples;
  }

  // Extract seeds_per_config if present
  const seedsRaw = parsed.seeds_per_config;
  const seedsPerConfig =
    typeof seedsRaw === 'number' && !Number.isNaN(seedsRaw) ? seedsRaw : 1;
  if ('seeds_per_config' in parsed) {
    delete parsed.seeds_per_config;
  }

  // Parse remaining as simulation params
  const partial = parsed as PartialSimulationParams;
  const params = mergeWithDefaults(partial);

  return {
    params,
    parameterRanges,
    timeSamples,
    seedsPerConfig,
  };
}

/**
 * Serialize unified simulation configuration to TOML string.
 * Always writes params together with parameter ranges, time samples, and seeds.
 */
export function toSimulationConfigToml(config: SimulationConfig): string {
  const prepared = JSON.parse(JSON.stringify(config.params, (_, value) => {
    if (value === Infinity) return 1e308;
    if (value === -Infinity) return -1e308;
    return value;
  }));

  prepared.parameter_ranges = config.parameterRanges ?? [];
  prepared.time_samples = config.timeSamples ?? DEFAULT_TIME_SAMPLES;
  prepared.seeds_per_config = config.seedsPerConfig ?? 1;

  return TOML.stringify(prepared);
}
