/**
 * CLI output utilities for CSV generation.
 */

import * as fs from 'fs';
import type { BatchSnapshot } from '../../src/core/batch/types';

/**
 * Convert snapshots to CSV format.
 */
import { batchSnapshotsToCSV } from '../../src/core/batch/serialization';

/**
 * Convert snapshots to CSV format.
 */
export function snapshotsToCSV(snapshots: BatchSnapshot[]): string {
  return batchSnapshotsToCSV(snapshots);
}

/**
 * Write output to file or stdout.
 */
export function writeOutput(content: string, filePath?: string): void {
  if (filePath) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.error(`Output written to: ${filePath}`);
  } else {
    console.log(content);
  }
}

/**
 * Format progress message.
 */
export function formatProgress(
  currentTime: number,
  endTime: number,
  runIndex?: number,
  totalRuns?: number
): string {
  const timeProgress = `t=${currentTime.toFixed(1)}h / ${endTime.toFixed(1)}h`;
  if (runIndex !== undefined && totalRuns !== undefined) {
    return `Run ${runIndex + 1}/${totalRuns}: ${timeProgress}`;
  }
  return `Progress: ${timeProgress}`;
}
