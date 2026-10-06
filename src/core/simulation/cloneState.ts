/**
 * Deep-clone a simulation state for display/history storage.
 *
 * `structuredClone` cannot reproduce objects that carry behaviour:
 * class instances lose their prototype methods (e.g. `basalGeometry`
 * with `projectPoint`), and function-bearing literals make it throw.
 * Such properties are detached before cloning and the original
 * references are reattached afterwards, mirroring the semantics that
 * `useSimulation` historically implemented inline.
 */
export function cloneSimulationState<State>(state: State): State {
  if (typeof state !== 'object' || state === null) {
    return state;
  }

  const source = state as Record<string, unknown>;
  const preserved: Record<string, unknown> = {};

  for (const key of Object.keys(source)) {
    if (isFunctionBearing(source[key])) {
      preserved[key] = source[key];
    }
  }

  const stripped: Record<string, unknown> = { ...source };
  for (const key of Object.keys(preserved)) {
    delete stripped[key];
  }

  const cloned = structuredClone(stripped) as Record<string, unknown>;
  for (const [key, value] of Object.entries(preserved)) {
    cloned[key] = value;
  }

  return cloned as State;
}

/** Whether a value is an object exposing callable members (own or prototype). */
function isFunctionBearing(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  for (const child of Object.values(value)) {
    if (typeof child === 'function') {
      return true;
    }
  }

  const proto = Object.getPrototypeOf(value);
  if (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (typeof (value as Record<string, unknown>)[key] === 'function') {
        return true;
      }
    }
  }

  return false;
}
