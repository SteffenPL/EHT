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

  const screenshotMaxConfigs = exportConfig.screenshots.maxParamConfigs ?? paramConfigs.length;
  const screenshotMaxSeeds = exportConfig.screenshots.maxSeeds ?? totalSeeds;
  const videoMaxConfigs = exportConfig.videos.maxParamConfigs ?? paramConfigs.length;
  const videoMaxSeeds = exportConfig.videos.maxSeeds ?? totalSeeds;

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

  const allSnapshots: BatchSnapshot[] = [];
  let runIndex = 0;

  // Determine the max resolution needed for rendering
  const renderResolution = Math.max(
    needsScreenshots ? exportConfig.screenshots.resolution : 0,
    needsVideos ? exportConfig.videos.resolution : 0
  );

  // Create offscreen renderer if we need screenshots or videos
  let renderer: OffscreenRenderer | null = null;
  if ((needsScreenshots || needsVideos) && renderResolution > 0) {
    renderer = new OffscreenRenderer({
      width: renderResolution,
      height: renderResolution,
      isDark: config.isDark ?? false,
    });
    await renderer.init(model, config.baseParams);
    if (config.renderOptions) {
      renderer.setRenderOptions(config.renderOptions);
    }
  }

  for (let configIndex = 0; configIndex < paramConfigs.length; configIndex++) {
    const paramOverrides = paramConfigs[configIndex];

    for (let seedIndex = 0; seedIndex < totalSeeds; seedIndex++) {
      if (abortSignal?.aborted) {
        renderer?.destroy();
        throw new Error('Export cancelled by user');
      }

      runIndex++;
      const seed = seedIndex + 1;

      const doScreenshots = needsScreenshots && configIndex < screenshotMaxConfigs && seedIndex < screenshotMaxSeeds;
      const doVideo = needsVideos && configIndex < videoMaxConfigs && seedIndex < videoMaxSeeds;
      const doRender = doScreenshots || doVideo;

      callbacks.onProgress?.({
        phase: 'simulating',
        currentRun: runIndex,
        totalRuns,
        runProgress: 0,
        overallPercent: ((runIndex - 1) / totalRuns) * 100,
        currentConfig: paramOverrides,
        message: `Run ${runIndex}/${totalRuns}${doRender ? ' (with rendering)' : ''}`,
      });

      const params = structuredClone(config.baseParams);
      for (const [path, value] of Object.entries(paramOverrides)) {
        setNestedValue(params, path, value);
      }
      params.general.random_seed = seed;

      const runDir = `run_${runIndex.toString().padStart(3, '0')}`;

      if (exportConfig.data.tomlParams) {
        const paramsToml = stringifyToml(params as any);
        zipBuilder.addFile(`${runDir}/params.toml`, paramsToml);
      }

      // Re-init renderer with this run's params for correct viewport
      if (doRender && renderer) {
        renderer.destroy();
        renderer = new OffscreenRenderer({
          width: renderResolution,
          height: renderResolution,
          isDark: config.isDark ?? false,
        });
        await renderer.init(model, params);
        if (config.renderOptions) {
          renderer.setRenderOptions(config.renderOptions);
        }
      }

      const engine = new SimulationEngine({ model, params });

      // Build screenshot time set
      const screenshotTimes = new Set<number>();
      if (doScreenshots) {
        const endTime = (params as any).general.t_end ?? 100;
        if (exportConfig.screenshots.includeInitial) {
          screenshotTimes.add(0);
        }
        const interval = exportConfig.screenshots.intervalHours;
        if (interval > 0) {
          for (let t = interval; t < endTime; t += interval) {
            screenshotTimes.add(t);
          }
        }
        if (exportConfig.screenshots.includeTerminal) {
          screenshotTimes.add(endTime);
        }
      }

      // Video encoder
      let videoEncoder: IVideoEncoder | null = null;
      if (doVideo) {
        videoEncoder = createVideoEncoder(exportConfig.videos.format as VideoFormat, {
          width: exportConfig.videos.resolution,
          height: exportConfig.videos.resolution,
          frameRate: exportConfig.videos.frameRate,
        });
        await videoEncoder.init();
      }

      // Capture initial state
      const state0 = engine.getState();
      const t0 = (state0 as any).t ?? 0;

      if (doRender && renderer) {
        renderer.render(state0);

        if (doScreenshots && screenshotTimes.has(0)) {
          const screenshot = await renderer.getScreenshot();
          zipBuilder.addFile(`${runDir}/screenshots/t_0000.0h.png`, screenshot);
          screenshotTimes.delete(0);
        }

        if (videoEncoder) {
          const canvas = renderer.getCanvas();
          if (canvas instanceof HTMLCanvasElement) {
            await videoEncoder.addFrame(canvas, 0);
          }
        }
      }

      // Collect snapshots for CSV
      const timeSamples = getTimeSamples(config.batchConfig.time_samples);
      let nextSnapshotIndex = 0;
      if (timeSamples.length > 0 && timeSamples[0] <= t0) {
        allSnapshots.push({
          run_index: runIndex,
          seed,
          time_h: t0,
          sampled_params: paramOverrides,
          data: model.getSnapshot(state0),
        });
        nextSnapshotIndex = 1;
      }

      // Simulation loop
      const endTime = (params as any).general.t_end ?? 100;
      let frameCount = 1;
      const frameDt = 1000 / (exportConfig.videos.frameRate || 30);
      let yieldCounter = 0;

      while (!engine.isComplete()) {
        if (abortSignal?.aborted) {
          renderer?.destroy();
          throw new Error('Export cancelled by user');
        }

        engine.step();
        const state = engine.getState();
        const t = (state as any).t ?? 0;

        // Collect batch snapshots
        while (nextSnapshotIndex < timeSamples.length && t >= timeSamples[nextSnapshotIndex]) {
          allSnapshots.push({
            run_index: runIndex,
            seed,
            time_h: timeSamples[nextSnapshotIndex],
            sampled_params: paramOverrides,
            data: model.getSnapshot(state),
          });
          nextSnapshotIndex++;
        }

        if (doRender && renderer) {
          // Render for screenshots/video at needed times
          const needsRenderNow = doVideo || (doScreenshots && hasNearbyTime(t, screenshotTimes, endTime));

          if (needsRenderNow) {
            renderer.render(state);

            // Screenshots
            if (doScreenshots) {
              for (const st of screenshotTimes) {
                if (t >= st) {
                  const screenshot = await renderer.getScreenshot();
                  zipBuilder.addFile(
                    `${runDir}/screenshots/t_${st.toFixed(1).padStart(7, '0')}h.png`,
                    screenshot
                  );
                  screenshotTimes.delete(st);
                }
              }
            }

            // Video frames
            if (videoEncoder && t * 1000 >= frameCount * frameDt) {
              const canvas = renderer.getCanvas();
              if (canvas instanceof HTMLCanvasElement) {
                await videoEncoder.addFrame(canvas, t * 1000);
              }
              frameCount++;
            }
          }
        }

        // Progress + yield to UI
        yieldCounter++;
        if (yieldCounter % 50 === 0) {
          const progress = Math.min((t / endTime) * 100, 100);
          callbacks.onProgress?.({
            phase: 'simulating',
            currentRun: runIndex,
            totalRuns,
            runProgress: progress,
            overallPercent: ((runIndex - 1 + progress / 100) / totalRuns) * 100,
            currentConfig: paramOverrides,
            message: `Run ${runIndex}/${totalRuns} — t=${t.toFixed(1)}h`,
          });
          await yieldToUI();
        }
      }

      // Capture terminal screenshot if not yet captured
      if (doScreenshots && screenshotTimes.size > 0 && renderer) {
        const state = engine.getState();
        renderer.render(state);
        for (const st of screenshotTimes) {
          const screenshot = await renderer.getScreenshot();
          zipBuilder.addFile(
            `${runDir}/screenshots/t_${st.toFixed(1).padStart(7, '0')}h.png`,
            screenshot
          );
        }
      }

      // Finalize video
      if (videoEncoder) {
        callbacks.onProgress?.({
          phase: 'encoding',
          currentRun: runIndex,
          totalRuns,
          runProgress: 100,
          overallPercent: ((runIndex - 0.5) / totalRuns) * 100,
          message: `Encoding video for run ${runIndex}...`,
        });

        const ext = exportConfig.videos.format === 'webm' ? 'webm' : 'mp4';
        const movieBlob = await videoEncoder.finish();
        zipBuilder.addFile(`${runDir}/movie.${ext}`, movieBlob);
      }

      // Collect terminal snapshot if not yet
      if (nextSnapshotIndex < timeSamples.length) {
        const state = engine.getState();
        for (let i = nextSnapshotIndex; i < timeSamples.length; i++) {
          allSnapshots.push({
            run_index: runIndex,
            seed,
            time_h: timeSamples[i],
            sampled_params: paramOverrides,
            data: model.getSnapshot(state),
          });
        }
      }
    }
  }

  // Clean up renderer
  renderer?.destroy();

  // Add CSV data
  if (exportConfig.data.csvSnapshots && allSnapshots.length > 0) {
    const csv = batchSnapshotsToCSV(allSnapshots);
    zipBuilder.addFile('batch_snapshots.csv', csv);
  }

  // Add statistics CSV
  if (exportConfig.data.statisticsCsv && allSnapshots.length > 0) {
    const statsData = computeAllStatistics(model, config.baseParams, allSnapshots);
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

function hasNearbyTime(t: number, times: Set<number>, _endTime: number): boolean {
  for (const st of times) {
    if (t >= st) return true;
  }
  return false;
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
