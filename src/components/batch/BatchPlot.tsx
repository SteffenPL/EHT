/**
 * Observable Plot component for batch simulation results.
 */
import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

export interface BatchPlotProps {
  data: { time: number; value: number; cell_group?: string }[];
  dataWithCI?: { time: number; mean: number; lower: number; upper: number; n: number; cell_group: string }[];
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
    let colorScheme: any = { legend: true };

    if (plotType === 'line_ci' && dataWithCI) {
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
        color: { legend: true, label: 'Cell Group' }
      };
    } else {
      // Simple line plot - check if we have cell_group data
      const hasGroups = data.some(d => d.cell_group !== undefined);

      if (hasGroups) {
        marks = [
          Plot.line(data, {
            x: 'time',
            y: 'value',
            stroke: 'cell_group',
            strokeWidth: 2,
          }),
          Plot.dot(data, {
            x: 'time',
            y: 'value',
            fill: 'cell_group',
            r: 3,
          }),
        ];
        colorScheme = {
          color: { legend: true, label: 'Cell Group' }
        };
      } else {
        // Fallback to single color
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
    }

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 60,
      marginBottom: 40,
      marginRight: 120, // Extra space for legend
      grid: true,
      x: {
        label: 'Time (h)',
      },
      y: {
        label: statisticName,
      },
      ...colorScheme,
      marks,
    });

    containerRef.current.appendChild(plot);

    return () => {
      plot.remove();
    };
  }, [data, dataWithCI, statisticName, plotType, width, height]);

  return <div ref={containerRef} />;
}
