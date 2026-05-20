import type { EHTCellTypeParams, EHTParams } from './types';
import { compareVersions, parseVersion } from '@/core/registry/version';

export const LEGACY_MICRONS_PER_UNIT = 5;
export const EHT_PARAM_FORMAT_VERSION = '2.0.0';

export const GENERAL_LENGTH_FIELDS = [
  'w_init',
  'h_init',
  'w_screen',
  'h_screen',
  'perimeter',
] as const;

export const CELL_TYPE_LENGTH_FIELDS = [
  'R_hard',
  'R_hard_div',
  'R_soft',
  'max_cytoskeleton_length',
  'running_speed',
  'diffusion',
  'max_basal_junction_dist',
  'cytos_init',
  'apical_junction_init',
] as const;

export const RUNTIME_CELL_LENGTH_TARGETS = [
  'R_soft',
  'R_hard',
  'eta_A',
  'eta_B',
] as const;

const GENERAL_LENGTH_FIELD_SET = new Set<string>(GENERAL_LENGTH_FIELDS);
const CELL_TYPE_LENGTH_FIELD_SET = new Set<string>(CELL_TYPE_LENGTH_FIELDS);
const RUNTIME_CELL_LENGTH_TARGET_SET = new Set<string>(RUNTIME_CELL_LENGTH_TARGETS);

export type UnitDirection = 'legacy-to-microns' | 'microns-to-legacy';

export function compareVersionStrings(a: string | undefined, b: string): number {
  return compareVersions(parseVersion(a ?? '1.0.0'), parseVersion(b));
}

export function isBeforeParamFormatV2(version: string | undefined): boolean {
  return compareVersionStrings(version, EHT_PARAM_FORMAT_VERSION) < 0;
}

export function isV2OrLater(version: string | undefined): boolean {
  return compareVersionStrings(version, EHT_PARAM_FORMAT_VERSION) >= 0;
}

export function isGeneralLengthField(field: string): boolean {
  return GENERAL_LENGTH_FIELD_SET.has(field);
}

export function isCellTypeLengthField(field: string): boolean {
  return CELL_TYPE_LENGTH_FIELD_SET.has(field);
}

export function isRuntimeCellLengthTarget(target: string): boolean {
  return RUNTIME_CELL_LENGTH_TARGET_SET.has(target) || isCellTypeLengthField(target);
}

export function isLengthParameterPath(path: string): boolean {
  if (path.startsWith('general.')) {
    return isGeneralLengthField(path.slice('general.'.length));
  }

  const parts = path.split('.');
  return parts.length === 3
    && parts[0] === 'cell_types'
    && isCellTypeLengthField(parts[2]);
}

export function getScaleFactor(direction: UnitDirection): number {
  return direction === 'legacy-to-microns'
    ? LEGACY_MICRONS_PER_UNIT
    : 1 / LEGACY_MICRONS_PER_UNIT;
}

function scaleNumber(value: unknown, factor: number): unknown {
  return typeof value === 'number' ? value * factor : value;
}

function scaleCellType(cellType: EHTCellTypeParams, factor: number): void {
  const mutableCellType = cellType as unknown as Record<string, unknown>;
  for (const field of CELL_TYPE_LENGTH_FIELDS) {
    mutableCellType[field] = scaleNumber(mutableCellType[field], factor);
  }
}

export function scaleEHTLengthParams(params: EHTParams, direction: UnitDirection): EHTParams {
  const scaled = structuredClone(params);
  const factor = getScaleFactor(direction);

  const general = scaled.general as unknown as Record<string, unknown>;
  for (const field of GENERAL_LENGTH_FIELDS) {
    general[field] = scaleNumber(general[field], factor);
  }

  for (const cellType of Object.values(scaled.cell_types)) {
    scaleCellType(cellType, factor);
  }

  return scaled;
}

export function legacyParamsToMicrons(params: EHTParams): EHTParams {
  return scaleEHTLengthParams(params, 'legacy-to-microns');
}

export function micronParamsToLegacy(params: EHTParams): EHTParams {
  return scaleEHTLengthParams(params, 'microns-to-legacy');
}

export function scaleValueForPath(value: number, path: string, direction: UnitDirection): number {
  if (!isLengthParameterPath(path)) return value;
  return value * getScaleFactor(direction);
}

export function scaleFormulaScopeValue(
  value: unknown,
  isLengthLike: boolean,
  direction: UnitDirection
): unknown {
  return isLengthLike ? scaleNumber(value, getScaleFactor(direction)) : value;
}
