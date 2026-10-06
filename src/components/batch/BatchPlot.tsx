/**
 * Observable Plot component for batch simulation results.
 * The 'line' mode delegates to the shared LinePlot component;
 * 'line_ci' and 'histogram' modes are rendered here.
 */
import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';
import { LinePlot } from '@/components/plots/LinePlot';

export interface BatchPlotProps {
  data: { time: number; value: number; cell_group?: string }[];
  dataWithCI?: { time: number; mean: number; lower: number; upper: number; n: number; cell_group: string }[];
  histogramData?: { group: string; mean: number; lower: number; upper: number; n: number }[];
  xAxisLabel?: string;
  yAxisLabel: string;
  plotType: 'line' | 'line_ci' | 'histogram';
  width?: number;
  height?: number;
  yMin?: number;
  yMax?: number;
}

export function BatchPlot({
  data,
  dataWithCI,
  histogramData,
  xAxisLabel = 'Time (h)',
  yAxisLabel,
  plotType,
  width = 640,
  height = 400,
  yMin,
  yMax,
}: BatchPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (plotType === 'line' && data.length === 0) return;
    if (plotType === 'line_ci' && (!dataWithCI || dataWithCI.length === 0)) return;
    if (plotType === 'histogram' && (!histogramData || histogramData.length === 0)) return;

    // The plain 'line' mode is rendered by the shared LinePlot child below;
    // only 'line_ci' and 'histogram' build their marks here.
    if (plotType === 'line') return;

    let marks: any[];
    let colorScheme: any = { legend: true };
    let xConfig: any = { label: xAxisLabel };
    let yConfig: any = {
      label: yAxisLabel,
      domain: yMin !== undefined || yMax !== undefined
        ? [yMin ?? 0, yMax ?? undefined]
        : undefined,
    };

    if (plotType === 'histogram' && histogramData) {
      // Histogram plot - bars by cell group with error bars
      marks = [
        // Bars
        Plot.barY(histogramData, {
          x: 'group',
          y: 'mean',
          fill: 'group',
        }),
        // Error bars using link to connect lower and upper bounds
        Plot.link(
          histogramData.flatMap(d => [
            { group: d.group, y: d.lower, y2: d.upper }
          ]),
          Plot.pointer({
            x: 'group',
            y1: 'y',
            y2: 'y2',
            stroke: '#666',
            strokeWidth: 2,
          })
        ),
        // Cap lines for error bars
        ...histogramData.flatMap(d => [
          Plot.tickX([d], { x: 'group', y: d.lower, stroke: '#666' }),
          Plot.tickX([d], { x: 'group', y: d.upper, stroke: '#666' }),
        ]),
      ];

      xConfig = { label: 'Cell Group' };
      yConfig = {
        label: yAxisLabel,
        grid: true,
        domain: yMin !== undefined || yMax !== undefined
          ? [yMin ?? 0, yMax ?? undefined]
          : [0, undefined], // Always start histogram y-axis from 0
      };
      colorScheme = {
        color: { legend: true, label: 'Cell Group', type: 'ordinal' }
      };
    } else if (plotType === 'line_ci' && dataWithCI) {
      // Line plot with confidence interval - separate lines for each cell_group
      marks = [
        // Confidence bands by cell_group
        Plot.areaY(dataWithCI, {
          x: 'time',
          y1: 'lower',
          y2: 'upper',
          fill: 'cell_group',
          fillOpacity: 0.2,
        }),
        // Mean lines by cell_group
        Plot.line(dataWithCI, {
          x: 'time',
          y: 'mean',
          stroke: 'cell_group',
          strokeWidth: 2,
        }),
        // Data points by cell_group
        Plot.dot(dataWithCI, {
          x: 'time',
          y: 'mean',
          fill: 'cell_group',
          r: 3,
        }),
      ];

      // Use categorical color scheme
      colorScheme = {
        color: { legend: true, label: 'Cell Group', type: 'ordinal' }
      };
    } else {
      // Unreachable: the 'line' mode returns early above
      return;
    }

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 60,
      marginBottom: 40,
      marginRight: 120, // Extra space for legend
      grid: true,
      x: xConfig,
      y: yConfig,
      ...colorScheme,
      marks,
    });

    containerRef.current.appendChild(plot);

    return () => {
      plot.remove();
    };
  }, [data, dataWithCI, histogramData, xAxisLabel, yAxisLabel, plotType, width, height, yMin, yMax]);

  return (
    <div ref={containerRef}>
      {plotType === 'line' && data.length > 0 && (
        <LinePlot
          data={data.map((d) => ({ time: d.time, value: d.value, series: d.cell_group }))}
          seriesLegendLabel="Cell Group"
          xAxisLabel={xAxisLabel}
          yAxisLabel={yAxisLabel}
          width={width}
          height={height}
          yMin={yMin}
          yMax={yMax}
          showDots
        />
      )}
    </div>
  );
}
