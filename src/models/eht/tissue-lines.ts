/**
 * Curved-coordinate tissue line utilities for EHT statistics and rendering.
 *
 * A point P is represented as (s, h), where s is arc length along the basal
 * geometry and h is signed distance along the local basal normal into tissue.
 */

import { Vector2 } from '@/core/math/vector2';
import { createBasalGeometry, type BasalGeometry } from '@/core/math';
import type { EHTSimulationState, CellState } from './types';
import type { EHTParams } from './params/types';

export interface CurvedCoordinate {
  s: number;
  h: number;
  projected: Vector2;
  normal: Vector2;
}

export interface TissueLineSample {
  cellIndex: number;
  s: number;
  h: number;
  point: Vector2;
}

export interface TissueLineSamples {
  geometry: BasalGeometry;
  fullCircle: boolean;
  basal: TissueLineSample[];
  apical: TissueLineSample[];
  control: TissueLineSample[];
}

/**
 * Get a working BasalGeometry instance from state.
 * Handles cases where state was cloned and class methods were lost.
 */
export function getWorkingBasalGeometry(state: EHTSimulationState): BasalGeometry {
  if (typeof state.basalGeometry?.getArcLength === 'function') {
    return state.basalGeometry;
  }

  const curvature_1 = state.geometry?.curvature_1 ?? state.basalGeometry?.curvature_1 ?? 0;
  const curvature_2 = state.geometry?.curvature_2 ?? state.basalGeometry?.curvature_2 ?? 0;

  return createBasalGeometry(curvature_1, curvature_2, 360);
}

function shouldUsePeriodicCoordinates(geometry: BasalGeometry, fullCircle: boolean): boolean {
  return fullCircle && Number.isFinite(geometry.perimeter) && geometry.perimeter > 0;
}

function normalizeArcLength(s: number, geometry: BasalGeometry, fullCircle: boolean): number {
  if (!shouldUsePeriodicCoordinates(geometry, fullCircle)) {
    return s;
  }

  return ((s % geometry.perimeter) + geometry.perimeter) % geometry.perimeter;
}

function curvedCoordinateToCartesian(
  geometry: BasalGeometry,
  s: number,
  h: number,
  fullCircle: boolean
): Vector2 {
  const normalizedS = normalizeArcLength(s, geometry, fullCircle);

  if (geometry.type === 'circle') {
    const circle = geometry as BasalGeometry & { radius: number; dir: number };
    const theta = normalizedS / circle.radius;
    const basalPoint = new Vector2(
      circle.center.x + circle.dir * circle.radius * Math.sin(theta),
      circle.center.y + circle.dir * circle.radius * Math.cos(theta)
    );
    const normal = geometry.getNormal(basalPoint);
    return basalPoint.add(normal.scale(h));
  }

  return geometry.curvedToCartesian(normalizedS, h);
}

export function toCurvedCoordinate(
  point: Vector2,
  geometry: BasalGeometry,
  fullCircle: boolean
): CurvedCoordinate {
  const projected = geometry.projectPoint(point);
  const normal = geometry.getNormal(projected);
  const s = normalizeArcLength(geometry.getArcLength(projected), geometry, fullCircle);
  const h = point.sub(projected).dot(normal);

  return { s, h, projected, normal };
}

function buildSamples(
  cells: CellState[],
  geometry: BasalGeometry,
  fullCircle: boolean,
  pointForCell: (cell: CellState) => Vector2,
  includeCell: (cell: CellState, index: number) => boolean
): TissueLineSample[] {
  const samples: TissueLineSample[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!includeCell(cell, i)) continue;

    const point = pointForCell(cell);
    const coord = toCurvedCoordinate(point, geometry, fullCircle);
    samples.push({
      cellIndex: i,
      s: coord.s,
      h: coord.h,
      point,
    });
  }

  samples.sort((a, b) => a.s - b.s || a.cellIndex - b.cellIndex);
  return samples;
}

export function buildTissueLineSamples(
  state: EHTSimulationState,
  params: EHTParams,
  boundaryCells: Set<number> = new Set()
): TissueLineSamples {
  const geometry = getWorkingBasalGeometry(state);
  const fullCircle = params.general.full_circle;

  return {
    geometry,
    fullCircle,
    basal: buildSamples(
      state.cells,
      geometry,
      fullCircle,
      (cell) => Vector2.from(cell.B),
      (cell, index) => cell.typeIndex === 'control' && !boundaryCells.has(index) && cell.has_B
    ),
    apical: buildSamples(
      state.cells,
      geometry,
      fullCircle,
      (cell) => Vector2.from(cell.A),
      (cell, index) => cell.typeIndex === 'control' && !boundaryCells.has(index) && cell.has_A
    ),
    control: buildSamples(
      state.cells,
      geometry,
      fullCircle,
      (cell) => Vector2.from(cell.pos),
      (cell, index) => cell.typeIndex === 'control' && !boundaryCells.has(index)
    ),
  };
}

export function interpolateTissueLineHeight(
  samples: TissueLineSample[],
  queryS: number,
  geometry: BasalGeometry,
  fullCircle: boolean
): number | null {
  if (samples.length === 0) return null;
  if (samples.length === 1) return samples[0].h;

  const periodic = shouldUsePeriodicCoordinates(geometry, fullCircle);
  const s = normalizeArcLength(queryS, geometry, fullCircle);

  if (!periodic) {
    if (s <= samples[0].s) return samples[0].h;
    const last = samples[samples.length - 1];
    if (s >= last.s) return last.h;

    for (let i = 0; i < samples.length - 1; i++) {
      const left = samples[i];
      const right = samples[i + 1];
      if (s < left.s || s > right.s) continue;

      const span = right.s - left.s;
      if (Math.abs(span) < 1e-10) return left.h;

      const t = (s - left.s) / span;
      return left.h + t * (right.h - left.h);
    }

    return last.h;
  }

  for (let i = 0; i < samples.length - 1; i++) {
    const left = samples[i];
    const right = samples[i + 1];
    if (s < left.s || s > right.s) continue;

    const span = right.s - left.s;
    if (Math.abs(span) < 1e-10) return left.h;

    const t = (s - left.s) / span;
    return left.h + t * (right.h - left.h);
  }

  const last = samples[samples.length - 1];
  const first = samples[0];
  const endS = first.s + geometry.perimeter;
  const evalS = s < first.s ? s + geometry.perimeter : s;
  const span = endS - last.s;
  if (Math.abs(span) < 1e-10) return last.h;

  const t = (evalS - last.s) / span;
  return last.h + t * (first.h - last.h);
}

function sampleSegment(
  points: Vector2[],
  samples: TissueLineSample[],
  geometry: BasalGeometry,
  fullCircle: boolean,
  leftIndex: number,
  rightIndex: number,
  pointsPerSegment: number,
  wrap: boolean
): void {
  const left = samples[leftIndex];
  const right = samples[rightIndex];
  const rightS = wrap ? right.s + geometry.perimeter : right.s;
  const span = rightS - left.s;
  const steps = Math.max(1, pointsPerSegment);

  for (let step = 0; step <= steps; step++) {
    if (points.length > 0 && step === 0) continue;

    const t = span === 0 ? 0 : step / steps;
    const rawS = left.s + t * span;
    const s = normalizeArcLength(rawS, geometry, fullCircle);
    const h = left.h + t * (right.h - left.h);
    points.push(curvedCoordinateToCartesian(geometry, s, h, fullCircle));
  }
}

export function sampleTissueLinePoints(
  samples: TissueLineSample[],
  geometry: BasalGeometry,
  fullCircle: boolean,
  pointsPerSegment = 8
): Vector2[] {
  if (samples.length === 0) return [];
  if (samples.length === 1) return [samples[0].point];

  const points: Vector2[] = [];

  for (let i = 0; i < samples.length - 1; i++) {
    sampleSegment(points, samples, geometry, fullCircle, i, i + 1, pointsPerSegment, false);
  }

  if (shouldUsePeriodicCoordinates(geometry, fullCircle)) {
    sampleSegment(points, samples, geometry, fullCircle, samples.length - 1, 0, pointsPerSegment, true);
  }

  return points;
}
