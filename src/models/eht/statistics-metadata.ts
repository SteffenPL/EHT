export interface EHTStatisticMetadata {
  id: string;
  label: string;
  title: string;
  description: string;
  formula: string;
  unit: string;
  notes: string[];
}

export const EHT_STATISTIC_METADATA: EHTStatisticMetadata[] = [
  {
    id: 'ab_distance',
    label: 'AB Distance',
    title: 'Apical-Basal Distance',
    description: "The Euclidean distance between the apical and basal points. Measures the cell's vertical extent.",
    formula: String.raw`\text{ab\_distance} = |A - B|`,
    unit: 'microns',
    notes: [],
  },
  {
    id: 'AX',
    label: 'AX Distance',
    title: 'Apical-Nucleus Distance',
    description: 'Distance from the apical point to the nucleus.',
    formula: String.raw`AX = |A - X|`,
    unit: 'microns',
    notes: [],
  },
  {
    id: 'BX',
    label: 'BX Distance',
    title: 'Basal-Nucleus Distance',
    description: 'Distance from the basal point to the nucleus.',
    formula: String.raw`BX = |B - X|`,
    unit: 'microns',
    notes: [],
  },
  {
    id: 'ax',
    label: 'ax Distance',
    title: 'Nucleus to Apical Strip Distance',
    description: 'Distance from the nucleus to its projection onto the apical line strip. Measures how far the nucleus is from the apical surface.',
    formula: String.raw`ax = |X - a|`,
    unit: 'microns',
    notes: [],
  },
  {
    id: 'bx',
    label: 'bx Distance',
    title: 'Nucleus to Basal Curve Distance',
    description: 'Distance from the nucleus to its projection onto the basal curve. Measures how far the nucleus is from the basal membrane.',
    formula: String.raw`bx = |X - b|`,
    unit: 'microns',
    notes: [],
  },
  {
    id: 'x',
    label: 'x Position',
    title: 'Position on Basal-Apical Scale',
    description: 'Normalized position of the nucleus between basal and apical projections.',
    formula: String.raw`x = \frac{(X - b) \cdot (a - b)}{|a - b|^2}`,
    unit: 'unitless',
    notes: [
      '`x = 0`: nucleus at basal level',
      '`x = 1`: nucleus at apical level',
      '`x < 0`: below basal',
      '`x > 1`: above apical',
    ],
  },
  {
    id: 'below_basal',
    label: 'Below Basal',
    title: 'Fraction Below Basal Layer',
    description: "Binary indicator for whether the cell's nucleus is below the basal layer. Aggregated as a fraction over the cell group.",
    formula: String.raw`\text{below\_basal} = \begin{cases} 1 & \text{if } x < 0 \\ 0 & \text{otherwise} \end{cases}`,
    unit: 'unitless (0 or 1 per cell, aggregated as a fraction)',
    notes: [],
  },
  {
    id: 'above_apical',
    label: 'Above Apical',
    title: 'Fraction Above Apical Layer',
    description: "Binary indicator for whether the cell's nucleus is above the apical layer. Aggregated as a fraction over the cell group.",
    formula: String.raw`\text{above\_apical} = \begin{cases} 1 & \text{if } x > 1 \\ 0 & \text{otherwise} \end{cases}`,
    unit: 'unitless (0 or 1 per cell, aggregated as a fraction)',
    notes: [],
  },
  {
    id: 'below_control_cells',
    label: 'Below Control Cells',
    title: 'Fraction Below Lowest Control Cell',
    description: 'Binary indicator for whether the cell basal distance is less than the minimum basal distance among all non-boundary control cells. This identifies cells that have migrated below the control cell population.',
    formula: String.raw`\text{below\_control\_cells} = \begin{cases} 1 & \text{if } bx < \min_{c \in \text{control (non-boundary)}} bx_c \\ 0 & \text{otherwise} \end{cases}`,
    unit: 'unitless (0 or 1 per cell, aggregated as a fraction)',
    notes: ['Boundary control cells are excluded when computing the minimum control-cell `bx`.'],
  },
];

export function getEHTStatisticMetadata(id: string): EHTStatisticMetadata | undefined {
  return EHT_STATISTIC_METADATA.find((stat) => stat.id === id);
}
