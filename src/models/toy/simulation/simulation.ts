/**
 * Toy model simulation engine.
 * Simple run-and-tumble dynamics with repulsion.
 */

import { Vector2, SeededRandom } from '@/core/math';
import type { ToyParams } from '../params/types';
import type { ToyCell, ToySimulationState } from './types';

/**
 * Initialize simulation state.
 */
export function initializeToySimulation(
  params: ToyParams,
  rng: SeededRandom,
  seed?: string
): ToySimulationState {
  const { N, domain_size, running_duration, tumbling_duration } = params.general;
  const [width, height] = domain_size;
  const cycleDuration = running_duration + tumbling_duration;

  const cells: ToyCell[] = [];
  for (let i = 0; i < N; i++) {
    // Random initial position within domain
    const position = new Vector2(rng.random(width), rng.random(height));

    // Random initial polarity
    const angle = rng.random(2 * Math.PI);
    const polarity = Vector2.fromAngle(angle);

    // Random starting phase
    const startPhase = rng.random(cycleDuration);
    const isRunning = startPhase < running_duration;

    cells.push({
      id: i,
      position,
      prevPosition: position,
      polarity,
      phase: isRunning ? 'running' : 'tumbling',
      phaseTime: isRunning ? startPhase : startPhase - running_duration,
      timeSinceLastTumble: 0,
    });
  }

  return {
    t: 0,
    cells,
    step_count: 0,
    rngSeed: seed ?? String(params.general.random_seed)
  };
}

/**
 * Compute repulsion forces between cells.
 */
function computeRepulsionForces(cells: ToyCell[], params: ToyParams): Vector2[] {
  const { soft_radius, repulsion_strength } = params.general;
  const forces = cells.map(() => Vector2.zero());

  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const delta = cells[i].position.sub(cells[j].position);
      const dist = delta.mag();

      if (dist < soft_radius && dist > 0) {
        // Linear repulsion within soft radius
        const overlap = soft_radius - dist;
        const forceMag = repulsion_strength * overlap;
        const forceDir = delta.normalize();
        const force = forceDir.scale(forceMag);

        forces[i] = forces[i].add(force);
        forces[j] = forces[j].sub(force);
      }
    }
  }

  return forces;
}

/**
 * Apply boundary conditions.
 */
function applyBoundary(position: Vector2, params: ToyParams): Vector2 {
  const { boundary_type, domain_size } = params.general;
  const [width, height] = domain_size;

  if (boundary_type === 'none') {
    return position;
  }

  let x = position.x;
  let y = position.y;

  if (boundary_type === 'periodic') {
    // Wrap around
    x = ((x % width) + width) % width;
    y = ((y % height) + height) % height;
  } else if (boundary_type === 'box') {
    // Clamp to box
    x = Math.max(0, Math.min(width, x));
    y = Math.max(0, Math.min(height, y));
  }

  return new Vector2(x, y);
}

/**
 * Update cell phases and polarities.
 */
function updatePhases(cells: ToyCell[], dt: number, params: ToyParams, rng: SeededRandom): void {
  const { running_duration, tumbling_duration, tumbling_period } = params.general;

  for (const cell of cells) {
    cell.phaseTime += dt;

    if (cell.phase === 'running') {
      // Check if should transition to tumbling
      if (cell.phaseTime >= running_duration) {
        cell.phase = 'tumbling';
        cell.phaseTime = 0;
        cell.timeSinceLastTumble = 0;
        // Pick new random polarity
        const angle = rng.random(2 * Math.PI);
        cell.polarity = Vector2.fromAngle(angle);
      }
    } else {
      // Tumbling phase
      cell.timeSinceLastTumble += dt;

      // Change polarity periodically during tumbling
      if (cell.timeSinceLastTumble >= tumbling_period) {
        const angle = rng.random(2 * Math.PI);
        cell.polarity = Vector2.fromAngle(angle);
        cell.timeSinceLastTumble = 0;
      }

      // Check if should transition to running
      if (cell.phaseTime >= tumbling_duration) {
        cell.phase = 'running';
        cell.phaseTime = 0;
      }
    }
  }
}

/**
 * Perform one simulation step.
 */
export function stepToySimulation(
  state: ToySimulationState,
  params: ToyParams,
  rng: SeededRandom
): ToySimulationState {
  const { dt, mu, running_speed, tumble_speed } = params.general;
  const cells = state.cells.map((c) => ({ ...c })); // Shallow copy

  // Store previous positions
  for (const cell of cells) {
    cell.prevPosition = cell.position;
  }

  // Update phases and polarities
  updatePhases(cells, dt, params, rng);

  // Compute forces
  const repulsionForces = computeRepulsionForces(cells, params);

  // Update positions
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    // Self-propulsion force based on phase
    const speed = cell.phase === 'running' ? running_speed : tumble_speed;
    const propulsionForce = cell.polarity.scale(speed * mu);

    // Total force
    const totalForce = repulsionForces[i].add(propulsionForce);

    // Update velocity and position (overdamped: v = F / mu)
    const velocity = totalForce.scale(1 / mu);
    cell.position = cell.position.add(velocity.scale(dt));

    // Apply boundary conditions
    cell.position = applyBoundary(cell.position, params);
  }

  return {
    t: state.t + dt,
    cells,
    step_count: state.step_count + 1,
    rngSeed: state.rngSeed
  };
}

/**
 * Run simulation until end time.
 */
export function runToySimulation(
  params: ToyParams,
  onStep?: (state: ToySimulationState) => void
): ToySimulationState {
  const seed = String(params.general.random_seed);
  const rng = new SeededRandom(seed);
  let state = initializeToySimulation(params, rng, seed);

  while (state.t < params.general.t_end) {
    state = stepToySimulation(state, params, rng);
    onStep?.(state);
  }

  return state;
}
