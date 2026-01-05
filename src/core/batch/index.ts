/**
 * Batch module - public API exports
 */

export type {
  CellSnapshotMinimal,
  BatchSnapshot,
  ParameterRange,
  TimeSampleConfig,
  BatchConfig,
  BatchData,
  BatchProgress,
  StatisticsResult,
} from './types';

export {
  getTimeSamples,
  generateParameterConfigs,
} from './types';

export type { StatisticDefinition } from './statistics';

export {
  AVAILABLE_STATISTICS,
  getStatistic,
  computeStatistics,
} from './statistics';

export {
  batchSnapshotsToCSV,
  csvToBatchSnapshots,
  createBatchDataFromSnapshots,
  statisticsToCSV,
  downloadCSV,
  readFileAsText,
} from './serialization';

export type { BatchRunnerCallbacks, BatchRunnerOptions } from './runner';
export { runBatch, computeTotalRuns } from './runner';

export { WorkerPool } from './workerPool';
