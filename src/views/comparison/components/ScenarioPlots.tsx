/**
 * Comparative statistics time-series plots for the comparison view.
 * One LinePlot per tracked statistic, with one line per scenario.
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LinePlot, type LinePlotDatum } from '@/components/plots/LinePlot';
import { MAX_COMPARISON_FRAMES, type ComparisonScenario } from '../scenarios';

export interface ScenarioPlotsProps {
  scenarios: ComparisonScenario[];
  /** Per-step statistics per scenario id. */
  stats: Record<string, Array<Record<string, number>>>;
  /** Actual per-step times for each scenario [hours]. */
  scenarioTimes: Record<string, number[]>;
  /** Current shared playback time [hours]. */
  currentTime: number;
  /** Shared end time [hours]. */
  tEnd: number;
  /** Averaged model timestep; also the moving-average window and sample interval. */
  averagedDt: number;
}

/** Statistics tracked in the comparison plots (EHT group means, engine units). */
const PLOTTED_STATS: { key: string; label: string; unit: string }[] = [
  { key: 'ab_distance_control', label: 'Apical-basal distance (control)', unit: 'engine units (5 µm each)' },
  { key: 'bx_control', label: 'Nucleus-basal distance (control)', unit: 'engine units (5 µm each)' },
  { key: 'x_control', label: 'Nucleus position on basal-apical scale (control)', unit: '0 = basal, 1 = apical' },
];

/** Refresh plot DOM periodically while retaining every sample in each redraw. */
const PLOT_REFRESH_INTERVAL_H = 0.01;

function movingAverageSeries(
  values: Array<Record<string, number>>,
  times: number[],
  key: string,
  interval: number,
  currentTime: number
): LinePlotDatum[] {
  const rows: LinePlotDatum[] = [];
  const outputCount = Math.floor(currentTime / interval + 1e-9) + 1;
  const outputStride = Math.max(1, Math.ceil(outputCount / MAX_COMPARISON_FRAMES));
  let left = 0;
  let right = 0;
  let sum = 0;
  let count = 0;

  let sampleIndex = 0;
  while (sampleIndex < outputCount) {
    const sampleTime = sampleIndex * interval;
    while (right < times.length && times[right] <= sampleTime + 1e-9) {
      const value = values[right]?.[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        sum += value;
        count++;
      }
      right++;
    }

    const windowStart = sampleTime - interval;
    while (left < right && times[left] < windowStart - 1e-9) {
      const value = values[left]?.[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        sum -= value;
        count--;
      }
      left++;
    }

    if (count > 0) {
      rows.push({ time: sampleTime, value: sum / count, series: 'time-averaged-oscillating' });
    }

    if (sampleIndex === outputCount - 1) break;
    sampleIndex = Math.min(sampleIndex + outputStride, outputCount - 1);
  }

  return rows;
}

export function ScenarioPlots({ scenarios, stats, scenarioTimes, currentTime, tEnd, averagedDt }: ScenarioPlotsProps) {
  const [showTimeAveraged, setShowTimeAveraged] = useState(true);
  const plotTime = currentTime >= tEnd - 1e-9
    ? currentTime
    : Math.floor((currentTime + 1e-10) / PLOT_REFRESH_INTERVAL_H) * PLOT_REFRESH_INTERVAL_H;
  const seriesColors = useMemo(
    () => ({
      ...Object.fromEntries(scenarios.map((s) => [s.id, s.color])),
      ...(showTimeAveraged ? { 'time-averaged-oscillating': '#7c3aed' } : {}),
    }),
    [scenarios, showTimeAveraged]
  );
  const seriesLabels = useMemo(
    () => ({
      ...Object.fromEntries(scenarios.map((s) => [s.id, s.label])),
      ...(showTimeAveraged ? { 'time-averaged-oscillating': 'Oscillating (moving average)' } : {}),
    }),
    [scenarios, showTimeAveraged]
  );

  const plotData = useMemo(() => {
    const byStat = new Map<string, LinePlotDatum[]>();

    for (const stat of PLOTTED_STATS) {
      const rows: LinePlotDatum[] = [];

      for (const scenario of scenarios) {
        const series = stats[scenario.id];
        const times = scenarioTimes[scenario.id];
        if (!series || !times) continue;

        const frames = Math.min(series.length, times.length);
        for (let i = 0; i < frames; i++) {
          if (times[i] > plotTime + 1e-9) break;
          const value = series[i]?.[stat.key];
          if (typeof value === 'number' && Number.isFinite(value)) {
            rows.push({ time: times[i], value, series: scenario.id });
          }
        }
      }

      if (showTimeAveraged) {
        const oscillatingStats = stats.oscillating;
        const oscillatingTimes = scenarioTimes.oscillating;
        if (oscillatingStats && oscillatingTimes && averagedDt > 0) {
          rows.push(...movingAverageSeries(
            oscillatingStats,
            oscillatingTimes,
            stat.key,
            averagedDt,
            plotTime
          ));
        }
      }

      byStat.set(stat.key, rows);
    }

    return byStat;
  }, [scenarios, stats, scenarioTimes, plotTime, averagedDt, showTimeAveraged]);
  const yMaxByStat = useMemo(() => {
    const limits: Record<string, number> = {};
    for (const [key, data] of plotData) {
      const maximum = data.reduce((maxValue, datum) => Math.max(maxValue, datum.value), 0);
      limits[key] = maximum > 0 ? maximum * 1.05 : 1;
    }
    return limits;
  }, [plotData]);

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={showTimeAveraged} onCheckedChange={(checked) => setShowTimeAveraged(checked === true)} />
        Oscillating trajectory moving average (window = averaged dt)
      </label>
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
                  yMin={0}
                  yMax={yMaxByStat[stat.key]}
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
    </div>
  );
}
