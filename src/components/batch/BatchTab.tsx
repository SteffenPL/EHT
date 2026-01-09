/**
 * Batch simulations tab.
 */
import { useState, useRef, useCallback } from 'react';
import { Play, Upload, Download, FileSpreadsheet, Square } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { ResultsTable } from './ResultsTable';
import { BatchPlot } from './BatchPlot';
import { aggregateByTime, aggregateByXAxisWithCI, aggregateForHistogram } from './plotUtils';
import type { SimulationConfig } from '@/core/params';
import type {
  BatchData,
  BatchProgress,
  BatchSnapshot,
} from '@/core/batch';
import {
  runBatch,
  computeTotalRuns,
  batchSnapshotsToCSV,
  csvToBatchSnapshots,
  createBatchDataFromSnapshots,
  statisticsToCSV,
  downloadCSV,
  readFileAsText,
  getTimeSamples,
  WorkerPool,
} from '@/core/batch';
import { setNestedValue } from '@/core/params';
import { useModel } from '@/contexts/ModelContext';

export interface BatchTabProps {
  config: SimulationConfig;
  onConfigChange: (config: SimulationConfig) => void;
}

export function BatchTab({ config, onConfigChange: _onConfigChange }: BatchTabProps) {
  // Get current model for statistics
  const { currentModel } = useModel();

  // Batch data and progress
  const [batchData, setBatchData] = useState<BatchData | null>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const abortRef = useRef(false);

  // Statistics - always use all available statistics
  // Use dynamic generation if available to reflect current cell type names
  const statistics = currentModel?.generateStatistics
    ? currentModel.generateStatistics(config.params)
    : (currentModel?.statistics || []);
  const selectedStats = statistics.map(s => s.id);
  const [outputMode, setOutputMode] = useState<'time_series' | 'terminal'>('time_series');
  const [resultsColumns, setResultsColumns] = useState<string[]>([]);
  const [resultsRows, setResultsRows] = useState<(string | number)[][]>([]);

  // Plot configuration
  const [plotXAxis, setPlotXAxis] = useState<string>('time_h');
  const [plotYAxis, setPlotYAxis] = useState<string>('');
  const [plotType, setPlotType] = useState<'line_ci' | 'histogram'>('line_ci');

  // Parallel execution
  const [useParallel, setUseParallel] = useState(WorkerPool.isSupported());
  const workerCount = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate total runs
  const totalRuns = computeTotalRuns(config.parameterRanges, config.seedsPerConfig);
  const timeSamples = getTimeSamples(config.timeSamples);
  const totalSnapshots = totalRuns * timeSamples.length;

  // Run batch
  const handleRunBatch = useCallback(async () => {
    setIsRunning(true);
    setStartTime(Date.now());
    abortRef.current = false;

    try {
      const data = await runBatch(
        config.params,
        {
          parameter_ranges: config.parameterRanges,
          time_samples: config.timeSamples,
          seeds_per_config: config.seedsPerConfig,
          sampling_mode: 'grid',
        },
        {
          onProgress: (p) => {
            if (!abortRef.current) {
              setProgress(p);
            }
          },
        },
        {
          parallel: useParallel,
          workerCount,
        }
      );

      if (!abortRef.current) {
        setBatchData(data);
        setResultsColumns([]);
        setResultsRows([]);
      }
    } catch (err) {
      console.error('Batch run failed:', err);
      alert('Batch run failed. Check console for details.');
    } finally {
      setIsRunning(false);
      setProgress(null);
      setStartTime(null);
    }
  }, [config, useParallel, workerCount]);

  // Stop batch
  const handleStopBatch = useCallback(() => {
    abortRef.current = true;
  }, []);

  // Load batch CSV
  const handleLoadBatch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const snapshots = csvToBatchSnapshots(text);
      const data = createBatchDataFromSnapshots(snapshots);
      setBatchData(data);
      setResultsColumns([]);
      setResultsRows([]);
    } catch (err) {
      console.error('Failed to load batch CSV:', err);
      alert('Failed to load batch CSV. Check console for details.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save batch CSV
  const handleSaveBatch = () => {
    if (!batchData) return;
    const csv = batchSnapshotsToCSV(batchData.snapshots);
    downloadCSV(csv, 'batch_snapshots.csv');
  };

  // Load TOML (params + optional parameter ranges)

  // Compute statistics
  const handleComputeStats = () => {
    if (!batchData || selectedStats.length === 0 || !currentModel) return;

    // Get parameter paths
    const paramPaths = new Set<string>();
    for (const s of batchData.snapshots) {
      for (const path of Object.keys(s.sampled_params)) {
        paramPaths.add(path);
      }
    }
    const sortedPaths = Array.from(paramPaths).sort();

    // Filter snapshots based on output mode
    let snapshots: BatchSnapshot[];
    if (outputMode === 'terminal') {
      // Get terminal time for each run
      const terminalSnapshots = new Map<string, BatchSnapshot>();
      for (const s of batchData.snapshots) {
        const key = `${s.run_index}-${s.seed}`;
        const existing = terminalSnapshots.get(key);
        if (!existing || s.time_h > existing.time_h) {
          terminalSnapshots.set(key, s);
        }
      }
      snapshots = Array.from(terminalSnapshots.values());
    } else {
      snapshots = batchData.snapshots;
    }

    // Extract cell groups from available statistics
    // Statistics are named like "ab_distance_all", "AX_control", "bx_control+emt"
    // We need to extract unique groups and base stat names
    const cellGroups = new Set<string>();
    const baseStatNames = new Set<string>();

    for (const statId of selectedStats) {
      // Find last underscore to split stat_name from group
      const lastUnderscoreIdx = statId.lastIndexOf('_');
      if (lastUnderscoreIdx > 0) {
        const baseName = statId.substring(0, lastUnderscoreIdx);
        const group = statId.substring(lastUnderscoreIdx + 1);
        baseStatNames.add(baseName);
        cellGroups.add(group);
      }
    }

    const sortedGroups = Array.from(cellGroups).sort();
    const sortedBaseStats = Array.from(baseStatNames).sort();

    // Build columns: param paths, run_index, seed, time_h, cell_group, then base stat names
    const columns = [
      ...sortedPaths,
      'run_index',
      'seed',
      'time_h',
      'cell_group',
      ...sortedBaseStats,
    ];

    // Build rows - one row per (snapshot, cell_group)
    const rows: (string | number)[][] = [];
    for (const snapshot of snapshots) {
      // Reconstruct state to compute stats
      // IMPORTANT: Apply sampled parameter overrides to get correct params for this snapshot
      const snapshotParams = JSON.parse(JSON.stringify(config.params)); // Deep clone
      for (const [path, value] of Object.entries(snapshot.sampled_params)) {
        setNestedValue(snapshotParams, path, value);
      }

      const state = currentModel.loadSnapshot(snapshot.data, snapshotParams);
      const allStats = currentModel.computeStats(state, snapshotParams);

      // Create one row per cell group
      for (const group of sortedGroups) {
        const row: (string | number)[] = [
          ...sortedPaths.map((p) => snapshot.sampled_params[p] ?? ''),
          snapshot.run_index,
          snapshot.seed,
          snapshot.time_h,
          group,
          ...sortedBaseStats.map((baseName) => {
            const fullStatId = `${baseName}_${group}`;
            return allStats[fullStatId] ?? 0;
          }),
        ];
        rows.push(row);
      }
    }

    setResultsColumns(columns);
    setResultsRows(rows);

    // Set default plot y-axis if not set (use first base stat name)
    if (!plotYAxis && sortedBaseStats.length > 0) {
      setPlotYAxis(sortedBaseStats[0]);
    }
  };

  // Export statistics CSV
  const handleExportStats = () => {
    if (resultsColumns.length === 0 || resultsRows.length === 0) return;
    const csv = statisticsToCSV(resultsColumns, resultsRows);
    downloadCSV(csv, 'batch_statistics.csv');
  };

  // Export full per-cell CSV
  const handleExportFullCSV = () => {
    if (!batchData || !currentModel) return;

    // Get parameter paths
    const paramPaths = new Set<string>();
    for (const s of batchData.snapshots) {
      for (const path of Object.keys(s.sampled_params)) {
        paramPaths.add(path);
      }
    }
    const sortedPaths = Array.from(paramPaths).sort();

    // Filter snapshots based on output mode
    let snapshots: BatchSnapshot[];
    if (outputMode === 'terminal') {
      const terminalSnapshots = new Map<string, BatchSnapshot>();
      for (const s of batchData.snapshots) {
        const key = `${s.run_index}-${s.seed}`;
        const existing = terminalSnapshots.get(key);
        if (!existing || s.time_h > existing.time_h) {
          terminalSnapshots.set(key, s);
        }
      }
      snapshots = Array.from(terminalSnapshots.values());
    } else {
      snapshots = batchData.snapshots;
    }

    // Build columns for per-cell data
    const columns = [
      ...sortedPaths,
      'run_index',
      'seed',
      'time_h',
      'cell_id',
      'cell_type',
      'X_x', 'X_y',
      'A_x', 'A_y',
      'B_x', 'B_y',
      'a_x', 'a_y',
      'b_x', 'b_y',
      'ab_distance',
      'AX', 'BX', 'ax', 'bx', 'x',
      'below_basal', 'above_apical', 'below_neighbours',
    ];

    // Build rows - one row per cell
    const rows: (string | number)[][] = [];
    for (const snapshot of snapshots) {
      // NOTE: For full per-cell data export, we would need to call a model-specific
      // function like exportCellMetrics(state, params) that returns per-cell data.
      // For now, this is a placeholder that exports basic snapshot data.
      // The EHT model has exportCellMetrics in statistics.ts, but it's not exposed
      // through the model interface yet.

      // Apply sampled parameter overrides
      const snapshotParams = JSON.parse(JSON.stringify(config.params)); // Deep clone
      for (const [path, value] of Object.entries(snapshot.sampled_params)) {
        setNestedValue(snapshotParams, path, value);
      }

      // Export basic snapshot data (raw cell positions from snapshot)
      for (let i = 0; i < snapshot.data.length; i++) {
        const cellData = snapshot.data[i];
        const row: (string | number)[] = [
          ...sortedPaths.map((p) => snapshot.sampled_params[p] ?? ''),
          snapshot.run_index,
          snapshot.seed,
          snapshot.time_h,
          i, // cell_id
          cellData.typeIndex || '', // cell_type
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // Placeholder for position/geometry data
          0, 0, 0, 0, 0, 0, // Placeholder for distance metrics
          0, 0, 0, // Placeholder for boolean metrics
        ];
        rows.push(row);
      }
    }

    const csv = statisticsToCSV(columns, rows);
    downloadCSV(csv, 'batch_full_cell_data.csv');
  };

  const progressPercent = progress
    ? (progress.current_run / progress.total_runs) * 100
    : 0;

  // Compute estimated time remaining
  const getTimeRemaining = (): string | null => {
    if (!progress || !startTime || progress.current_run === 0) return null;

    const elapsed = Date.now() - startTime;
    const avgTimePerRun = elapsed / progress.current_run;
    const remainingRuns = progress.total_runs - progress.current_run;
    const remainingMs = avgTimePerRun * remainingRuns;

    if (remainingMs < 1000) return '< 1s';
    if (remainingMs < 60000) return `${Math.ceil(remainingMs / 1000)}s`;
    if (remainingMs < 3600000) {
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.ceil((remainingMs % 60000) / 1000);
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(remainingMs / 3600000);
    const mins = Math.ceil((remainingMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  const timeRemaining = getTimeRemaining();

  // Extract available base statistics from results columns
  // Columns are: [param paths, run_index, seed, time_h, cell_group, base stats...]
  const availableBaseStats = resultsColumns.filter(
    col => !['run_index', 'seed', 'time_h', 'cell_group'].includes(col) && !col.includes('.')
  );

  // Extract available x-axis options (time_h and parameter paths)
  const availableXAxisOptions = resultsColumns.filter(
    col => col === 'time_h' || (col.includes('.') && !['run_index', 'seed', 'cell_group'].includes(col))
  );

  // Prepare plot data based on plot type
  let plotData: any[] = [];
  let plotDataWithCI: any[] = [];
  let histogramData: any[] = [];

  if (plotType === 'histogram' && plotYAxis) {
    histogramData = aggregateForHistogram(resultsColumns, resultsRows, plotYAxis);
  } else if (plotType === 'line_ci' && plotXAxis && plotYAxis) {
    plotDataWithCI = aggregateByXAxisWithCI(resultsColumns, resultsRows, plotXAxis, plotYAxis);
  } else if (plotXAxis && plotYAxis) {
    plotData = aggregateByTime(resultsColumns, resultsRows, plotYAxis);
  }

  return (
    <div className="space-y-4">
      {/* Run New Batch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Run New Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Uses the shared parameters, ranges, seeds, and time samples configured in the Parameters panel.
          </p>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Parameter ranges</Label>
            {config.parameterRanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ranges defined.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {config.parameterRanges.map((range) => (
                  <li key={range.path} className="flex items-center gap-2">
                    <span className="font-mono text-xs">{range.path}</span>
                    <span className="text-muted-foreground">
                      {range.min} → {range.max} ({range.steps} steps)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <p>Time samples: {config.timeSamples.start}h → {config.timeSamples.end}h (step {config.timeSamples.step}h)</p>
            <p>Seeds per configuration: {config.seedsPerConfig}</p>
            <p className="text-muted-foreground">
              Total: {totalRuns} run{totalRuns !== 1 ? 's' : ''} × {timeSamples.length} time point{timeSamples.length !== 1 ? 's' : ''} = {totalSnapshots} snapshot{totalSnapshots !== 1 ? 's' : ''}
            </p>
          </div>

          {WorkerPool.isSupported() && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={useParallel}
                  onChange={(e) => setUseParallel(e.target.checked)}
                  disabled={isRunning}
                  className="rounded"
                />
                Parallel execution
              </label>
              {useParallel && (
                <span className="text-xs text-muted-foreground">
                  ({workerCount} workers)
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {isRunning ? (
              <Button onClick={handleStopBatch} variant="destructive" size="sm">
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleRunBatch}
                size="sm"
                disabled={config.parameterRanges.length === 0 && config.seedsPerConfig <= 1}
              >
                <Play className="h-4 w-4 mr-1" />
                Run Batch
              </Button>
            )}
          </div>

          {isRunning && progress && (
            <div className="space-y-1">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {progress.current_run} / {progress.total_runs} runs
                {timeRemaining && ` · ~${timeRemaining} remaining`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load/Save Batch Snapshots */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleLoadBatch}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRunning}
            >
              <Upload className="h-4 w-4 mr-1" />
              Load Batch CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveBatch}
              disabled={!batchData || isRunning}
            >
              <Download className="h-4 w-4 mr-1" />
              Save Batch CSV
            </Button>
            {batchData && (
              <span className="text-sm text-muted-foreground ml-2">
                {batchData.snapshots.length} snapshots loaded
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compute Statistics */}
      {batchData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compute Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All available statistics will be computed for all cell groups.
            </p>

            <div className="flex gap-4 items-center">
              <Label className="text-sm">Output:</Label>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="outputMode"
                  checked={outputMode === 'time_series'}
                  onChange={() => setOutputMode('time_series')}
                  disabled={isRunning}
                />
                Time Series
              </label>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="outputMode"
                  checked={outputMode === 'terminal'}
                  onChange={() => setOutputMode('terminal')}
                  disabled={isRunning}
                />
                Terminal Only
              </label>
            </div>

            <Button
              onClick={handleComputeStats}
              size="sm"
              disabled={!currentModel || isRunning}
            >
              Compute
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {resultsRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">Results</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportStats}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportFullCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Export Full CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <ResultsTable columns={resultsColumns} rows={resultsRows} />
              <p className="text-xs text-muted-foreground mt-2">
                {resultsRows.length} row{resultsRows.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Separator />

            {/* Plot Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Visualization</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="plot-type" className="text-sm">
                    Plot Type
                  </Label>
                  <select
                    id="plot-type"
                    value={plotType}
                    onChange={(e) => setPlotType(e.target.value as 'line_ci' | 'histogram')}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="line_ci">Line + CI</option>
                    <option value="histogram">Histogram</option>
                  </select>
                </div>

                {plotType !== 'histogram' && (
                  <div className="space-y-1">
                    <Label htmlFor="plot-x-axis" className="text-sm">
                      X-Axis
                    </Label>
                    <select
                      id="plot-x-axis"
                      value={plotXAxis}
                      onChange={(e) => setPlotXAxis(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select x-axis...</option>
                      {availableXAxisOptions.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="plot-y-axis" className="text-sm">
                    Y-Axis (Statistic)
                  </Label>
                  <select
                    id="plot-y-axis"
                    value={plotYAxis}
                    onChange={(e) => setPlotYAxis(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Select statistic...</option>
                    {availableBaseStats.map((stat) => (
                      <option key={stat} value={stat}>
                        {stat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Plot display */}
              {plotType === 'histogram' && plotYAxis && histogramData.length > 0 && (
                <div className="mt-4 border rounded-md p-4 bg-muted/30">
                  <BatchPlot
                    data={plotData}
                    dataWithCI={plotDataWithCI}
                    histogramData={histogramData}
                    xAxisLabel="Cell Group"
                    yAxisLabel={plotYAxis}
                    plotType={plotType}
                    width={640}
                    height={400}
                  />
                </div>
              )}

              {plotType === 'line_ci' && plotXAxis && plotYAxis && plotDataWithCI.length > 0 && (
                <div className="mt-4 border rounded-md p-4 bg-muted/30">
                  <BatchPlot
                    data={plotData}
                    dataWithCI={plotDataWithCI}
                    histogramData={histogramData}
                    xAxisLabel={plotXAxis === 'time_h' ? 'Time (h)' : plotXAxis}
                    yAxisLabel={plotYAxis}
                    plotType={plotType}
                    width={640}
                    height={400}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
