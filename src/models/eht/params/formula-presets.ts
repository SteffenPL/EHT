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
  description: string;
  params: FormulaPresetParam[];
  generate: (values: number[]) => string;
}

export const FORMULA_PRESETS: FormulaPreset[] = [
  {
    name: 'Step',
    description: 'Jump from one value to another at a specific time',
    params: [
      { label: 'Switch time', defaultValue: 5 },
      { label: 'Value before', defaultValue: 0 },
      { label: 'Value after', defaultValue: 1 },
    ],
    generate: (v) => `step(t, ${v[0]}, ${v[1]}, ${v[2]})`,
  },
  {
    name: 'Ramp',
    description: 'Linear transition between two values over a time range',
    params: [
      { label: 'Start time', defaultValue: 0 },
      { label: 'End time', defaultValue: 10 },
      { label: 'Start value', defaultValue: 0 },
      { label: 'End value', defaultValue: 1 },
    ],
    generate: (v) => `ramp(t, ${v[0]}, ${v[1]}, ${v[2]}, ${v[3]})`,
  },
  {
    name: 'Triangle Wave',
    description: 'Periodic triangle wave oscillating between min and max',
    params: [
      { label: 'Period', defaultValue: 1 },
      { label: 'Min value', defaultValue: 0 },
      { label: 'Max value', defaultValue: 1 },
    ],
    generate: (v) => `triangle(t, ${v[0]}, ${v[1]}, ${v[2]})`,
  },
  {
    name: 'Pulse',
    description: 'Value is "on" between start and end time, "off" otherwise',
    params: [
      { label: 'Start time', defaultValue: 2 },
      { label: 'End time', defaultValue: 5 },
      { label: 'Off value', defaultValue: 0 },
      { label: 'On value', defaultValue: 1 },
    ],
    generate: (v) => `pulse(t, ${v[0]}, ${v[1]}, ${v[2]}, ${v[3]})`,
  },
  {
    name: 'Smooth Step',
    description: 'Smooth (Hermite) transition between two values over a time range',
    params: [
      { label: 'Start time', defaultValue: 0 },
      { label: 'End time', defaultValue: 10 },
      { label: 'Start value', defaultValue: 0 },
      { label: 'End value', defaultValue: 1 },
    ],
    generate: (v) => `smoothstep(t, ${v[0]}, ${v[1]}, ${v[2]}, ${v[3]})`,
  },
];
