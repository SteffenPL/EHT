/**
 * Batch data CSV serialization.
 * Stores all snapshots in a flat CSV format for easy reload.
 */

import Papa from 'papaparse';
import type { BatchSnapshot, CellSnapshotMinimal, BatchData, BatchConfig } from './types';

/** Column separator for parameter paths in CSV headers */
const PATH_SEPARATOR = '__';

/** Convert parameter path to CSV column name */
function pathToColumn(path: string): string {
  return 'param' + PATH_SEPARATOR + path.replace(/\./g, PATH_SEPARATOR);
}

/** Convert CSV column name back to parameter path */
function columnToPath(column: string): string {
  if (!column.startsWith('param' + PATH_SEPARATOR)) return column;
  return column.slice(('param' + PATH_SEPARATOR).length).replace(new RegExp(PATH_SEPARATOR, 'g'), '.');
}

/** CSV row for a single cell at a single snapshot */
interface CellRow {
  run_index: number;
  seed: number;
  time_h: number;
  [paramColumn: string]: string | number | boolean; // param__general__N_emt, etc.
  cell_id: number;
  cell_type: string;
  pos_x: number;
  pos_y: number;
  A_x: number;
  A_y: number;
  B_x: number;
  B_y: number;
  has_A: boolean;
  has_B: boolean;
  phase: number;
  age: number;
  apical_neighbors: string;
  basal_neighbors: string;
}

/**
 * Serialize batch snapshots to CSV string.
 */
export function batchSnapshotsToCSV(snapshots: BatchSnapshot[]): string {
  if (snapshots.length === 0) {
    return '';
  }

  // Collect all parameter paths used
  const paramPaths = new Set<string>();
  for (const snapshot of snapshots) {
    for (const path of Object.keys(snapshot.sampled_params)) {
      paramPaths.add(path);
    }
  }
  const sortedPaths = Array.from(paramPaths).sort();

  // Build rows
  const rows: CellRow[] = [];

  for (const snapshot of snapshots) {
    for (const cell of snapshot.cells) {
      const row: CellRow = {
        run_index: snapshot.run_index,
        seed: snapshot.seed,
        time_h: snapshot.time_h,
        cell_id: cell.id,
        cell_type: cell.type,
        pos_x: cell.pos_x,
        pos_y: cell.pos_y,
        A_x: cell.A_x,
        A_y: cell.A_y,
        B_x: cell.B_x,
        B_y: cell.B_y,
        has_A: cell.has_A,
        has_B: cell.has_B,
        phase: cell.phase,
        age: cell.age,
        apical_neighbors: cell.apical_neighbors,
        basal_neighbors: cell.basal_neighbors,
      };

      // Add parameter columns
      for (const path of sortedPaths) {
        row[pathToColumn(path)] = snapshot.sampled_params[path] ?? '';
      }

      rows.push(row);
    }
  }

  // Define column order
  const columns = [
    'run_index',
    'seed',
    'time_h',
    ...sortedPaths.map(pathToColumn),
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

  return Papa.unparse(rows, { columns });
}

/**
 * Parse batch snapshots from CSV string.
 */
export function csvToBatchSnapshots(csv: string): BatchSnapshot[] {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    dynamicTyping: false, // We'll parse manually for type safety
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.warn('CSV parse warnings:', parsed.errors);
  }

  // Group rows by (run_index, seed, time_h)
  const snapshotMap = new Map<string, BatchSnapshot>();

  // Find parameter columns
  const paramColumns = parsed.meta.fields?.filter((f) =>
    f.startsWith('param' + PATH_SEPARATOR)
  ) ?? [];

  for (const row of parsed.data) {
    const runIndex = parseInt(row.run_index, 10);
    const seed = parseInt(row.seed, 10);
    const timeH = parseFloat(row.time_h);

    const key = `${runIndex}-${seed}-${timeH}`;

    if (!snapshotMap.has(key)) {
      // Extract sampled params
      const sampledParams: Record<string, number> = {};
      for (const col of paramColumns) {
        const val = row[col];
        if (val !== '' && val !== undefined) {
          sampledParams[columnToPath(col)] = parseFloat(val);
        }
      }

      snapshotMap.set(key, {
        run_index: runIndex,
        seed,
        time_h: timeH,
        sampled_params: sampledParams,
        cells: [],
      });
    }

    const snapshot = snapshotMap.get(key)!;

    const cell: CellSnapshotMinimal = {
      id: parseInt(row.cell_id, 10),
      type: row.cell_type,
      pos_x: parseFloat(row.pos_x),
      pos_y: parseFloat(row.pos_y),
      A_x: parseFloat(row.A_x),
      A_y: parseFloat(row.A_y),
      B_x: parseFloat(row.B_x),
      B_y: parseFloat(row.B_y),
      has_A: row.has_A === 'true',
      has_B: row.has_B === 'true',
      phase: parseInt(row.phase, 10),
      age: parseFloat(row.age),
      apical_neighbors: row.apical_neighbors ?? '',
      basal_neighbors: row.basal_neighbors ?? '',
    };

    snapshot.cells.push(cell);
  }

  // Sort snapshots by run_index, then time
  const snapshots = Array.from(snapshotMap.values());
  snapshots.sort((a, b) => {
    if (a.run_index !== b.run_index) return a.run_index - b.run_index;
    return a.time_h - b.time_h;
  });

  return snapshots;
}

/**
 * Create BatchData from loaded snapshots.
 * Note: We don't store the full config in CSV, so we reconstruct what we can.
 */
export function createBatchDataFromSnapshots(snapshots: BatchSnapshot[]): BatchData {
  // Infer parameter ranges from data
  const paramPaths = new Set<string>();
  for (const s of snapshots) {
    for (const path of Object.keys(s.sampled_params)) {
      paramPaths.add(path);
    }
  }

  // Infer time samples
  const times = new Set<number>();
  for (const s of snapshots) {
    times.add(s.time_h);
  }
  const sortedTimes = Array.from(times).sort((a, b) => a - b);

  // Infer runs
  const runSeeds = new Set<string>();
  for (const s of snapshots) {
    runSeeds.add(`${s.run_index}-${s.seed}`);
  }

  // Create minimal config
  const config: BatchConfig = {
    parameter_ranges: Array.from(paramPaths).map((path) => ({
      path,
      min: 0,
      max: 0,
      steps: 0,
    })),
    time_samples: {
      start: sortedTimes[0] ?? 0,
      end: sortedTimes[sortedTimes.length - 1] ?? 48,
      step: sortedTimes.length > 1 ? sortedTimes[1] - sortedTimes[0] : 12,
    },
    seeds_per_config: 1,
    sampling_mode: 'grid',
  };

  return {
    config,
    snapshots,
    completed_runs: runSeeds.size,
    total_runs: runSeeds.size,
  };
}

/**
 * Export statistics results to CSV.
 */
export function statisticsToCSV(
  columns: string[],
  rows: (string | number)[][]
): string {
  const data = rows.map((row) => {
    const obj: Record<string, string | number> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  return Papa.unparse(data, { columns });
}

/**
 * Trigger file download in browser.
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read file as text (for loading CSV).
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
