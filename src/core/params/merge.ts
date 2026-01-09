/**
 * Deep merge utility for parameters.
 * Merges partial parameters over defaults for backwards compatibility.
 */
// import type { SimulationParams, PartialSimulationParams } from '../types';
type SimulationParams = any;
type PartialSimulationParams = any;
import { DEFAULT_PARAMS, DEFAULT_CONTROL_CELL } from './defaults';
import { cloneDeep, mergeWith, isPlainObject } from 'lodash-es';

/**
 * Custom merge function that handles nested objects properly.
 * Arrays are replaced, not merged.
 */
function customMerge(objValue: unknown, srcValue: unknown): unknown {
  // If source is undefined, keep the original
  if (srcValue === undefined) {
    return objValue;
  }
  // Arrays are replaced entirely
  if (Array.isArray(srcValue)) {
    return srcValue;
  }
  // Let lodash handle object merging recursively
  if (isPlainObject(objValue) && isPlainObject(srcValue)) {
    return undefined; // Let mergeWith recurse
  }
  // Primitives: use source value
  return srcValue;
}

/**
 * Deep merge partial parameters over defaults.
 * Missing fields in partial params will use default values.
 *
 * @param partial - Partial parameters (e.g., loaded from TOML)
 * @param defaults - Default parameters (defaults to DEFAULT_PARAMS)
 * @returns Complete parameters with all fields filled
 */
export function mergeWithDefaults(
  partial: PartialSimulationParams,
  defaults: SimulationParams = DEFAULT_PARAMS
): SimulationParams {
  // Start with a deep copy of defaults
  const result = cloneDeep(defaults);

  // Merge general params
  if (partial.general) {
    mergeWith(result.general, partial.general, customMerge);
  }

  // Merge cell_prop params
  if (partial.cell_prop) {
    mergeWith(result.cell_prop, partial.cell_prop, customMerge);
  }

  // Merge cell types - special handling for custom types
  if (partial.cell_types) {
    for (const [typeName, partialType] of Object.entries(partial.cell_types)) {
      if (typeName in result.cell_types) {
        // Existing type: merge over existing defaults
        mergeWith(result.cell_types[typeName], partialType, customMerge);
      } else {
        // New custom type: merge over control defaults
        const newType = cloneDeep(DEFAULT_CONTROL_CELL);
        mergeWith(newType, partialType, customMerge);
        result.cell_types[typeName] = newType;
      }
    }
  }

  return result;
}

/**
 * Get a nested value from an object using a dot-separated path.
 *
 * @param obj - Object to get value from
 * @param path - Dot-separated path (e.g., "general.N_init")
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Set a nested value in an object using a dot-separated path.
 * Creates intermediate objects if they don't exist.
 *
 * @param obj - Object to set value in
 * @param path - Dot-separated path (e.g., "general.N_init")
 * @param value - Value to set
 */
export function setNestedValue(obj: unknown, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Apply parameter overrides to a params object.
 * Overrides are in the format "path=value".
 *
 * @param params - Parameters to modify
 * @param overrides - Array of override strings (e.g., ["general.N_init=50"])
 * @returns Modified parameters (mutates input)
 */
export function applyOverrides(
  params: SimulationParams,
  overrides: string[]
): SimulationParams {
  for (const override of overrides) {
    const [path, valueStr] = override.split('=');
    if (!path || valueStr === undefined) {
      console.warn(`Invalid override format: ${override}`);
      continue;
    }

    // Try to parse as number, boolean, or keep as string
    let value: unknown = valueStr;
    if (valueStr === 'true') {
      value = true;
    } else if (valueStr === 'false') {
      value = false;
    } else if (!isNaN(Number(valueStr))) {
      value = Number(valueStr);
    }

    setNestedValue(params, path.trim(), value);
  }

  return params;
}
