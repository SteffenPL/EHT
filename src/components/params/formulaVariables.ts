import type { FormulaContext } from './FormulaEditorDialog';

export interface FormulaVariableInfo {
  name: string;
  label?: string;
  kind: 'number' | 'vector' | 'function' | 'constant';
  contexts: FormulaContext[];
  description: string;
  definition?: string;
  example?: string;
  insertText?: string;
}

export const FORMULA_VARIABLES: FormulaVariableInfo[] = [
  {
    name: 't',
    kind: 'number',
    contexts: ['general', 'cell_type', 'external_force'],
    description: 'Current simulation time in hours.',
    definition: 'Updated every simulation step.',
    example: 'sin(t)',
  },
  {
    name: 'dt',
    kind: 'number',
    contexts: ['general', 'cell_type'],
    description: 'Current timestep size.',
    definition: 'Useful for gradual per-step updates.',
    example: 'old_value + 0.01 * dt',
  },
  {
    name: 'old_value',
    kind: 'number',
    contexts: ['general', 'cell_type'],
    description: 'Current value of the parameter before the formula is applied.',
    definition: 'For previews, this is the field value from the parameter panel.',
    example: 'old_value * 0.5',
  },
  {
    name: 'init_value',
    kind: 'number',
    contexts: ['general', 'cell_type'],
    description: 'Initial value captured when the formula event is created.',
    definition: 'Good for reversible oscillations around the original value.',
    example: 'init_value + 0.2 * sin(t)',
  },
  {
    name: 'age',
    kind: 'number',
    contexts: ['cell_type', 'external_force'],
    description: 'Age of the current cell in hours.',
    definition: 'Computed as simulation time minus cell birth time.',
    example: 'age > 4 ? 5 * N : 0',
  },
  {
    name: 'alpha',
    kind: 'number',
    contexts: ['cell_type', 'external_force'],
    description: 'Polar angle of the cell nucleus around the geometry center.',
    definition: 'alpha = atan2(x, -y). Bottom is 0, right is +pi/2, left is -pi/2.',
    example: '10 * sin(alpha)',
  },
  {
    name: 'r',
    kind: 'number',
    contexts: ['cell_type', 'external_force'],
    description: 'Distance from the geometry center to the cell nucleus.',
    definition: 'r = sqrt(x^2 + y^2).',
    example: 'r < 30 ? 1 : 0',
  },
  {
    name: 'delta',
    kind: 'number',
    contexts: ['cell_type', 'external_force'],
    description: 'Signed distance from the basal curve along the basal normal.',
    definition: 'delta = dot(N, X - a), where a is the projected basal point.',
    example: 'delta * N',
  },
  {
    name: 'x',
    kind: 'number',
    contexts: ['external_force'],
    description: 'Horizontal position of the cell nucleus relative to the geometry center.',
    definition: 'x = X.x - C.x.',
    example: 'abs(x) < 20',
  },
  {
    name: 'y',
    kind: 'number',
    contexts: ['external_force'],
    description: 'Vertical position of the cell nucleus relative to the geometry center.',
    definition: 'y = X.y - C.y.',
    example: 'y < 0 ? 5 : 0',
  },
  {
    name: 'N',
    kind: 'vector',
    contexts: ['external_force'],
    description: 'Unit basal normal into the tissue at the nearest basal point.',
    definition: 'N = basalGeometry.getNormal(a), where a = projectPoint(X).',
    example: '3 * N',
  },
  {
    name: 'T',
    kind: 'vector',
    contexts: ['external_force'],
    description: 'Unit tangent perpendicular to the basal normal.',
    definition: 'T = (-N_y, N_x).',
    example: '5 * T + 2 * N',
  },
  {
    name: 'R_soft',
    kind: 'number',
    contexts: ['external_force'],
    description: 'Current cell soft radius.',
    definition: 'Uses the cell runtime value, so formulas follow changes during simulation.',
    example: 'max(0, R_soft - delta) * N',
  },
  {
    name: 'R_hard',
    kind: 'number',
    contexts: ['external_force'],
    description: 'Current cell hard radius.',
    definition: 'Uses the cell runtime value.',
    example: 'max(0, R_hard - delta) * N',
  },
  {
    name: 'G2',
    kind: 'number',
    contexts: ['external_force'],
    description: 'Phase flag: 1 when the cell is in G2, otherwise 0.',
    example: 'G2 * 5 * N',
  },
  {
    name: 'Mitosis',
    kind: 'number',
    contexts: ['external_force'],
    description: 'Phase flag: 1 when the cell is in Mitosis, otherwise 0.',
    example: 'Mitosis * 5 * N',
  },
  {
    name: 'p_div_out',
    kind: 'number',
    contexts: ['cell_type'],
    description: 'Out-of-plane division probability from general parameters.',
    example: 'p_div_out',
  },
  {
    name: 'INM',
    kind: 'number',
    contexts: ['cell_type'],
    description: 'Interkinetic nuclear migration probability for the cell type.',
    example: 'INM',
  },
];

export function variablesForContext(context: FormulaContext): FormulaVariableInfo[] {
  return FORMULA_VARIABLES.filter(variable => variable.contexts.includes(context));
}
