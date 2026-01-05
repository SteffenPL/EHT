/**
 * Utilities for preparing batch data for plotting.
 */

export interface AggregatedData {
  time: number;
  value: number;
}

export interface AggregatedDataWithCI {
  time: number;
  mean: number;
  lower: number;
  upper: number;
  n: number;
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
 * Aggregates results data by time, computing mean and 95% confidence interval.
 * 
 * @param columns - Column names from results table
 * @param rows - Data rows from results table
 * @param statisticId - The statistic to plot
 * @returns Array of {time, mean, lower, upper, n} points for plotting
 */
export function aggregateByTimeWithCI(
  columns: string[],
  rows: (string | number)[][],
  statisticId: string
): AggregatedDataWithCI[] {
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

  // Compute means, standard errors, and confidence intervals
  const result: AggregatedDataWithCI[] = [];
  
  for (const [time, values] of timeGroups.entries()) {
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
      });
    } else {
      // Single observation - no confidence interval
      result.push({
        time,
        mean,
        lower: mean,
        upper: mean,
        n,
      });
    }
  }

  result.sort((a, b) => a.time - b.time);
  
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
