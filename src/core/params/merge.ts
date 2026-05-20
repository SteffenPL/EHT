/**
 * Deep merge utility for parameters.
 * Merges partial parameters over defaults for backwards compatibility.
 */
// import type { SimulationParams, PartialSimulationParams } from '../types';
type SimulationParams = any;
type PartialSimulationParams = any;
import {
  DEFAULT_PARAMS,
  DEFAULT_CONTROL_CELL,
  LEGACY_DEFAULT_CONTROL_CELL,
  LEGACY_DEFAULT_EHT_PARAMS,
} from './defaults';
import { mergeWith, isPlainObject } from 'lodash-es';
import { ensureV1_1_0 } from '@/models/eht/params/migration-v1.1';
import { ensureV1_2_0 } from '@/models/eht/params/migration-v1.2';
import { ensureV1_3_0 } from '@/models/eht/params/migration-v1.3';
import { ensureV1_4_0 } from '@/models/eht/params/migration-v1.4';
import { ensureV1_5_0 } from '@/models/eht/params/migration-v1.5';
import { ensureV2_0 } from '@/models/eht/params/migration-v2.0';
import { compareVersionStrings, isBeforeParamFormatV2 } from '@/models/eht/params/unit-conversion';

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
  const inputVersion = partial.metadata?.version ?? '1.0.0';
  const isLegacyInput = isBeforeParamFormatV2(inputVersion)
    && partial.metadata?.unit_system !== 'microns';

  // Start with a deep copy of the matching unit baseline.
  const result = structuredClone(isLegacyInput ? LEGACY_DEFAULT_EHT_PARAMS : defaults);

  // Merge general params
  if (partial.general) {
    mergeWith(result.general, partial.general, customMerge);
  }

  // Merge cell_prop params
  if (partial.cell_prop) {
    mergeWith(result.cell_prop, partial.cell_prop, customMerge);
  }

  // Set the metadata version to the input version so migration checks work correctly.
  // Without this, the result would have the default version which skips migrations.
  result.metadata = { ...result.metadata, ...partial.metadata, version: inputVersion };

  // Strip fields from defaults that only exist in later versions,
  // so the migration chain can add them properly
  if (compareVersionStrings(inputVersion, '1.2.0') < 0) {
    delete result.general.default_events;
  }
  if (compareVersionStrings(inputVersion, '1.1.0') < 0) {
    // Strip skip_default_events from cell type defaults for pre-v1.1.0
    for (const ct of Object.values(result.cell_types)) {
      delete (ct as unknown as Record<string, unknown>).skip_default_events;
    }
  }

  // Replace cell types entirely when provided in TOML
  // This ensures that importing a TOML with different cell type names
  // doesn't leave stale default types (e.g., importing 'EHT' shouldn't keep 'emt')
  if (partial.cell_types) {
    // Clear default cell types and replace with imported ones
    result.cell_types = {};
    for (const [typeName, partialType] of Object.entries(partial.cell_types)) {
      // Each imported type is merged over control defaults for completeness
      const newType = structuredClone(isLegacyInput ? LEGACY_DEFAULT_CONTROL_CELL : DEFAULT_CONTROL_CELL);
      // For pre-v1.1.0 files, remove events_v2 from defaults so migration
      // can convert legacy v1 events instead of keeping empty defaults
      if (compareVersionStrings(inputVersion, '1.1.0') < 0) {
        delete (newType as unknown as Record<string, unknown>).events_v2;
        delete (newType as unknown as Record<string, unknown>).skip_default_events;
      }
      mergeWith(newType, partialType, customMerge);
      result.cell_types[typeName] = newType;
    }
  }

  // Run EHT migration chain: v1.0.0 → v1.1.0 → v1.2.0 → v1.3.0 → v1.4.0 → v1.5.0 → v2.0.0
  return ensureV2_0(ensureV1_5_0(ensureV1_4_0(ensureV1_3_0(ensureV1_2_0(ensureV1_1_0(result))))));
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
