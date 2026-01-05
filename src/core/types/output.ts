/**
 * Output and export type definitions.
 * Defines the dataframe-like structures for simulation output.
 */

import type { SimulationParams } from './params';

/** Snapshot of a single cell at a time point (for CSV export) */
export interface CellSnapshot {
  id: number;
  type_name: string;
  pos_x: number;
  pos_y: number;
  A_x: number;
  A_y: number;
  B_x: number;
  B_y: number;
  phase: number;
  has_A: boolean;
  has_B: boolean;
  is_running: boolean;
  age: number;  // Time since birth
}

/** Complete snapshot at one time point */
export interface TimeSnapshot {
  t: number;
  step: number;
  cells: CellSnapshot[];
  cell_count: number;
  emt_count: number;
}

/** Full simulation output (dataframe-like) */
export interface SimulationOutput {
  params: SimulationParams;
  snapshots: TimeSnapshot[];

  // Computed at end
  final_cell_count: number;
  total_divisions: number;
  emt_events_occurred: number;
}

