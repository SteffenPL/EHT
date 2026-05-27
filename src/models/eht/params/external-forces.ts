export const DEFAULT_EXTERNAL_FORCES = ['', '', ''] as const;
export const DEFAULT_EXTERNAL_FORCE_VALUES = [1, 1, 1] as const;

export type ExternalForceCompatCellType = {
  external_force?: unknown;
  external_forces?: unknown;
  external_force_values?: unknown;
};

export function normalizeExternalForces(
  cellType: ExternalForceCompatCellType,
  preferDeprecatedSingle = false
): string[] {
  if (preferDeprecatedSingle && typeof cellType.external_force === 'string') {
    const remainingDefaults = DEFAULT_EXTERNAL_FORCES.slice(1);
    return [cellType.external_force.trim() || '0', ...remainingDefaults];
  }

  if (Array.isArray(cellType.external_forces)) {
    const formulas = cellType.external_forces
      .filter((formula): formula is string => typeof formula === 'string')
      .map((formula) => formula.trim());
    return formulas.length > 0 ? formulas : [...DEFAULT_EXTERNAL_FORCES];
  }

  if (typeof cellType.external_force === 'string') {
    return [cellType.external_force.trim()];
  }

  return [...DEFAULT_EXTERNAL_FORCES];
}

export function normalizeExternalForceValues(cellType: ExternalForceCompatCellType): number[] {
  if (Array.isArray(cellType.external_force_values)) {
    const explicitValues = cellType.external_force_values
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const rowCount = Math.max(explicitValues.length, DEFAULT_EXTERNAL_FORCE_VALUES.length);
    return Array.from({ length: rowCount }, (_, index) =>
      explicitValues[index] ?? DEFAULT_EXTERNAL_FORCE_VALUES[index] ?? 1
    );
  }

  return [...DEFAULT_EXTERNAL_FORCE_VALUES];
}

export function normalizeCellTypeExternalForces(
  cellType: ExternalForceCompatCellType,
  preferDeprecatedSingle = false
): void {
  cellType.external_force_values = normalizeExternalForceValues(cellType);
  cellType.external_forces = normalizeExternalForces(cellType, preferDeprecatedSingle);
  delete cellType.external_force;
}
