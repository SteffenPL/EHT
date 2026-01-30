/**
 * Batch export runner with rendering support.
 * Runs simulations on the main thread with offscreen rendering to capture
 * screenshots and movies for each parameter configuration.
 */

import { SimulationEngine } from '../simulation/engine';
import { setNestedValue } from '../params';
import { modelRegistry } from '../registry';
import { OffscreenRenderer } from '../export/offscreenRenderer';
import { MP4VideoEncoder } from '../export/videoEncoder';
import { ZipBuilder } from '../export/zipBuilder';
import { stringify as stringifyToml } from '@iarna/toml';
import type { BaseSimulationParams } from '../registry';
import type { BatchConfig } from './types';
import { generateParameterConfigs, getTimeSamples } from './types';

export interface BatchExportConfig {
  batchConfig: BatchConfig;
  baseParams: BaseSimulationParams;
  modelName?: string; // If not specified, uses baseParams.metadata.model
  exportMovie: boolean;
  resolution: { width: number; height: number };
  frameRate: number;
  isDark?: boolean;
  renderOptions?: Record<string, boolean>;
}

export interface BatchExportProgress {
  phase: 'initializing' | 'simulating' | 'encoding' | 'packaging';
  currentRun: number;
  totalRuns: number;
  runProgress: number; // 0-100 within current run
  overallPercent: number;
  currentConfig?: Record<string, number>;
}

/**
 * Run a batch export with rendering and packaging as ZIP.
 * Runs simulations sequentially on the main thread with rendering.
 */
export async function runBatchExport(
  config: BatchExportConfig,
  callbacks: {
    onProgress?: (progress: BatchExportProgress) => void;
  },
  abortSignal?: AbortSignal
): Promise<Blob> {
  // Get model
  const modelName = config.modelName ?? config.baseParams.metadata.model;
  const model = modelRegistry.get(modelName);
  if (!model) {
    throw new Error(`Model "${modelName}" not found in registry`);
  }

  // Generate parameter configurations
  const paramConfigs = generateParameterConfigs(
    config.batchConfig.parameter_ranges,
    config.batchConfig.sampling_mode,
    config.batchConfig.random_sample_count
  );

  // Calculate total runs
  const totalRuns = paramConfigs.length * config.batchConfig.seeds_per_config;

  // Create ZIP builder
  const zipBuilder = new ZipBuilder();

  // Add master config.toml
  const masterConfigToml = stringifyToml(config.batchConfig as any);
  zipBuilder.addFile('config.toml', masterConfigToml);

  // Report initialization
  callbacks.onProgress?.({
    phase: 'initializing',
    currentRun: 0,
    totalRuns,
    runProgress: 0,
    overallPercent: 0,
  });

  let runIndex = 0;

  // Run each parameter configuration
  for (let configIndex = 0; configIndex < paramConfigs.length; configIndex++) {
    const paramOverrides = paramConfigs[configIndex];

    // Run with different seeds
    for (let seedIndex = 0; seedIndex < config.batchConfig.seeds_per_config; seedIndex++) {
      // Check for abort
      if (abortSignal?.aborted) {
        throw new Error('Export cancelled by user');
      }

      runIndex++;
      const seed = seedIndex + 1;

      // Report progress
      callbacks.onProgress?.({
        phase: 'simulating',
        currentRun: runIndex,
        totalRuns,
        runProgress: 0,
        overallPercent: ((runIndex - 1) / totalRuns) * 100,
        currentConfig: paramOverrides,
      });

      // Run single simulation with rendering
      await runSingleExport(
        model,
        config.baseParams,
        paramOverrides,
        seed,
        runIndex,
        config,
        zipBuilder,
        callbacks,
        abortSignal
      );
    }
  }

  // Package ZIP
  callbacks.onProgress?.({
    phase: 'packaging',
    currentRun: totalRuns,
    totalRuns,
    runProgress: 100,
    overallPercent: 100,
  });

  const zipBlob = await zipBuilder.generate();

  return zipBlob;
}

/**
 * Run a single simulation with rendering and export artifacts.
 */
async function runSingleExport(
  model: any,
  baseParams: BaseSimulationParams,
  paramOverrides: Record<string, number>,
  seed: number,
  runIndex: number,
  config: BatchExportConfig,
  zipBuilder: ZipBuilder,
  callbacks: {
    onProgress?: (progress: BatchExportProgress) => void;
  },
  abortSignal?: AbortSignal
): Promise<void> {
  // Apply parameter overrides
  const params = structuredClone(baseParams);
  for (const [path, value] of Object.entries(paramOverrides)) {
    setNestedValue(params, path, value);
  }
  params.general.random_seed = seed;

  // Create run directory
  const runDir = `run_${runIndex.toString().padStart(3, '0')}`;

  // Save params.toml
  const paramsToml = stringifyToml(params as any);
  zipBuilder.addFile(`${runDir}/params.toml`, paramsToml);

  // Create offscreen renderer
  const renderer = new OffscreenRenderer({
    width: config.resolution.width,
    height: config.resolution.height,
    isDark: config.isDark ?? false,
  });

  await renderer.init(model, params);

  if (config.renderOptions) {
    renderer.setRenderOptions(config.renderOptions);
  }

  // Create simulation engine
  const engine = new SimulationEngine({ model, params });
  engine.init();

  // Get time samples
  const timeSamples = getTimeSamples(config.batchConfig.time_samples);
  const endTime = params.general.t_end;

  // Initialize video encoder if needed
  let videoEncoder: MP4VideoEncoder | null = null;
  if (config.exportMovie) {
    videoEncoder = new MP4VideoEncoder({
      width: config.resolution.width,
      height: config.resolution.height,
      frameRate: config.frameRate,
    });
    await videoEncoder.init();
  }

  let nextSampleIndex = 0;

  // Capture initial state (t=0)
  if (timeSamples.length > 0 && timeSamples[0] <= 0) {
    const state = engine.getState();
    renderer.render(state);

    // Capture screenshot
    const screenshot = await renderer.getScreenshot();
    zipBuilder.addFile(
      `${runDir}/screenshots/t_${timeSamples[0].toFixed(2)}h.png`,
      screenshot
    );

    // Capture video frame
    if (videoEncoder) {
      const canvas = renderer.getCanvas();
      if (canvas instanceof HTMLCanvasElement) {
        await videoEncoder.addFrame(canvas, 0);
      }
    }

    nextSampleIndex = 1;
  }

  // Simulation loop
  let frameCount = 0;
  const frameDt = 1000 / config.frameRate; // milliseconds per frame

  while (!engine.isComplete()) {
    // Check for abort
    if (abortSignal?.aborted) {
      renderer.destroy();
      throw new Error('Export cancelled by user');
    }

    engine.step();
    const state = engine.getState() as any;
    const t = state.t ?? 0;

    // Render state
    renderer.render(state);

    // Capture video frame at frame rate intervals
    if (videoEncoder && t * 1000 >= frameCount * frameDt) {
      const canvas = renderer.getCanvas();
      if (canvas instanceof HTMLCanvasElement) {
        await videoEncoder.addFrame(canvas, t * 1000); // Convert to ms
      }
      frameCount++;
    }

    // Capture screenshots at sample times
    while (nextSampleIndex < timeSamples.length && t >= timeSamples[nextSampleIndex]) {
      const screenshot = await renderer.getScreenshot();
      zipBuilder.addFile(
        `${runDir}/screenshots/t_${timeSamples[nextSampleIndex].toFixed(2)}h.png`,
        screenshot
      );
      nextSampleIndex++;
    }

    // Report progress
    const progress = Math.min((t / endTime) * 100, 100);
    const totalRuns = callbacks.onProgress ? 1 : 1; // Simplified for now
    callbacks.onProgress?.({
      phase: 'simulating',
      currentRun: runIndex,
      totalRuns,
      runProgress: progress,
      overallPercent: ((runIndex - 1 + progress / 100) / totalRuns) * 100,
      currentConfig: paramOverrides,
    });
  }

  // Finalize video
  if (videoEncoder) {
    callbacks.onProgress?.({
      phase: 'encoding',
      currentRun: runIndex,
      totalRuns: 1,
      runProgress: 100,
      overallPercent: ((runIndex - 0.5) / 1) * 100,
    });

    const movieBlob = await videoEncoder.finish();
    zipBuilder.addFile(`${runDir}/movie.mp4`, movieBlob);
  }

  // Clean up renderer
  renderer.destroy();
}
