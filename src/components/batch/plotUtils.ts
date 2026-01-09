/**
 * Utilities for preparing batch data for plotting.
 */

export interface AggregatedData {
  time: number;
  value: number;
  cell_group?: string; // Optional for backwards compatibility
}

export interface AggregatedDataWithCI {
  time: number;
  mean: number;
  lower: number;
  upper: number;
  n: number;
  cell_group: string;
}

/**
 * Aggregates results data by time, computing the mean of a statistic.
 * 
 * @param columns - Column names from results table
 * @param rows - Data rows from results table
 * @param statisticId - The statistic to plot
 * @returns Array of {time, value} points for plotting
 */
export function aggregateByTime(
  columns: string[],
  rows: (string | number)[][],
  statisticId: string
): AggregatedData[] {
  // Find column indices
  const timeIdx = columns.indexOf('time_h');
  const statIdx = columns.indexOf(statisticId);

  if (timeIdx === -1 || statIdx === -1) {
    return [];
  }

  // Group by time and collect values
  const timeGroups = new Map<number, number[]>();
  
  for (const row of rows) {
    const time = Number(row[timeIdx]);
    const value = Number(row[statIdx]);
    
    if (!isNaN(time) && !isNaN(value)) {
      if (!timeGroups.has(time)) {
        timeGroups.set(time, []);
      }
      timeGroups.get(time)!.push(value);
    }
  }

  // Compute means and sort by time
  const result: AggregatedData[] = [];
  
  for (const [time, values] of timeGroups.entries()) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    result.push({ time, value: mean });
  }

  result.sort((a, b) => a.time - b.time);
  
  return result;
}

/**
 * Aggregates results data by time and cell_group, computing mean and 95% confidence interval.
 *
 * @param columns - Column names from results table
 * @param rows - Data rows from results table
 * @param statisticId - The statistic to plot
 * @returns Array of {time, mean, lower, upper, n, cell_group} points for plotting
 */
export function aggregateByTimeWithCI(
  columns: string[],
  rows: (string | number)[][],
  statisticId: string
): AggregatedDataWithCI[] {
  // Find column indices
  const timeIdx = columns.indexOf('time_h');
  const statIdx = columns.indexOf(statisticId);
  const groupIdx = columns.indexOf('cell_group');

  if (timeIdx === -1 || statIdx === -1) {
    return [];
  }

  // Group by (time, cell_group) and collect values
  const groups = new Map<string, { time: number; cell_group: string; values: number[] }>();

  for (const row of rows) {
    const time = Number(row[timeIdx]);
    const value = Number(row[statIdx]);
    const cell_group = groupIdx !== -1 ? String(row[groupIdx]) : 'all';

    if (!isNaN(time) && !isNaN(value)) {
      const key = `${time}_${cell_group}`;
      if (!groups.has(key)) {
        groups.set(key, { time, cell_group, values: [] });
      }
      groups.get(key)!.values.push(value);
    }
  }

  // Compute means, standard errors, and confidence intervals
  const result: AggregatedDataWithCI[] = [];

  for (const { time, cell_group, values } of groups.values()) {
    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    if (n > 1) {
      // Compute standard deviation
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
      const sd = Math.sqrt(variance);

      // Compute standard error
      const se = sd / Math.sqrt(n);

      // 95% confidence interval (±1.96 * SE)
      const margin = 1.96 * se;

      result.push({
        time,
        mean,
        lower: mean - margin,
        upper: mean + margin,
        n,
        cell_group,
      });
    } else {
      // Single observation - no confidence interval
      result.push({
        time,
        mean,
        lower: mean,
        upper: mean,
        n,
        cell_group,
      });
    }
  }

  result.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.cell_group.localeCompare(b.cell_group);
  });

  return result;
}

/**
 * Aggregates results data by a generic x-axis (time or parameter) and cell_group.
 *
 * @param columns - Column names from results table
 * @param rows - Data rows from results table
 * @param xAxisColumn - The x-axis column name (e.g., 'time_h' or parameter path)
 * @param yAxisColumn - The y-axis statistic name
 * @returns Array of {time, mean, lower, upper, n, cell_group} points for plotting
 */
export function aggregateByXAxisWithCI(
  columns: string[],
  rows: (string | number)[][],
  xAxisColumn: string,
  yAxisColumn: string
): AggregatedDataWithCI[] {
  // Find column indices
  const xIdx = columns.indexOf(xAxisColumn);
  const yIdx = columns.indexOf(yAxisColumn);
  const groupIdx = columns.indexOf('cell_group');

  if (xIdx === -1 || yIdx === -1) {
    return [];
  }

  // Group by (x-value, cell_group) and collect y-values
  const groups = new Map<string, { time: number; cell_group: string; values: number[] }>();

  for (const row of rows) {
    const xValue = Number(row[xIdx]);
    const yValue = Number(row[yIdx]);
    const cell_group = groupIdx !== -1 ? String(row[groupIdx]) : 'all';

    if (!isNaN(xValue) && !isNaN(yValue)) {
      const key = `${xValue}_${cell_group}`;
      if (!groups.has(key)) {
        groups.set(key, { time: xValue, cell_group, values: [] });
      }
      groups.get(key)!.values.push(yValue);
    }
  }

  // Compute means, standard errors, and confidence intervals
  const result: AggregatedDataWithCI[] = [];

  for (const { time: xValue, cell_group, values } of groups.values()) {
    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    if (n > 1) {
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
      const sd = Math.sqrt(variance);
      const se = sd / Math.sqrt(n);
      const margin = 1.96 * se;

      result.push({
        time: xValue, // Using 'time' field name for compatibility
        mean,
        lower: mean - margin,
        upper: mean + margin,
        n,
        cell_group,
      });
    } else {
      result.push({
        time: xValue,
        mean,
        lower: mean,
        upper: mean,
        n,
        cell_group,
      });
    }
  }

  result.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.cell_group.localeCompare(b.cell_group);
  });

  return result;
}

/**
 * Aggregates data for histogram plots (by cell_group only).
 *
 * @param columns - Column names from results table
 * @param rows - Data rows from results table
 * @param statisticColumn - The statistic to plot
 * @returns Array of {group, mean, lower, upper, n} for histogram bars
 */
export function aggregateForHistogram(
  columns: string[],
  rows: (string | number)[][],
  statisticColumn: string
): Array<{ group: string; mean: number; lower: number; upper: number; n: number }> {
  const statIdx = columns.indexOf(statisticColumn);
  const groupIdx = columns.indexOf('cell_group');

  if (statIdx === -1) {
    return [];
  }

  // Group by cell_group and collect values
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const value = Number(row[statIdx]);
    const cell_group = groupIdx !== -1 ? String(row[groupIdx]) : 'all';

    if (!isNaN(value)) {
      if (!groups.has(cell_group)) {
        groups.set(cell_group, []);
      }
      groups.get(cell_group)!.push(value);
    }
  }

  // Compute statistics for each group
  const result: Array<{ group: string; mean: number; lower: number; upper: number; n: number }> = [];

  for (const [group, values] of groups.entries()) {
    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    if (n > 1) {
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
      const sd = Math.sqrt(variance);
      const se = sd / Math.sqrt(n);
      const margin = 1.96 * se;

      result.push({
        group,
        mean,
        lower: mean - margin,
        upper: mean + margin,
        n,
      });
    } else {
      result.push({
        group,
        mean,
        lower: mean,
        upper: mean,
        n,
      });
    }
  }

  result.sort((a, b) => a.group.localeCompare(b.group));

  return result;
}

/**
 * Checks if the current results data is compatible with line plots.
 *
 * @param columns - Column names from results table
 * @returns Object with isCompatible flag and error message if incompatible
 */
export function checkLinePlotCompatibility(
  columns: string[]
): { isCompatible: boolean; message?: string } {
  const hasTimeColumn = columns.includes('time_h');

  if (!hasTimeColumn) {
    return {
      isCompatible: false,
      message: 'Line plots require time series data. Change output mode to "Time Series" above.',
    };
  }

  return { isCompatible: true };
}
