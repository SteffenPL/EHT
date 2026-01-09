/**
 * EHT Warning Banner - Shows parameter validation warnings above the tabs.
 */
import { useMemo, useCallback } from 'react';
import { cloneDeep } from 'lodash-es';
import type { ModelWarningProps } from '@/core/registry';
import type { EHTParams } from '../params/types';
import { Button } from '@/components/ui/button';

export function EHTWarningBanner({ params, onChange, disabled }: ModelWarningProps<EHTParams>) {
  const g = params.general;

  // Compute total N_init and weighted average max_basal_junction_dist from all cell types
  const { totalNInit, avgMaxBasalJunctionDist } = useMemo(() => {
    const cellTypes = Object.values(params.cell_types);
    const total = cellTypes.reduce((sum, ct) => sum + ct.N_init, 0);
    // Weighted average by N_init, or simple average if all N_init are 0
    const weightedSum = cellTypes.reduce((sum, ct) => sum + ct.N_init * ct.max_basal_junction_dist, 0);
    const avgDist = total > 0
      ? weightedSum / total
      : (cellTypes.length > 0 ? cellTypes.reduce((sum, ct) => sum + ct.max_basal_junction_dist, 0) / cellTypes.length : 4);
    return { totalNInit: total, avgMaxBasalJunctionDist: avgDist };
  }, [params.cell_types]);

  // Check perimeter constraint for full circle mode
  const perimeterWarning = useMemo(() => {
    if (g.perimeter > 0 && g.full_circle) {
      const maxCoverage = totalNInit * avgMaxBasalJunctionDist;
      if (maxCoverage <= g.perimeter) {
        return {
          message: `Perimeter constraint violated: total cells (${totalNInit}) × avg max_basal_junction_dist (${avgMaxBasalJunctionDist.toFixed(1)}) = ${maxCoverage.toFixed(1)} ≤ perimeter (${g.perimeter.toFixed(1)}). Cells may not cover the membrane.`,
          maxCoverage,
        };
      }
    }
    return null;
  }, [totalNInit, g.perimeter, g.full_circle, avgMaxBasalJunctionDist]);

  // Fix function: scale all max_basal_junction_dist to satisfy constraint with 5 unit margin
  const handleFix = useCallback(() => {
    if (!onChange || !perimeterWarning) return;

    const targetCoverage = g.perimeter + 5; // Add 5 unit margin
    const currentCoverage = perimeterWarning.maxCoverage;
    if (currentCoverage <= 0) return;

    const scaleFactor = targetCoverage / currentCoverage;

    const newParams = cloneDeep(params);
    for (const key of Object.keys(newParams.cell_types)) {
      newParams.cell_types[key].max_basal_junction_dist *= scaleFactor;
    }
    onChange(newParams);
  }, [onChange, perimeterWarning, params, g.perimeter]);

  if (!perimeterWarning) {
    return null;
  }

  return (
    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-3">
      <span className="flex-1">{perimeterWarning.message}</span>
      {onChange && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleFix}
          disabled={disabled}
          className="shrink-0 text-xs h-6 px-2"
        >
          Fix
        </Button>
      )}
    </div>
  );
}
