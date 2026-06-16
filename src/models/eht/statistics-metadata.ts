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
    unit: 'legacy engine units (multiply by 5 for microns)',
    notes: [],
  },
  {
    id: 'AX',
    label: 'AX Distance',
    title: 'Apical-Nucleus Distance',
    description: 'Distance from the apical point to the nucleus.',
    formula: String.raw`AX = |A - X|`,
    unit: 'legacy engine units (multiply by 5 for microns)',
    notes: [],
  },
  {
    id: 'BX',
    label: 'BX Distance',
    title: 'Basal-Nucleus Distance',
    description: 'Distance from the basal point to the nucleus.',
    formula: String.raw`BX = |B - X|`,
    unit: 'legacy engine units (multiply by 5 for microns)',
    notes: [],
  },
  {
    id: 'ax',
    label: 'ax Distance',
    title: 'Nucleus to Apical Strip Distance',
    description: 'Distance from the nucleus to its projection onto the apical line strip. Measures how far the nucleus is from the apical surface.',
    formula: String.raw`ax = |X - a|`,
    unit: 'legacy engine units (multiply by 5 for microns)',
    notes: [],
  },
  {
    id: 'bx',
    label: 'bx Distance',
    title: 'Nucleus to Basal Curve Distance',
    description: 'Distance from the nucleus to its projection onto the basal curve. Measures how far the nucleus is from the basal membrane.',
    formula: String.raw`bx = |X - b|`,
    unit: 'legacy engine units (multiply by 5 for microns)',
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
      'This projected coordinate is reported directly; below/above fractions use curved-coordinate tissue-line tests.',
    ],
  },
  {
    id: 'below_basal',
    label: 'Below Basal',
    title: 'Fraction Below Control Basal Tissue Line',
    description: "Binary indicator for whether the cell's nucleus is below the interpolated control-cell basal tissue line at the same curved coordinate. Aggregated as a fraction over the cell group.",
    formula: String.raw`\text{below\_basal} = \begin{cases} 1 & \text{if } h_X < h_{B\_\mathrm{strip}}(s_X) \\ 0 & \text{otherwise} \end{cases}`,
    unit: 'unitless (0 or 1 per cell, aggregated as a fraction)',
    notes: ['The basal strip linearly interpolates control-cell basal-point heights in curved coordinates.'],
  },
  {
    id: 'above_apical',
    label: 'Above Apical',
    title: 'Fraction Above Control Apical Tissue Line',
    description: "Binary indicator for whether the cell's nucleus is above the interpolated control-cell apical tissue line at the same curved coordinate. Aggregated as a fraction over the cell group.",
    formula: String.raw`\text{above\_apical} = \begin{cases} 1 & \text{if } h_X > h_{A\_\mathrm{strip}}(s_X) \\ 0 & \text{otherwise} \end{cases}`,
    unit: 'unitless (0 or 1 per cell, aggregated as a fraction)',
    notes: ['The apical strip linearly interpolates control-cell apical-point heights in curved coordinates.'],
  },
  {
    id: 'below_basal_line',
    label: 'Below Basal Line',
    title: 'Fraction Below Local Basal Tangent Line',
    description: "Binary indicator for whether the cell's nucleus is below the local basal tangent line computed from neighboring basal points. Aggregated as a fraction over the cell group.",
    formula: String.raw`\text{below\_basal\_line} = \begin{cases} 1 & \text{if } (X - B_i) \cdot N_{B_i} < 0 \\ 0 & \text{otherwise} \end{cases}`,
    unit: 'unitless (0 or 1 per cell, aggregated as a fraction)',
    notes: ['The normal is oriented from the cell basal point toward its apical point.'],
  },
  {
    id: 'above_apical_line',
    label: 'Above Apical Line',
    title: 'Fraction Above Local Apical Tangent Line',
    description: "Binary indicator for whether the cell's nucleus is above the local apical tangent line computed from neighboring apical points. Aggregated as a fraction over the cell group.",
    formula: String.raw`\text{above\_apical\_line} = \begin{cases} 1 & \text{if } (X - A_i) \cdot N_{A_i} > 0 \\ 0 & \text{otherwise} \end{cases}`,
    unit: 'unitless (0 or 1 per cell, aggregated as a fraction)',
    notes: ['The normal is oriented from the cell basal point toward its apical point.'],
  },
  {
    id: 'below_control_cells',
    label: 'Below Control Cells',
    title: 'Fraction Below Control-Cell Line',
    description: 'Binary indicator for whether the cell nucleus is below the interpolated non-boundary control-cell nucleus line at the same curved coordinate. This identifies cells that have migrated below the local control cell population.',
    formula: String.raw`\text{below\_control\_cells} = \begin{cases} 1 & \text{if } h_X < h_{\mathrm{control\ strip}}(s_X) \\ 0 & \text{otherwise} \end{cases}`,
    unit: 'unitless (0 or 1 per cell, aggregated as a fraction)',
    notes: ['Boundary control cells are excluded when building the control-cell line.'],
  },
];

export function getEHTStatisticMetadata(id: string): EHTStatisticMetadata | undefined {
  return EHT_STATISTIC_METADATA.find((stat) => stat.id === id);
}
