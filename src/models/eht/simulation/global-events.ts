/**
 * Global event processing.
 * Evaluates global events and mutates state.params accordingly.
 */

import type { EHTSimulationState } from '../types';
import type { GlobalEvent } from '../params/types';
import { evaluateUnitAwareFormula } from '../compat/formula-units';

/**
 * Get a nested property value from an object using dot-notation path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Set a nested property value on an object using dot-notation path.
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Resolve event period to a number. Handles 'dt' as a special value.
 */
function resolveEffectivePeriod(period: number | 'dt', dt: number): number {
  return period === 'dt' ? dt : period;
}

/**
 * Check if a global event should fire at the current time.
 */
function shouldFire(
  event: GlobalEvent,
  t: number,
  dt: number,
  eventState: { last_fired: number; fire_count: number } | undefined
): boolean {
  // Outside time window
  if (t < event.start || t > event.end) return false;

  const effectivePeriod = resolveEffectivePeriod(event.period, dt);

  // One-time event (period = 0): fire only if never fired
  if (effectivePeriod === 0) {
    return !eventState || eventState.fire_count === 0;
  }

  // Periodic event: fire if enough time has elapsed since last fire
  if (!eventState) return true;
  return (t - eventState.last_fired) >= effectivePeriod - 1e-9;
}

/**
 * Process all global events, mutating state.params in place.
 */
export function processGlobalEvents(state: EHTSimulationState, dt: number): void {
  const params = state.params;
  if (!params) return;

  const constants = params.constants ?? {};

  const globalEvents = params.general.global_events;
  if (!globalEvents || globalEvents.length === 0) return;

  for (const event of globalEvents) {
    const eventState = state.global_event_states[event.id];

    if (!shouldFire(event, state.t, dt, eventState)) continue;

    // Get current value
    const oldValue = getNestedValue(params as unknown as Record<string, unknown>, event.target_parameter);

    // Evaluate formula
    const newValue = evaluateUnitAwareFormula({
      formula: event.formula,
      targetParameter: event.target_parameter,
      oldValue: oldValue as number,
      initValue: event.init_value,
      t: state.t,
      dt,
      params: { ...params, constants },
    });

    // Set new value
    setNestedValue(params as unknown as Record<string, unknown>, event.target_parameter, newValue);

    // Update tracking state
    state.global_event_states[event.id] = {
      last_fired: state.t,
      fire_count: (eventState?.fire_count ?? 0) + 1,
    };
  }
}
