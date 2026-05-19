/**
 * Named helper functions available in all formula evaluation scopes.
 * Registered into math.js scope so users can write e.g.
 * triangle(t, period=10, min=1, max=2).
 */

function step(t: number, t_switch: number, v_before: number, v_after: number): number {
  return t < t_switch ? v_before : v_after;
}

function ramp(t: number, t_start: number, t_end: number, v_start: number, v_end: number): number {
  if (t <= t_start) return v_start;
  if (t >= t_end) return v_end;
  return v_start + (v_end - v_start) * (t - t_start) / (t_end - t_start);
}

function triangle(t: number, period: number, v_min: number, v_max: number): number {
  if (period <= 0) return v_min;
  const phase = ((t % period) + period) % period;
  const half = period / 2;
  const normalized = phase < half ? phase / half : 2 - phase / half;
  return v_min + normalized * (v_max - v_min);
}

function pulse(t: number, t_start: number, t_end: number, v_off: number, v_on: number): number {
  return (t >= t_start && t <= t_end) ? v_on : v_off;
}

function smoothstep(t: number, t_start: number, t_end: number, v_start: number, v_end: number): number {
  if (t <= t_start) return v_start;
  if (t >= t_end) return v_end;
  const x = (t - t_start) / (t_end - t_start);
  const s = x * x * (3 - 2 * x);
  return v_start + s * (v_end - v_start);
}

export const formulaFunctions: Record<string, (...args: number[]) => number> = {
  step,
  ramp,
  triangle,
  pulse,
  smoothstep,
};
