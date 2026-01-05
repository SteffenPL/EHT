/**
 * Batch simulations tab.
 */
import { useState, useRef, useCallback } from 'react';
import { Play, Upload, Download, FileSpreadsheet, Square } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { ParameterRangeList } from './ParameterRangeList';
import { TimeSampleConfig } from './TimeSampleConfig';
import { StatisticSelector } from './StatisticSelector';
import { ResultsTable } from './ResultsTable';
import type { SimulationParams } from '@/core/types';
import type {
  ParameterRange,
  TimeSampleConfig as TimeSampleConfigType,
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
  computeStatistics,
  getTimeSamples,
} from '@/core/batch';

export interface BatchTabProps {
  baseParams: SimulationParams;
}

export function BatchTab({ baseParams }: BatchTabProps) {
  // Batch configuration
  const [paramRanges, setParamRanges] = useState<ParameterRange[]>([]);
  const [timeSampleConfig, setTimeSampleConfig] = useState<TimeSampleConfigType>({
    start: 0,
    end: 48,
    step: 12,
  });
  const [seedsPerConfig, setSeedsPerConfig] = useState(1);

  // Batch data and progress
  const [batchData, setBatchData] = useState<BatchData | null>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);

  // Statistics
  const [selectedStats, setSelectedStats] = useState<string[]>([
    'n_cells_total',
    'n_cells_emt',
    'avg_y_all',
    'avg_y_emt',
  ]);
  const [outputMode, setOutputMode] = useState<'time_series' | 'terminal'>('time_series');
  const [resultsColumns, setResultsColumns] = useState<string[]>([]);
  const [resultsRows, setResultsRows] = useState<(string | number)[][]>([]);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate total runs
  const totalRuns = computeTotalRuns(paramRanges, seedsPerConfig);
  const timeSamples = getTimeSamples(timeSampleConfig);
  const totalSnapshots = totalRuns * timeSamples.length;

  // Run batch
  const handleRunBatch = useCallback(() => {
    setIsRunning(true);
    abortRef.current = false;

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const data = runBatch(
          baseParams,
          {
            parameter_ranges: paramRanges,
            time_samples: timeSampleConfig,
            seeds_per_config: seedsPerConfig,
            sampling_mode: 'grid',
          },
          {
            onProgress: (p) => {
              if (!abortRef.current) {
                setProgress(p);
              }
            },
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
      }
    }, 50);
  }, [baseParams, paramRanges, timeSampleConfig, seedsPerConfig]);

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

  // Compute statistics
  const handleComputeStats = () => {
    if (!batchData || selectedStats.length === 0) return;

    // Get parameter paths
    const paramPaths = new Set<string>();
    for (const s of batchData.snapshots) {
      for (const path of Object.keys(s.sampled_params)) {
        paramPaths.add(path);
      }
    }
    const sortedPaths = Array.from(paramPaths).sort();

    // Build columns
    const columns = [
      ...sortedPaths,
      'seed',
      'time_h',
      ...selectedStats,
    ];

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

    // Build rows
    const rows: (string | number)[][] = [];
    for (const snapshot of snapshots) {
      const stats = computeStatistics(snapshot, selectedStats);
      const row: (string | number)[] = [
        ...sortedPaths.map((p) => snapshot.sampled_params[p] ?? ''),
        snapshot.seed,
        snapshot.time_h,
        ...selectedStats.map((id) => stats[id] ?? 0),
      ];
      rows.push(row);
    }

    setResultsColumns(columns);
    setResultsRows(rows);
  };

  // Export statistics CSV
  const handleExportStats = () => {
    if (resultsColumns.length === 0 || resultsRows.length === 0) return;
    const csv = statisticsToCSV(resultsColumns, resultsRows);
    downloadCSV(csv, 'batch_statistics.csv');
  };

  const progressPercent = progress
    ? (progress.current_run / progress.total_runs) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Run New Batch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Run New Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Base parameters from Single Simulation tab will be used.
          </p>

          <ParameterRangeList
            ranges={paramRanges}
            onChange={setParamRanges}
            disabled={isRunning}
          />

          <Separator />

          <TimeSampleConfig
            config={timeSampleConfig}
            onChange={setTimeSampleConfig}
            disabled={isRunning}
          />

          <div className="space-y-1">
            <Label htmlFor="seeds" className="text-sm">Seeds per configuration</Label>
            <Input
              id="seeds"
              type="number"
              value={seedsPerConfig}
              onChange={(e) => setSeedsPerConfig(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isRunning}
              className="w-24 h-8"
              min={1}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Total: {totalRuns} run{totalRuns !== 1 ? 's' : ''} × {timeSamples.length} time point{timeSamples.length !== 1 ? 's' : ''} = {totalSnapshots} snapshot{totalSnapshots !== 1 ? 's' : ''}
          </p>

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
                disabled={paramRanges.length === 0 && seedsPerConfig <= 1}
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
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load/Save Batch */}
      <Card>
        <CardContent className="pt-4">
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
            <StatisticSelector
              selected={selectedStats}
              onChange={setSelectedStats}
              disabled={isRunning}
            />

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
              disabled={selectedStats.length === 0 || isRunning}
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
            <Button variant="outline" size="sm" onClick={handleExportStats}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ResultsTable columns={resultsColumns} rows={resultsRows} />
            <p className="text-xs text-muted-foreground mt-2">
              {resultsRows.length} row{resultsRows.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
