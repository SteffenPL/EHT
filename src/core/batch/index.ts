/**
 * Batch simulation module.
 */

export type {
  BatchSnapshot,
  ParameterRange,
  TimeSampleConfig,
  BatchConfig,
  BatchData,
  BatchProgress,
  StatisticsResult,
  BatchExportDialogConfig,
} from './types';

export {
  getTimeSamples,
  generateParameterConfigs,
} from './types';

export {
  formatTimeSampleConfig,
  parseExportTimeSpec,
  resolveExportCountLimit,
} from './exportConfig';

export {
  runBatch,
  computeTotalRuns,
} from './runner';

export { WorkerPool } from './workerPool';

export {
  createBatchDataFromSnapshots,
  batchSnapshotsToCSV,
  csvToBatchSnapshots,
  statisticsToCSV,
  downloadCSV,
  readFileAsText,
} from './serialization';

export {
  getStatistic,
  getAllStatisticIds,
  listStatistics,
} from './statistics';
