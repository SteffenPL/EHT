/**
 * Semantic versioning utilities for model version management.
 */

/** Semantic version representation */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse a version string "X.Y.Z" into a SemanticVersion object.
 * Missing parts default to 0 (e.g., "1.0" becomes {major: 1, minor: 0, patch: 0}).
 */
export function parseVersion(version: string): SemanticVersion {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/**
 * Compare two versions.
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Check if version `a` is compatible with version `b`.
 * Compatibility means same major version and a >= b.
 */
export function isCompatible(a: SemanticVersion, b: SemanticVersion): boolean {
  return a.major === b.major && compareVersions(a, b) >= 0;
}

/**
 * Format a SemanticVersion to a string "X.Y.Z".
 */
export function formatVersion(v: SemanticVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}
