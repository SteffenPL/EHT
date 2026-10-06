/**
 * Generic multi-series time-series line plot (Observable Plot).
 *
 * Extracted from BatchPlot's line mode so non-batch views (e.g. the
 * comparison view) can plot time series without batch-specific props.
 */
import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

export interface LinePlotDatum {
  time: number;
  value: number;
  /** Series id; rows without a series render as a single line. */
  series?: string;
}

export interface LinePlotProps {
  data: LinePlotDatum[];
  /** Display labels per series id. */
  seriesLabels?: Record<string, string>;
  /** CSS colors per series id (defines legend order and palette). */
  seriesColors?: Record<string, string>;
  /** Legend caption for the series dimension. */
  seriesLegendLabel?: string;
  xAxisLabel?: string;
  yAxisLabel: string;
  width?: number;
  height?: number;
  yMin?: number;
  yMax?: number;
  /** Draw a dot at every datum (useful for sparsely sampled data). */
  showDots?: boolean;
}

export function LinePlot({
  data,
  seriesLabels,
  seriesColors,
  seriesLegendLabel,
  xAxisLabel = 'Time (h)',
  yAxisLabel,
  width = 640,
  height = 260,
  yMin,
  yMax,
  showDots = false,
}: LinePlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const hasSeries = data.some((d) => d.series !== undefined);

    // Normalize series ids to display labels
    const rows = hasSeries
      ? data.map((d) => ({ ...d, series: seriesLabels?.[d.series!] ?? d.series }))
      : data;

    const seriesOrder = seriesColors
      ? Object.keys(seriesColors).map((id) => seriesLabels?.[id] ?? id)
      : undefined;
    const colorRange = seriesColors ? Object.values(seriesColors) : undefined;

    const yDomain =
      yMin !== undefined || yMax !== undefined
        ? [yMin ?? 0, yMax ?? undefined]
        : undefined;

    // Legend always shows for multi-series plots; explicit seriesColors
    // additionally pin the palette and ordering.
    const colorConfig = hasSeries
      ? seriesOrder
        ? {
            legend: true,
            type: 'ordinal' as const,
            domain: seriesOrder,
            range: colorRange,
            label: seriesLegendLabel,
          }
        : { legend: true, type: 'ordinal' as const, label: seriesLegendLabel }
      : undefined;

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 60,
      marginBottom: 40,
      marginRight: hasSeries ? 120 : 20,
      grid: true,
      x: { label: xAxisLabel },
      y: { label: yAxisLabel, domain: yDomain },
      ...(colorConfig ? { color: colorConfig } : {}),
      marks: hasSeries
        ? [
            Plot.line(rows, { x: 'time', y: 'value', stroke: 'series', strokeWidth: 2 }),
            ...(showDots
              ? [Plot.dot(rows, { x: 'time', y: 'value', fill: 'series', r: 3 })]
              : []),
          ]
        : [
            Plot.line(rows, { x: 'time', y: 'value', stroke: 'steelblue', strokeWidth: 2 }),
            ...(showDots
              ? [Plot.dot(rows, { x: 'time', y: 'value', fill: 'steelblue', r: 3 })]
              : []),
          ],
    });

    containerRef.current.appendChild(plot);
    return () => {
      plot.remove();
    };
  }, [
    data,
    seriesLabels,
    seriesColors,
    seriesLegendLabel,
    xAxisLabel,
    yAxisLabel,
    width,
    height,
    yMin,
    yMax,
    showDots,
  ]);

  return <div ref={containerRef} />;
}
