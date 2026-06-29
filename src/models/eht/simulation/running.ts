import { Vector2 } from '@/core/math/vector2';
import { getWorkingBasalGeometry } from '../tissue-lines';
import type { CellState, EHTSimulationState } from '../types';

const RUNNING_ACTIVATION_EPSILON_RADIUS = 0.01;

export function getRunningBasalSignedDistance(
  state: EHTSimulationState,
  point: Vector2
): number {
  const geometry = getWorkingBasalGeometry(state);
  const projected = geometry.projectPoint(point);
  const normal = geometry.getNormal(projected);

  return point.sub(projected).dot(normal);
}

export function shouldCellRun(cell: CellState, state: EHTSimulationState): boolean {
  if (cell.has_B || cell.running_mode <= 0) {
    return false;
  }

  if (cell.running_mode >= 3) {
    return true;
  }

  const signedDistance = getRunningBasalSignedDistance(state, Vector2.from(cell.B));
  return signedDistance < -RUNNING_ACTIVATION_EPSILON_RADIUS * cell.R_soft;
}

export function advanceRunningBasalPoint(
  cell: CellState,
  runningDistance: number
): void {
  if (runningDistance === 0) {
    return;
  }

  const dx = cell.B.x - cell.pos.x;
  const dy = cell.B.y - cell.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) {
    return;
  }

  const scale = runningDistance / dist;
  cell.B.x += dx * scale;
  cell.B.y += dy * scale;
}

export function runningBasalCytoskeletonLength(cell: CellState): number {
  const distance = Vector2.from(cell.pos).dist(Vector2.from(cell.B));
  return Math.max(0, distance - cell.R_soft);
}
