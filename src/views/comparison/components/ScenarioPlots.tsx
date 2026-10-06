/**
 * Comparative statistics time-series plots for the comparison view.
 * One LinePlot per tracked statistic, with one line per scenario.
 */
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { LinePlot, type LinePlotDatum } from '@/components/plots/LinePlot';
import type { ComparisonScenario } from '../scenarios';

export interface ScenarioPlotsProps {
  scenarios: ComparisonScenario[];
  /** Per-frame statistics per scenario id (array index = frame index). */
  stats: Record<string, Array<Record<string, number>>>;
  /** Number of frames available (stats arrays are sliced to this length). */
  visibleFrames: number;
  /** Timestep [hours], used to convert frame indices to times. */
  dt: number;
}

/** Statistics tracked in the comparison plots (EHT group means, engine units). */
const PLOTTED_STATS: { key: string; label: string; unit: string }[] = [
  { key: 'ab_distance_control', label: 'Apical-basal distance (control)', unit: 'engine units (5 µm each)' },
  { key: 'bx_control', label: 'Nucleus-basal distance (control)', unit: 'engine units (5 µm each)' },
  { key: 'x_control', label: 'Nucleus position on basal-apical scale (control)', unit: '0 = basal, 1 = apical' },
];

/**
 * Plot re-draw stride in frames: recomputing plot data (and re-creating the
 * Observable Plot DOM) on every frame would dominate the frame budget during
 * playback and fast catch-up, so plots refresh every N frames instead.
 */
const PLOT_STRIDE = 20;

export function ScenarioPlots({ scenarios, stats, visibleFrames, dt }: ScenarioPlotsProps) {
  const seriesColors = useMemo(
    () => Object.fromEntries(scenarios.map((s) => [s.id, s.color])),
    [scenarios]
  );
  const seriesLabels = useMemo(
    () => Object.fromEntries(scenarios.map((s) => [s.id, s.label])),
    [scenarios]
  );

  const sampledVisibleFrames = Math.max(1, Math.floor(visibleFrames / PLOT_STRIDE) * PLOT_STRIDE);

  const plotData = useMemo(() => {
    const byStat = new Map<string, LinePlotDatum[]>();

    for (const stat of PLOTTED_STATS) {
      const rows: LinePlotDatum[] = [];

      for (const scenario of scenarios) {
        const series = stats[scenario.id];
        if (!series) continue;

        const frames = Math.min(sampledVisibleFrames, series.length);
        for (let i = 0; i < frames; i++) {
          const value = series[i]?.[stat.key];
          if (typeof value === 'number' && Number.isFinite(value)) {
            rows.push({ time: i * dt, value, series: scenario.id });
          }
        }
      }

      byStat.set(stat.key, rows);
    }

    return byStat;
    // visibleFrames drives sampledVisibleFrames via the stride above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios, stats, sampledVisibleFrames, visibleFrames, dt]);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      {PLOTTED_STATS.map((stat) => {
        const data = plotData.get(stat.key) ?? [];
        return (
          <Card key={stat.key} className="p-3">
            <div className="mb-1 flex items-baseline justify-between gap-2 px-2">
              <h3 className="text-sm font-medium">{stat.label}</h3>
              <span className="text-xs text-muted-foreground">{stat.unit}</span>
            </div>
            {data.length > 0 ? (
              <LinePlot
                data={data}
                seriesLabels={seriesLabels}
                seriesColors={seriesColors}
                seriesLegendLabel="Scenario"
                yAxisLabel={stat.label}
                height={240}
              />
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                Run the simulation to collect statistics.
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
