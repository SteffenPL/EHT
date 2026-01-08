/**
 * Model registry - central registry for all simulation models.
 * Models register themselves on import, and the registry provides
 * lookup and version compatibility checking.
 */

import type { ModelDefinition, BaseSimulationParams } from './types';
import type { SemanticVersion } from './version';
import { parseVersion, formatVersion, isCompatible } from './version';

/** Model registry entry - stores all versions of a model */
interface RegistryEntry {
  latestModel: ModelDefinition;
  versions: Map<string, ModelDefinition>; // version string -> definition
}

/**
 * Global model registry.
 * Models register themselves when their module is imported.
 */
class ModelRegistry {
  private models: Map<string, RegistryEntry> = new Map();
  private defaultModelName: string | null = null;

  constructor() {
    console.log('[Registry] Initializing');
  }

  /**
   * Register a model definition.
   * If multiple versions of the same model are registered,
   * the latest version becomes the default for that model name.
   */
  register<T extends BaseSimulationParams>(model: ModelDefinition<T>): void {
    // modelVersion is string in SimulationModel
    const version = parseVersion(model.version);
    const versionStr = formatVersion(version);

    // Cast to unknown first to avoid type variance issues
    const modelDef = model as unknown as ModelDefinition;

    // Use model.id as the key, NOT model.name
    // model.id (e.g. "EHT", "Toy") is the stable identifier
    if (!this.models.has(model.id)) {
      this.models.set(model.id, {
        latestModel: modelDef,
        versions: new Map([[versionStr, modelDef]]),
      });
      console.log(`[Registry] Registered new model: ${model.id} (v${versionStr})`);
    } else {
      const entry = this.models.get(model.id)!;
      entry.versions.set(versionStr, modelDef);
      // Update latest if this version is newer
      const currentVersion = parseVersion(entry.latestModel.version);
      if (
        version.major > currentVersion.major ||
        (version.major === currentVersion.major &&
          version.minor > currentVersion.minor) ||
        (version.major === currentVersion.major &&
          version.minor === currentVersion.minor &&
          version.patch > currentVersion.patch)
      ) {
        entry.latestModel = modelDef;
        console.log(`[Registry] Updated model ${model.id} to version ${versionStr}`);
      }
    }
  }

  /**
   * Set the default model (used when no model is specified in params).
   * The model must already be registered.
   */
  setDefault(modelName: string): void {
    if (!this.models.has(modelName)) {
      throw new Error(`Cannot set default: model "${modelName}" is not registered`);
    }
    this.defaultModelName = modelName;
  }

  /**
   * Get a model by name (returns latest version).
   */
  get(name: string): ModelDefinition | undefined {
    return this.models.get(name)?.latestModel;
  }

  /**
   * Get a specific version of a model.
   */
  getVersion(name: string, version: string): ModelDefinition | undefined {
    return this.models.get(name)?.versions.get(version);
  }

  /**
   * Get all registered model names.
   */
  getModelNames(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Get all versions for a model.
   */
  getVersions(name: string): string[] {
    const entry = this.models.get(name);
    return entry ? Array.from(entry.versions.keys()) : [];
  }

  /**
   * Get the default model.
   */
  getDefault(): ModelDefinition | undefined {
    return this.defaultModelName ? this.get(this.defaultModelName) : undefined;
  }

  /**
   * Get the default model name.
   */
  getDefaultName(): string | null {
    return this.defaultModelName;
  }

  /**
   * Find a compatible model for given params metadata.
   * Looks for the same major version and returns the highest compatible minor/patch.
   */
  findCompatibleModel(metadata: { model: string; version: string }): ModelDefinition | undefined {
    const entry = this.models.get(metadata.model);
    if (!entry) return undefined;

    const requestedVersion = parseVersion(metadata.version);

    // Find the best compatible version (same major, highest minor/patch that's >= requested)
    let bestMatch: ModelDefinition | undefined;
    let bestVersion: SemanticVersion | undefined;

    for (const [vStr, model] of entry.versions) {
      const v = parseVersion(vStr);
      if (isCompatible(v, requestedVersion)) {
        if (
          !bestVersion ||
          v.minor > bestVersion.minor ||
          (v.minor === bestVersion.minor && v.patch > bestVersion.patch)
        ) {
          bestMatch = model;
          bestVersion = v;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Check if a model is registered.
   */
  has(name: string): boolean {
    return this.models.has(name);
  }

  /**
   * Get all registered models (latest versions).
   */
  getAll(): ModelDefinition[] {
    return Array.from(this.models.values()).map((entry) => entry.latestModel);
  }
}

// Singleton instance
export const modelRegistry = new ModelRegistry();
