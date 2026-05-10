import { SimulationEngine } from '../simulation/engine';
import { setNestedValue } from '../params';
import { modelRegistry } from '../registry';
import { OffscreenRenderer } from '../export/offscreenRenderer';
import { createVideoEncoder, type IVideoEncoder, type VideoFormat } from '../export/videoEncoder';
import { ZipBuilder } from '../export/zipBuilder';
import { stringify as stringifyToml } from '@iarna/toml';
import { batchSnapshotsToCSV, statisticsToCSV } from './serialization';
import type { BaseSimulationParams } from '../registry';
import type { BatchConfig, BatchExportDialogConfig, BatchSnapshot } from './types';
import { generateParameterConfigs, getTimeSamples } from './types';
import { parseExportTimeSpec, resolveExportCountLimit, resolveExportFrameRange } from './exportConfig';

export interface BatchExportRunnerConfig {
  batchConfig: BatchConfig;
  baseParams: BaseSimulationParams;
  exportConfig: BatchExportDialogConfig;
  modelName?: string;
  isDark?: boolean;
  renderOptions?: Record<string, boolean>;
}

export interface BatchExportProgress {
  phase: 'initializing' | 'simulating' | 'encoding' | 'packaging';
  currentRun: number;
  totalRuns: number;
  runProgress: number;
  overallPercent: number;
  currentConfig?: Record<string, number>;
  message?: string;
}

export async function runBatchExport(
  config: BatchExportRunnerConfig,
  callbacks: {
    onProgress?: (progress: BatchExportProgress) => void;
  },
  abortSignal?: AbortSignal
): Promise<Blob> {
  const modelName = config.modelName ?? config.baseParams.metadata.model;
  const model = modelRegistry.get(modelName);
  if (!model) throw new Error(`Model "${modelName}" not found in registry`);

  const paramConfigs = generateParameterConfigs(
    config.batchConfig.parameter_ranges,
    config.batchConfig.sampling_mode,
    config.batchConfig.random_sample_count
  );

  const { exportConfig } = config;
  const totalSeeds = config.batchConfig.seeds_per_config;

  const needsScreenshots = exportConfig.screenshots.enabled;
  const needsVideos = exportConfig.videos.enabled;
  const needsCsvSnapshots = exportConfig.data.csvSnapshots;
  const needsStatistics = exportConfig.data.statisticsCsv;

  const screenshotMaxSamples = resolveExportCountLimit(
    exportConfig.screenshots.maxSamples,
    paramConfigs.length,
    'Screenshot max samples'
  );
  const screenshotSeedsPerSample = resolveExportCountLimit(
    exportConfig.screenshots.seedsPerSample,
    totalSeeds,
    'Screenshot seeds per sample'
  );
  const videoMaxSamples = resolveExportCountLimit(
    exportConfig.videos.maxSamples,
    paramConfigs.length,
    'Video max samples'
  );
  const videoSeedsPerSample = resolveExportCountLimit(
    exportConfig.videos.seedsPerSample,
    totalSeeds,
    'Video seeds per sample'
  );
  const statisticsMaxSamples = resolveExportCountLimit(
    exportConfig.data.statisticsMaxSamples,
    paramConfigs.length,
    'Statistics max samples'
  );
  const statisticsSeedsPerSample = resolveExportCountLimit(
    exportConfig.data.statisticsSeedsPerSample,
    totalSeeds,
    'Statistics seeds per sample'
  );

  const totalRuns = paramConfigs.length * totalSeeds;

  const zipBuilder = new ZipBuilder();

  const masterConfigToml = stringifyToml(config.batchConfig as any);
  zipBuilder.addFile('config.toml', masterConfigToml);

  callbacks.onProgress?.({
    phase: 'initializing',
    currentRun: 0,
    totalRuns,
    runProgress: 0,
    overallPercent: 0,
    message: 'Preparing export...',
  });

  const csvSnapshots: BatchSnapshot[] = [];
  const statisticsSnapshots: BatchSnapshot[] = [];

  // Create the renderer lazily per run because parameter samples can change viewport bounds.
  let renderer: OffscreenRenderer | null = null;

  for (let configIndex = 0; configIndex < paramConfigs.length; configIndex++) {
    const paramOverrides = paramConfigs[configIndex];

    for (let seedIndex = 0; seedIndex < totalSeeds; seedIndex++) {
      if (abortSignal?.aborted) {
        renderer?.destroy();
        throw new Error('Export cancelled by user');
      }

      const runIndex = configIndex * totalSeeds + seedIndex;
      const runNumber = runIndex + 1;
      const seed = config.baseParams.general.random_seed + runIndex;

      const doScreenshots = needsScreenshots && configIndex < screenshotMaxSamples && seedIndex < screenshotSeedsPerSample;
      const doVideo = needsVideos && configIndex < videoMaxSamples && seedIndex < videoSeedsPerSample;
      const doStatistics = needsStatistics && configIndex < statisticsMaxSamples && seedIndex < statisticsSeedsPerSample;
      const doRender = doScreenshots || doVideo;
      const runRenderResolution = doVideo
        ? exportConfig.videos.resolution
        : (doScreenshots ? exportConfig.screenshots.resolution : 0);

      callbacks.onProgress?.({
        phase: 'simulating',
        currentRun: runNumber,
        totalRuns,
        runProgress: 0,
        overallPercent: (runIndex / totalRuns) * 100,
        currentConfig: paramOverrides,
        message: `Run ${runNumber}/${totalRuns}${doRender ? ' (with media)' : ''}`,
      });

      const params = structuredClone(config.baseParams);
      for (const [path, value] of Object.entries(paramOverrides)) {
        setNestedValue(params, path, value);
      }
      params.general.random_seed = seed;

      const runDir = `run_${runNumber.toString().padStart(3, '0')}`;

      if (exportConfig.data.tomlParams) {
        const paramsToml = stringifyToml(params as any);
        zipBuilder.addFile(`${runDir}/params.toml`, paramsToml);
      }

      if (doRender && runRenderResolution > 0) {
        renderer?.destroy();
        renderer = new OffscreenRenderer({
          width: runRenderResolution,
          height: runRenderResolution,
          isDark: config.isDark ?? false,
          preferHtmlCanvas: doVideo,
        });
        await renderer.init(model, params);
        if (config.renderOptions) {
          renderer.setRenderOptions(config.renderOptions);
        }
      }

      const engine = new SimulationEngine({ model, params });
      const endTime = (params as any).general.t_end ?? 100;

      const screenshotTimes = doScreenshots
        ? parseExportTimeSpec(exportConfig.screenshots.timeSpec, endTime)
        : [];
      const csvTimes = needsCsvSnapshots
        ? getTimeSamples(config.batchConfig.time_samples).filter(time => time <= endTime)
        : [];
      const statisticsTimes = doStatistics
        ? parseExportTimeSpec(exportConfig.data.statisticsTimeSpec, endTime)
        : [];

      // Video encoder
      let videoEncoder: IVideoEncoder | null = null;
      let videoFrameRange: { start: number; end: number | null } | null = null;
      let encodedVideoFrameCount = 0;
      const frameDt = 1000 / (exportConfig.videos.frameRate || 30);
      if (doVideo) {
        videoFrameRange = resolveExportFrameRange(
          exportConfig.videos.frameStart,
          exportConfig.videos.frameEnd,
          estimateFinalFrame(endTime, params),
          'Video frames'
        );
        videoEncoder = createVideoEncoder(exportConfig.videos.format as VideoFormat, {
          width: exportConfig.videos.resolution,
          height: exportConfig.videos.resolution,
          frameRate: exportConfig.videos.frameRate,
        });
        await videoEncoder.init();
      }

      // Capture initial state
      const state0 = engine.getState();
      const t0 = getStateTime(state0);
      let nextCsvIndex = 0;
      let nextStatisticsIndex = 0;
      let nextScreenshotIndex = 0;

      while (nextCsvIndex < csvTimes.length && isDue(t0, csvTimes[nextCsvIndex])) {
        csvSnapshots.push(createBatchSnapshot(model, state0, runNumber, seed, csvTimes[nextCsvIndex], paramOverrides));
        nextCsvIndex++;
      }

      while (nextStatisticsIndex < statisticsTimes.length && isDue(t0, statisticsTimes[nextStatisticsIndex])) {
        statisticsSnapshots.push(createBatchSnapshot(model, state0, runNumber, seed, statisticsTimes[nextStatisticsIndex], paramOverrides));
        nextStatisticsIndex++;
      }

      if (doRender && renderer) {
        renderer.render(state0);

        while (nextScreenshotIndex < screenshotTimes.length && isDue(t0, screenshotTimes[nextScreenshotIndex])) {
          const screenshot = await renderer.getScreenshot();
          zipBuilder.addFile(`${runDir}/screenshots/${formatScreenshotFilename(screenshotTimes[nextScreenshotIndex])}`, screenshot);
          nextScreenshotIndex++;
        }

        if (videoEncoder && shouldCaptureVideoFrame(getStateFrameIndex(state0, 0), videoFrameRange)) {
          const canvas = renderer.getCanvas();
          await videoEncoder.addFrame(canvas, encodedVideoFrameCount * frameDt);
          encodedVideoFrameCount++;
        }
      }

      // Simulation loop
      let yieldCounter = 0;

      while (!engine.isComplete()) {
        if (abortSignal?.aborted) {
          renderer?.destroy();
          throw new Error('Export cancelled by user');
        }

        engine.step();
        const state = engine.getState();
        const t = getStateTime(state);

        while (nextCsvIndex < csvTimes.length && isDue(t, csvTimes[nextCsvIndex])) {
          csvSnapshots.push(createBatchSnapshot(model, state, runNumber, seed, csvTimes[nextCsvIndex], paramOverrides));
          nextCsvIndex++;
        }

        while (nextStatisticsIndex < statisticsTimes.length && isDue(t, statisticsTimes[nextStatisticsIndex])) {
          statisticsSnapshots.push(createBatchSnapshot(model, state, runNumber, seed, statisticsTimes[nextStatisticsIndex], paramOverrides));
          nextStatisticsIndex++;
        }

        if (doRender && renderer) {
          const screenshotDue = nextScreenshotIndex < screenshotTimes.length && isDue(t, screenshotTimes[nextScreenshotIndex]);
          const videoDue = !!videoEncoder && shouldCaptureVideoFrame(getStateFrameIndex(state, yieldCounter + 1), videoFrameRange);
          const needsRenderNow = screenshotDue || videoDue;

          if (needsRenderNow) {
            renderer.render(state);

            // Screenshots
            while (nextScreenshotIndex < screenshotTimes.length && isDue(t, screenshotTimes[nextScreenshotIndex])) {
              const screenshotTime = screenshotTimes[nextScreenshotIndex];
              const screenshot = await renderer.getScreenshot();
              zipBuilder.addFile(
                `${runDir}/screenshots/${formatScreenshotFilename(screenshotTime)}`,
                screenshot
              );
              nextScreenshotIndex++;
            }

            // Video frames
            if (videoEncoder && videoDue) {
              const canvas = renderer.getCanvas();
              const timestampMs = encodedVideoFrameCount * frameDt;
              await videoEncoder.addFrame(canvas, timestampMs);
              encodedVideoFrameCount++;
            }
          }
        }

        // Progress + yield to UI
        yieldCounter++;
        if (yieldCounter % 50 === 0) {
          const progress = Math.min((t / endTime) * 100, 100);
          callbacks.onProgress?.({
            phase: 'simulating',
            currentRun: runNumber,
            totalRuns,
            runProgress: progress,
            overallPercent: ((runIndex + progress / 100) / totalRuns) * 100,
            currentConfig: paramOverrides,
            message: `Run ${runNumber}/${totalRuns} - t=${t.toFixed(1)}h`,
          });
          await yieldToUI();
        }
      }

      const finalState = engine.getState();
      const finalTime = getStateTime(finalState);

      while (nextCsvIndex < csvTimes.length && isDue(finalTime, csvTimes[nextCsvIndex])) {
        csvSnapshots.push(createBatchSnapshot(model, finalState, runNumber, seed, csvTimes[nextCsvIndex], paramOverrides));
        nextCsvIndex++;
      }

      while (nextStatisticsIndex < statisticsTimes.length && isDue(finalTime, statisticsTimes[nextStatisticsIndex])) {
        statisticsSnapshots.push(createBatchSnapshot(model, finalState, runNumber, seed, statisticsTimes[nextStatisticsIndex], paramOverrides));
        nextStatisticsIndex++;
      }

      // Capture remaining terminal media if the final step landed beyond a requested time.
      if (doRender && renderer && nextScreenshotIndex < screenshotTimes.length) {
        const state = finalState;
        renderer.render(state);

        while (nextScreenshotIndex < screenshotTimes.length) {
          const screenshotTime = screenshotTimes[nextScreenshotIndex];
          const screenshot = await renderer.getScreenshot();
          zipBuilder.addFile(
            `${runDir}/screenshots/${formatScreenshotFilename(screenshotTime)}`,
            screenshot
          );
          nextScreenshotIndex++;
        }
      }

      // Finalize video
      if (videoEncoder) {
        if (videoEncoder.getFrameCount() === 0) {
          throw new Error(
            `Video frame range ${formatFrameRange(videoFrameRange)} did not overlap run ${runNumber} frames 0-${getStateFrameIndex(finalState, 0)}.`
          );
        }

        callbacks.onProgress?.({
          phase: 'encoding',
          currentRun: runNumber,
          totalRuns,
          runProgress: 100,
          overallPercent: ((runIndex + 0.5) / totalRuns) * 100,
          message: `Encoding video for run ${runNumber}...`,
        });

        const ext = exportConfig.videos.format === 'webm' ? 'webm' : 'mp4';
        const movieBlob = await videoEncoder.finish();
        zipBuilder.addFile(`${runDir}/movie.${ext}`, movieBlob);
      }
    }
  }

  // Clean up renderer
  renderer?.destroy();

  // Add CSV data
  if (exportConfig.data.csvSnapshots && csvSnapshots.length > 0) {
    const csv = batchSnapshotsToCSV(csvSnapshots);
    zipBuilder.addFile('batch_snapshots.csv', csv);
  }

  // Add statistics CSV
  if (exportConfig.data.statisticsCsv && statisticsSnapshots.length > 0) {
    const statsData = computeAllStatistics(model, config.baseParams, statisticsSnapshots);
    if (statsData) {
      const csv = statisticsToCSV(statsData.columns, statsData.rows);
      zipBuilder.addFile('statistics.csv', csv);
    }
  }

  // Package
  callbacks.onProgress?.({
    phase: 'packaging',
    currentRun: totalRuns,
    totalRuns,
    runProgress: 100,
    overallPercent: 100,
    message: 'Creating ZIP file...',
  });

  return await zipBuilder.generate();
}

function isDue(currentTime: number, targetTime: number): boolean {
  return currentTime + 1e-9 >= targetTime;
}

function getStateTime(state: unknown): number {
  const value = (state as { t?: unknown }).t;
  return typeof value === 'number' ? value : 0;
}

function getStateFrameIndex(state: unknown, fallback: number): number {
  const value = (state as { step_count?: unknown }).step_count;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function estimateFinalFrame(endTime: number, params: BaseSimulationParams): number | null {
  const dt = (params as { general?: { dt?: unknown } }).general?.dt;
  if (
    typeof dt !== 'number' ||
    !Number.isFinite(dt) ||
    dt <= 0 ||
    !Number.isFinite(endTime) ||
    endTime < 0
  ) {
    return null;
  }

  return Math.ceil(endTime / dt);
}

function shouldCaptureVideoFrame(
  frameIndex: number,
  frameRange: { start: number; end: number | null } | null
): boolean {
  if (!frameRange) return false;
  return frameIndex >= frameRange.start && (frameRange.end === null || frameIndex <= frameRange.end);
}

function formatFrameRange(frameRange: { start: number; end: number | null } | null): string {
  if (!frameRange) return 'unknown';
  return `${frameRange.start}-${frameRange.end ?? 'end'}`;
}

function createBatchSnapshot(
  model: { getSnapshot(state: unknown): Record<string, any>[] },
  state: unknown,
  runIndex: number,
  seed: number,
  time: number,
  sampledParams: Record<string, number>
): BatchSnapshot {
  return {
    run_index: runIndex,
    seed,
    time_h: time,
    sampled_params: sampledParams,
    data: model.getSnapshot(state),
  };
}

function formatScreenshotFilename(time: number): string {
  return `t_${time.toFixed(1).padStart(7, '0')}h.png`;
}

function yieldToUI(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function computeAllStatistics(
  model: any,
  baseParams: BaseSimulationParams,
  snapshots: BatchSnapshot[]
): { columns: string[]; rows: (string | number)[][] } | null {
  if (!model.computeStats || !model.loadSnapshot) return null;

  const paramPaths = new Set<string>();
  for (const s of snapshots) {
    for (const path of Object.keys(s.sampled_params)) {
      paramPaths.add(path);
    }
  }
  const sortedPaths = Array.from(paramPaths).sort();

  // Compute stats for first snapshot to discover stat names
  const firstParams = structuredClone(baseParams);
  for (const [path, value] of Object.entries(snapshots[0].sampled_params)) {
    setNestedValue(firstParams, path, value);
  }
  firstParams.general.random_seed = snapshots[0].seed;
  const firstState = model.loadSnapshot(snapshots[0].data, firstParams);
  const firstStats = model.computeStats(firstState, firstParams);
  const statNames = Object.keys(firstStats).sort();

  const columns = [...sortedPaths, 'run_index', 'seed', 'time_h', ...statNames];
  const rows: (string | number)[][] = [];

  for (const snapshot of snapshots) {
    const snapshotParams = structuredClone(baseParams);
    for (const [path, value] of Object.entries(snapshot.sampled_params)) {
      setNestedValue(snapshotParams, path, value);
    }
    snapshotParams.general.random_seed = snapshot.seed;

    const state = model.loadSnapshot(snapshot.data, snapshotParams);
    const stats = model.computeStats(state, snapshotParams);

    rows.push([
      ...sortedPaths.map(p => snapshot.sampled_params[p] ?? ''),
      snapshot.run_index,
      snapshot.seed,
      snapshot.time_h,
      ...statNames.map(name => stats[name] ?? 0),
    ]);
  }

  return { columns, rows };
}
