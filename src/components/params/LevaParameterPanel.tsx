/**
 * Model-aware parameter panel using Leva.
 * Dynamically generates controls based on the current model's parameterGroups.
 */
import { useEffect, useRef, useMemo } from 'react';
import { useControls, folder, LevaPanel, useCreateStore } from 'leva';
import { cloneDeep, isEqual, get, set } from 'lodash-es';
import { useTheme, useModel } from '@/contexts';
import type { BaseSimulationParams, ParameterGroupDefinition } from '@/core/registry';

export interface LevaParameterPanelProps {
  params: BaseSimulationParams;
  onChange: (params: BaseSimulationParams) => void;
}

/**
 * Get a value from a nested object using a dot-notation path.
 */
function getPath(obj: unknown, path: string): unknown {
  return get(obj, path);
}

/**
 * Set a value in a nested object using a dot-notation path.
 */
function setPath(obj: unknown, path: string, value: unknown): void {
  set(obj as object, path, value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LevaSchema = any;

/**
 * Build Leva schema from parameter groups.
 */
function buildLevaSchema(
  groups: ParameterGroupDefinition[],
  params: BaseSimulationParams
): LevaSchema {
  const schema: LevaSchema = {};

  for (const group of groups) {
    const groupSchema: LevaSchema = {};

    for (const field of group.fields) {
      const value = getPath(params, field.path);

      if (field.type === 'range') {
        // Flatten range into min/max fields
        const rangeValue = value as { min: number; max: number } | undefined;
        if (rangeValue) {
          groupSchema[`${field.path.replace(/\./g, '_')}_min`] = {
            value: rangeValue.min,
            step: field.step ?? 0.1,
            label: `${field.label} Min`,
          };
          groupSchema[`${field.path.replace(/\./g, '_')}_max`] = {
            value: rangeValue.max,
            step: field.step ?? 0.1,
            label: `${field.label} Max`,
          };
        }
      } else {
        const spec: LevaSchema = {
          value,
          label: field.label,
        };

        if (field.type === 'number') {
          if (field.step !== undefined) spec.step = field.step;
          if (field.min !== undefined) spec.min = field.min;
          if (field.max !== undefined) spec.max = field.max;
        }

        groupSchema[field.path.replace(/\./g, '_')] = spec;
      }
    }

    schema[group.label] = folder(groupSchema, { collapsed: group.collapsed ?? false });
  }

  return schema;
}

/**
 * Extract values from Leva controls back to params structure.
 */
function levaValuesToParams(
  levaValues: Record<string, unknown>,
  groups: ParameterGroupDefinition[],
  baseParams: BaseSimulationParams
): BaseSimulationParams {
  const newParams = cloneDeep(baseParams);

  for (const group of groups) {
    for (const field of group.fields) {
      const levaKey = field.path.replace(/\./g, '_');

      if (field.type === 'range') {
        // Reconstruct range from min/max
        const minKey = `${levaKey}_min`;
        const maxKey = `${levaKey}_max`;
        if (minKey in levaValues && maxKey in levaValues) {
          setPath(newParams, field.path, {
            min: levaValues[minKey],
            max: levaValues[maxKey],
          });
        }
      } else if (levaKey in levaValues) {
        setPath(newParams, field.path, levaValues[levaKey]);
      }
    }
  }

  return newParams;
}

/**
 * Extract initial values from params for Leva.
 */
function paramsToLevaValues(
  groups: ParameterGroupDefinition[],
  params: BaseSimulationParams
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const group of groups) {
    for (const field of group.fields) {
      const value = getPath(params, field.path);
      const levaKey = field.path.replace(/\./g, '_');

      if (field.type === 'range') {
        const rangeValue = value as { min: number; max: number } | undefined;
        if (rangeValue) {
          values[`${levaKey}_min`] = rangeValue.min;
          values[`${levaKey}_max`] = rangeValue.max;
        }
      } else {
        values[levaKey] = value;
      }
    }
  }

  return values;
}

export function LevaParameterPanel({ params, onChange }: LevaParameterPanelProps) {
  const store = useCreateStore();
  const { isDark } = useTheme();
  const { currentModel } = useModel();

  // Get parameter groups from the current model
  const parameterGroups = currentModel.parameterGroups || [];

  // Build schema once when model changes
  const schema = useMemo(
    () => buildLevaSchema(parameterGroups, params),
    // Only rebuild when model changes, not when params change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentModel.name]
  );

  // Track external vs internal updates
  const externalParamsRef = useRef(params);
  const isInternalUpdate = useRef(false);

  // Use controls with the dynamic schema
  const [values, setValues] = useControls(() => schema, { store }, [currentModel.name]);

  // Sync: Params -> Leva (External Input)
  useEffect(() => {
    if (!isEqual(params, externalParamsRef.current)) {
      isInternalUpdate.current = false;

      const newLevaValues = paramsToLevaValues(parameterGroups, params);
      setValues(newLevaValues);

      externalParamsRef.current = params;
      setTimeout(() => {
        isInternalUpdate.current = true;
      }, 0);
    }
  }, [params, parameterGroups, setValues]);

  // Sync: Leva -> Params (Internal Output)
  useEffect(() => {
    const newParams = levaValuesToParams(values, parameterGroups, params);

    if (!isEqual(newParams, externalParamsRef.current)) {
      externalParamsRef.current = newParams;
      onChange(newParams);
    }
  }, [values, parameterGroups, params, onChange]);

  // Theme configuration
  const themeParams = isDark
    ? {
      colors: {
        elevation1: '#1a1a2e',
        elevation2: '#16213e',
        elevation3: '#0f3460',
        accent1: '#e94560',
        accent2: '#e94560',
        accent3: '#e94560',
        highlight1: '#2a2a4a',
        highlight2: '#8892b0',
        highlight3: '#ccd6f6',
        vivid1: '#e94560',
        folderWidgetColor: '#8892b0',
        folderTextColor: '#ccd6f6',
        toolTipBackground: '#1a1a2e',
        toolTipText: '#ccd6f6',
      },
      fontSizes: {
        root: '11px',
      },
    }
    : {
      colors: {
        elevation1: '#fafbfc',
        elevation2: '#f0f2f5',
        elevation3: '#e4e8ed',
        accent1: '#0066cc',
        accent2: '#0066cc',
        accent3: '#0066cc',
        highlight1: '#e4e8ed',
        highlight2: '#6b7280',
        highlight3: '#1f2937',
        vivid1: '#0066cc',
        folderWidgetColor: '#6b7280',
        folderTextColor: '#1f2937',
        toolTipBackground: '#1f2937',
        toolTipText: '#f9fafb',
      },
      fontSizes: {
        root: '11px',
      },
    };

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-y-auto custom-scrollbar" style={{ zIndex: 0 }}>
      <LevaPanel fill flat store={store} titleBar={false} theme={themeParams} />
    </div>
  );
}
