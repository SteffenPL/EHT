---
title: Basal-distance activation with Cartesian running
date: 2026-06-25
category: docs/solutions/logic-errors
module: EHT simulation running modes
problem_type: logic_error
component: tooling
symptoms:
  - Running modes 1 and 2 never activated after basal detachment
  - Activation mixed basal-distance checks with a contradictory signed-distance predicate
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags: [running-modes, basal-geometry, cartesian-motion, simulation]
---

# Basal-distance activation with Cartesian running

## Problem
The EHT running-mode implementation needed basal-geometry-aware activation without changing the actual running displacement law. Running should happen in Cartesian coordinates along `(B_i - X_i) / ||B_i - X_i||`; the basal curve is only needed to determine whether a detached cell has extruded far enough to start running.

## Symptoms
- `running_mode` 1 and 2 could not set `is_running = true` because the activation predicate required both `signedDistance < -2` and `signedDistance > 0`.
- Mode 2 used `cell.B.y > 0` to decide whether to retain basal cytoskeleton length, which only makes sense for flat line geometry.

## What Didn't Work
- Treating `running_mode >= 1` as a small variation of the mode 3 predicate left modes 1 and 2 unreachable.
- Using world `y` position as a proxy for extrusion worked only for the straight-line basal geometry and broke the curved-coordinate model.
- Moving the running basal point in curved `(s, h)` coordinates was the wrong correction because the model's running law is Cartesian.

## Solution
Split running into two responsibilities:

1. Use the basal geometry only to compute signed distance from the basal membrane for activation.
2. Move running basal points in Cartesian coordinates along the normalized vector from nucleus to basal point.

The corrected activation check lives in `src/models/eht/simulation/running.ts`:

```ts
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
  return signedDistance < -0.01 * cell.R_soft;
}
```

Running motion stays Cartesian:

```ts
export function advanceRunningBasalPoint(
  cell: CellState,
  runningDistance: number
): void {
  const dx = cell.B.x - cell.pos.x;
  const dy = cell.B.y - cell.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;

  const scale = runningDistance / dist;
  cell.B.x += dx * scale;
  cell.B.y += dy * scale;
}
```

Mode 2 now retains basal cytoskeleton length from the Cartesian nucleus-to-basal distance rather than from world `y`:

```ts
if (cell.running_mode >= 2) {
  cell.eta_B = runningBasalCytoskeletonLength(cell);
} else {
  cell.eta_B = expFactor * (cell.eta_B - basalDrl) + basalDrl;
}
```

## Why This Works
The basal geometry object is the source of truth for projection and local normals, so it is the right layer for deciding whether a detached cell is far enough from the basal membrane to run. Once running has activated, the biological/numerical rule is not arc-length travel along the curve; it is Cartesian displacement in the direction from `X_i` to `B_i`.

The corrected mode semantics are:

- Mode 0: never runs.
- Mode 1: after basal detachment, starts once the basal point is extruded just below the basal line, past `h < -0.01 * R_soft` along the opposite local normal.
- Mode 2: same activation as mode 1, but retains basal cytoskeleton length after detachment.
- Mode 3: starts immediately once basal adhesion is gone.

## Prevention
- Use basal projection and local normals for basal-distance conditions.
- Keep explicitly Cartesian model laws in Cartesian coordinates, even when their activation checks depend on curved geometry.
- Test mode predicates separately from timestep integration so contradictory conditions are visible.
- Add at least one curved geometry regression test for activation, and one Cartesian regression test for running displacement.

## Related Issues
- None in this lightweight pass.
