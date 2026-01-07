/**
 * Batch statistics module.
 *
 * This file provides model-agnostic access to statistics
 * and re-exports EHT statistics for backwards compatibility.
 */

import type { BatchSnapshot } from './types';
import { modelRegistry } from '../registry/registry';
import type { StatisticDefinition } from '../registry/types';

// Re-export EHT statistics for backwards compatibility
export {
  EHT_STATISTICS as AVAILABLE_STATISTICS,
  getEHTStatistic as getStatistic,
  getAllEHTStatisticIds as getAllStatisticIds,
  listEHTStatistics as listStatistics,
  computeEHTStatistics as computeStatistics,
} from '@/models/eht/statistics';

// Re-export the StatisticDefinition type
export type { StatisticDefinition } from '../registry/types';

/**
 * Get statistics for a specific model.
 */
export function getStatisticsForModel(modelName: string): StatisticDefinition[] {
  const model = modelRegistry.get(modelName);
  return model?.statistics ?? [];
}

/**
 * Get a specific statistic for a model.
 */
export function getStatisticForModel(
  modelName: string,
  id: string
): StatisticDefinition | undefined {
  const stats = getStatisticsForModel(modelName);
  return stats.find((s) => s.id === id);
}

/**
 * Compute multiple statistics for a snapshot using model-specific statistics.
 */
export function computeStatisticsForModel(
  modelName: string,
  snapshot: BatchSnapshot,
  statisticIds: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  const stats = getStatisticsForModel(modelName);

  for (const id of statisticIds) {
    const stat = stats.find((s) => s.id === id);
    if (stat) {
      result[id] = stat.compute(snapshot);
    }
  }

  return result;
}
