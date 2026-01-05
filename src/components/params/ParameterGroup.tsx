/**
 * A group of related parameters (accordion item).
 */
import { AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { ParameterInput } from './ParameterInput';

export interface ParameterGroupProps {
  title: string;
  groupKey: string;
  params: object;
  basePath: string;
  onChange: (path: string, value: unknown) => void;
  disabled?: boolean;
}

/** Labels for common parameter keys */
const PARAM_LABELS: Record<string, string> = {
  // General
  N_init: 'Initial cells',
  N_emt: 'EMT cells',
  w_init: 'Initial width',
  h_init: 'Initial height',
  w_screen: 'Screen width',
  h_screen: 'Screen height',
  curvature: 'Curvature',
  t_end: 'End time (h)',
  dt: 'Time step',
  random_seed: 'Random seed',

  // Cell properties
  R_hard: 'Hard radius',
  R_soft: 'Soft radius',
  repulsion_stiffness: 'Repulsion stiffness',
  apical_junction_init: 'Apical junction init',
  apical_junction_max: 'Apical junction max',
  basal_max_dist: 'Basal max distance',
  straightness: 'Straightness',
  inm_stiffness: 'INM stiffness',
  dt_INM: 'INM time scale',

  // Cell type
  color: 'Color',
  division_time_range: 'Division time range',
  k_A: 'Apical spring',
  k_B: 'Basal spring',
  k_AA: 'Apical-apical spring',
  k_S: 'Straightness spring',
  has_inm: 'Has INM',
  running_speed: 'Running speed',
  emt_time_A: 'EMT time (apical)',
  emt_time_B: 'EMT time (basal)',
  emt_time_S: 'EMT time (straight)',
  emt_time_P: 'EMT time (polarity)',
};

function getLabel(key: string): string {
  return PARAM_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** Filter out nested objects and Range types for flat display */
function isSimpleValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return true;
  }
  // RGB color object
  if (typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
    return true;
  }
  // Range object - display as two fields
  if (typeof value === 'object' && 'min' in value && 'max' in value) {
    return false; // Handle separately
  }
  return false;
}

function isRange(value: unknown): value is { min: number; max: number } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'min' in value &&
    'max' in value
  );
}

export function ParameterGroup({
  title,
  groupKey,
  params,
  basePath,
  onChange,
  disabled,
}: ParameterGroupProps) {
  const entries = Object.entries(params);

  return (
    <AccordionItem value={groupKey}>
      <AccordionTrigger className="text-sm">{title}</AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-3 py-2">
          {entries.map(([key, value]) => {
            const path = basePath ? `${basePath}.${key}` : key;

            if (isSimpleValue(value)) {
              return (
                <ParameterInput
                  key={path}
                  label={getLabel(key)}
                  path={path}
                  value={value}
                  onChange={onChange}
                  disabled={disabled}
                />
              );
            }

            if (isRange(value)) {
              return (
                <div key={path} className="grid gap-2">
                  <span className="text-sm font-medium">{getLabel(key)}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <ParameterInput
                      label="Min"
                      path={`${path}.min`}
                      value={value.min}
                      onChange={onChange}
                      disabled={disabled}
                    />
                    <ParameterInput
                      label="Max"
                      path={`${path}.max`}
                      value={value.max}
                      onChange={onChange}
                      disabled={disabled}
                    />
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
