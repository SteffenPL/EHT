/**
 * Utilities for preparing batch data for plotting.
 */

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
): { time: number; value: number }[] {
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
  const result: { time: number; value: number }[] = [];
  
  for (const [time, values] of timeGroups.entries()) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    result.push({ time, value: mean });
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
