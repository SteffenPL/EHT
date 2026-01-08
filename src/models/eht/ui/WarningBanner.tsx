/**
 * EHT Warning Banner - Shows parameter validation warnings above the tabs.
 */
import { useMemo } from 'react';
import type { ModelWarningProps } from '@/core/registry';
import type { EHTParams } from '../params/types';

export function EHTWarningBanner({ params }: ModelWarningProps<EHTParams>) {
  const g = params.general;
  const cp = params.cell_prop;

  // Check perimeter constraint for full circle mode
  const perimeterWarning = useMemo(() => {
    if (g.perimeter > 0 && g.full_circle) {
      const maxCoverage = g.N_init * cp.max_basal_junction_dist;
      if (maxCoverage <= g.perimeter) {
        return `Perimeter constraint violated: N_init (${g.N_init}) × max_basal_junction_dist (${cp.max_basal_junction_dist.toFixed(1)}) = ${maxCoverage.toFixed(1)} ≤ perimeter (${g.perimeter.toFixed(1)}). Cells may not cover the membrane.`;
      }
    }
    return null;
  }, [g.N_init, g.perimeter, g.full_circle, cp.max_basal_junction_dist]);

  if (!perimeterWarning) {
    return null;
  }

  return (
    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-xs text-yellow-600 dark:text-yellow-400">
      {perimeterWarning}
    </div>
  );
}
