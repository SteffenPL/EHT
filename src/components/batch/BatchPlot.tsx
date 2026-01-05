/**
 * Observable Plot component for batch simulation results.
 */
import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

export interface BatchPlotProps {
  data: { time: number; value: number }[];
  dataWithCI?: { time: number; mean: number; lower: number; upper: number; n: number }[];
  statisticName: string;
  plotType: 'line' | 'line_ci';
  width?: number;
  height?: number;
}

export function BatchPlot({
  data,
  dataWithCI,
  statisticName,
  plotType,
  width = 640,
  height = 400,
}: BatchPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (plotType === 'line' && data.length === 0) return;
    if (plotType === 'line_ci' && (!dataWithCI || dataWithCI.length === 0)) return;

    let marks: any[];

    if (plotType === 'line_ci' && dataWithCI) {
      // Line plot with confidence interval
      marks = [
        // Confidence band
        Plot.areaY(dataWithCI, {
          x: 'time',
          y1: 'lower',
          y2: 'upper',
          fill: 'steelblue',
          fillOpacity: 0.2,
        }),
        // Mean line
        Plot.line(dataWithCI, {
          x: 'time',
          y: 'mean',
          stroke: 'steelblue',
          strokeWidth: 2,
        }),
        // Data points
        Plot.dot(dataWithCI, {
          x: 'time',
          y: 'mean',
          fill: 'steelblue',
          r: 3,
        }),
      ];
    } else {
      // Simple line plot
      marks = [
        Plot.line(data, {
          x: 'time',
          y: 'value',
          stroke: 'steelblue',
          strokeWidth: 2,
        }),
        Plot.dot(data, {
          x: 'time',
          y: 'value',
          fill: 'steelblue',
          r: 3,
        }),
      ];
    }

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 60,
      marginBottom: 40,
      grid: true,
      x: {
        label: 'Time (h)',
      },
      y: {
        label: statisticName,
      },
      marks,
    });

    containerRef.current.appendChild(plot);

    return () => {
      plot.remove();
    };
  }, [data, dataWithCI, statisticName, plotType, width, height]);

  return <div ref={containerRef} />;
}
