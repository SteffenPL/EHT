/**
 * Preset definitions for the formula editor popup.
 * Each preset describes a helper function with labeled parameters and default values.
 */

export interface FormulaPresetParam {
  label: string;
  defaultValue: number;
}

export interface FormulaPreset {
  name: string;
  signature: string;
  description: string;
  params: FormulaPresetParam[];
  generate: (values: number[]) => string;
}

export interface FormulaQuickPreset {
  key: string;
  name: string;
  context: 'time' | 'external_force';
  description: string;
  generate: (options?: { softRadius?: number }) => string;
}

export const FORMULA_PRESETS: FormulaPreset[] = [
  {
    name: 'Step',
    signature: 'step(t, switch=5, before=0, after=1)',
    description: 'Jump from one value to another at a specific time',
    params: [
      { label: 'Switch time', defaultValue: 5 },
      { label: 'Value before', defaultValue: 0 },
      { label: 'Value after', defaultValue: 1 },
    ],
    generate: (v) => `step(t, switch=${v[0]}, before=${v[1]}, after=${v[2]})`,
  },
  {
    name: 'Ramp',
    signature: 'ramp(t, start=0, stop=10, from=0, to=1)',
    description: 'Linear transition between two values over a time range',
    params: [
      { label: 'Start time', defaultValue: 0 },
      { label: 'End time', defaultValue: 10 },
      { label: 'Start value', defaultValue: 0 },
      { label: 'End value', defaultValue: 1 },
    ],
    generate: (v) => `ramp(t, start=${v[0]}, stop=${v[1]}, from=${v[2]}, to=${v[3]})`,
  },
  {
    name: 'Triangle Wave',
    signature: 'triangle(t, period=10, min=1, max=2)',
    description: 'Periodic triangle wave oscillating between min and max',
    params: [
      { label: 'Period', defaultValue: 10 },
      { label: 'Min value', defaultValue: 1 },
      { label: 'Max value', defaultValue: 2 },
    ],
    generate: (v) => `triangle(t, period=${v[0]}, min=${v[1]}, max=${v[2]})`,
  },
  {
    name: 'Sine Wave',
    signature: 'sinwave(t, period=10, from=1, to=2)',
    description: 'Periodic sine wave oscillating smoothly between from and to',
    params: [
      { label: 'Period', defaultValue: 10 },
      { label: 'Min value', defaultValue: 1 },
      { label: 'Max value', defaultValue: 2 },
    ],
    generate: (v) => `sinwave(t, period=${v[0]}, from=${v[1]}, to=${v[2]})`,
  },
  {
    name: 'Pulse',
    signature: 'pulse(t, start=2, stop=5, off=0, on=1)',
    description: 'Value is "on" between start and end time, "off" otherwise',
    params: [
      { label: 'Start time', defaultValue: 2 },
      { label: 'End time', defaultValue: 5 },
      { label: 'Off value', defaultValue: 0 },
      { label: 'On value', defaultValue: 1 },
    ],
    generate: (v) => `pulse(t, start=${v[0]}, stop=${v[1]}, off=${v[2]}, on=${v[3]})`,
  },
  {
    name: 'Smooth Step',
    signature: 'smoothstep(t, start=0, stop=10, from=0, to=1)',
    description: 'Smooth (Hermite) transition between two values over a time range',
    params: [
      { label: 'Start time', defaultValue: 0 },
      { label: 'End time', defaultValue: 10 },
      { label: 'Start value', defaultValue: 0 },
      { label: 'End value', defaultValue: 1 },
    ],
    generate: (v) => `smoothstep(t, start=${v[0]}, stop=${v[1]}, from=${v[2]}, to=${v[3]})`,
  },
];

export const FORMULA_QUICK_PRESETS: FormulaQuickPreset[] = [
  {
    key: 'heartbeat_10_percent',
    name: '10% heartbeat',
    context: 'time',
    description: 'Oscillate from init_value to init_value * 1.1 using the heartbeat constant as the period',
    generate: () => 'sinwave(t, period=heartbeat, from=init_value, to=init_value * 1.1)',
  },
  {
    key: 'towards_center',
    name: 'Towards center',
    context: 'external_force',
    description: 'Constant-magnitude radial force toward the geometry center',
    generate: () => '-1 * matrix([x, y]) / max(r, 1e-9)',
  },
  {
    key: 'basal_repulsion',
    name: 'Basal repulsion',
    context: 'external_force',
    description: 'Radius-aware inward basal-boundary repulsion using this cell type R_soft',
    generate: ({ softRadius } = {}) => `max(0, ${softRadius ?? 1} - delta) * N`,
  },
  {
    key: 'fluid_pressure',
    name: 'Fluid pressure',
    context: 'external_force',
    description: 'Pressure force active after the nucleus center is more than 2 * R_soft inside the tissue',
    generate: ({ softRadius } = {}) => `max(0, delta - ${2 * (softRadius ?? 1)}) * N`,
  },
];
