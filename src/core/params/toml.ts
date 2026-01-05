/**
 * TOML parsing and serialization for parameters.
 */
import TOML from '@iarna/toml';
import type { SimulationParams, PartialSimulationParams } from '../types';
import { mergeWithDefaults } from './merge';
import { validatePartialParams, safeValidatePartialParams } from './schema';

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
