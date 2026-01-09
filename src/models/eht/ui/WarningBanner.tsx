/**
 * EHT Warning Banner - Shows parameter validation warnings above the tabs.
 */
import { useMemo } from 'react';
import type { ModelWarningProps } from '@/core/registry';
import type { EHTParams } from '../params/types';

export function EHTWarningBanner({ params }: ModelWarningProps<EHTParams>) {
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
        return `Perimeter constraint violated: total cells (${totalNInit}) × avg max_basal_junction_dist (${avgMaxBasalJunctionDist.toFixed(1)}) = ${maxCoverage.toFixed(1)} ≤ perimeter (${g.perimeter.toFixed(1)}). Cells may not cover the membrane.`;
      }
    }
    return null;
  }, [totalNInit, g.perimeter, g.full_circle, avgMaxBasalJunctionDist]);

  if (!perimeterWarning) {
    return null;
  }

  return (
    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-xs text-yellow-600 dark:text-yellow-400">
      {perimeterWarning}
    </div>
  );
}

