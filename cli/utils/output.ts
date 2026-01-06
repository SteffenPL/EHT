/**
 * CLI output utilities for CSV generation.
 */

import * as fs from 'fs';
import type { BatchSnapshot } from '../../src/core/batch/types';

/**
 * Convert snapshots to CSV format.
 */
export function snapshotsToCSV(snapshots: BatchSnapshot[]): string {
  if (snapshots.length === 0) {
    return '';
  }

  // Build header
  const headers = [
    'run_index',
    'seed',
    'time_h',
    'cell_id',
    'cell_type',
    'pos_x',
    'pos_y',
    'A_x',
    'A_y',
    'B_x',
    'B_y',
    'has_A',
    'has_B',
    'phase',
    'age',
    'apical_neighbors',
    'basal_neighbors',
  ];

  // Add sampled params columns (from first snapshot with params)
  const paramKeys: string[] = [];
  for (const snapshot of snapshots) {
    if (Object.keys(snapshot.sampled_params).length > 0) {
      paramKeys.push(...Object.keys(snapshot.sampled_params));
      break;
    }
  }
  const allHeaders = [...headers, ...paramKeys];

  const rows: string[] = [allHeaders.join(',')];

  // Build data rows
  for (const snapshot of snapshots) {
    for (const cell of snapshot.cells) {
      const row = [
        snapshot.run_index,
        snapshot.seed,
        snapshot.time_h,
        cell.id,
        cell.type,
        cell.pos_x,
        cell.pos_y,
        cell.A_x,
        cell.A_y,
        cell.B_x,
        cell.B_y,
        cell.has_A ? 1 : 0,
        cell.has_B ? 1 : 0,
        cell.phase,
        cell.age,
        `"${cell.apical_neighbors}"`,
        `"${cell.basal_neighbors}"`,
        ...paramKeys.map((k) => snapshot.sampled_params[k] ?? ''),
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\n');
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
