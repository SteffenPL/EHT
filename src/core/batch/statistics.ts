/**
 * Batch statistics utilities.
 */

import type { StatisticDefinition, SimulationModel } from '../registry/types';

/** Get a statistic by ID from a model */
export function getStatistic(model: SimulationModel, id: string): StatisticDefinition | undefined {
  return model.statistics?.find((s) => s.id === id);
}

/** Get all statistic IDs from a model */
export function getAllStatisticIds(model: SimulationModel): string[] {
  return model.statistics?.map((s) => s.id) ?? [];
}

/** List all statistics with metadata from a model */
export function listStatistics(model: SimulationModel): Array<{ id: string; label: string; description: string }> {
  return model.statistics?.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
  })) ?? [];
}
