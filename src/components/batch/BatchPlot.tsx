/**
 * Observable Plot component for batch simulation results.
 */
import { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';

export interface BatchPlotProps {
  data: { time: number; value: number }[];
  statisticName: string;
  width?: number;
  height?: number;
}

export function BatchPlot({ data, statisticName, width = 640, height = 400 }: BatchPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

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
      marks: [
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
      ],
    });

    containerRef.current.appendChild(plot);

    return () => {
      plot.remove();
    };
  }, [data, statisticName, width, height]);

  return <div ref={containerRef} />;
}
