export const DEFAULT_EXTERNAL_FORCES = ['0', '0', '0'] as const;

export type ExternalForceCompatCellType = {
  external_force?: unknown;
  external_forces?: unknown;
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
      .map((formula) => formula.trim() || '0');
    return formulas.length > 0 ? formulas : [...DEFAULT_EXTERNAL_FORCES];
  }

  if (typeof cellType.external_force === 'string') {
    return [cellType.external_force.trim() || '0'];
  }

  return [...DEFAULT_EXTERNAL_FORCES];
}

export function normalizeCellTypeExternalForces(
  cellType: ExternalForceCompatCellType,
  preferDeprecatedSingle = false
): void {
  cellType.external_forces = normalizeExternalForces(cellType, preferDeprecatedSingle);
  delete cellType.external_force;
}
