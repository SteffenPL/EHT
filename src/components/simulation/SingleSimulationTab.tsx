/**
 * Single simulation tab - combines canvas, controls, params, and stats.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSimulation, type ParamChangeBehavior } from '@/hooks';
import { useModel } from '@/contexts';
import { SimulationCanvas, type SimulationCanvasRef } from './SimulationCanvas';
import { SimulationControls } from './SimulationControls';
import { FrameStatsPanel } from './FrameStatsPanel';
import { Card } from '../ui/card';
import { getVideoFormatInfo, type VideoFormat } from '@/core/export/videoEncoder';
import { getRecommendedVideoFormat, getFormatRecommendationMessage } from '@/core/export/browserDetection';

/**
 * Wrapper that provides a key to force remount on model change.
 * This ensures all state (renderer, simulation engine) is recreated with correct params.
 */
export function SingleSimulationTab() {
  const { currentModel } = useModel();

  // Key forces complete remount when model changes
  return <SingleSimulationTabInner key={currentModel.name} />;
}

function SingleSimulationTabInner() {
  const [paramChangeBehavior, setParamChangeBehavior] = useState<ParamChangeBehavior>('run');
  const [isRecording, setIsRecording] = useState(false);
  // Initialize with recommended format for browser
  const [videoFormat, setVideoFormat] = useState<VideoFormat>(() => getRecommendedVideoFormat());
  const { currentModel, currentParams } = useModel();
  const canvasRef = useRef<SimulationCanvasRef>(null);

  // Get browser-specific recommendation message
  const formatRecommendation = useMemo(() => getFormatRecommendationMessage(), []);

  // Model-specific render options
  const renderOptionsConfig = currentModel.renderOptions;
  const [renderOptions, setRenderOptions] = useState<Record<string, boolean>>(
    () => renderOptionsConfig?.defaultOptions ?? {}
  );

  // Reset render options when model changes (component remounts via key, so this runs once)
  useEffect(() => {
    setRenderOptions(renderOptionsConfig?.defaultOptions ?? {});
  }, [renderOptionsConfig]);

  // Build the render options panel if the model provides one
  const RenderOptionsPanel = renderOptionsConfig?.RenderOptionsPanel;
  const renderOptionsPanel = RenderOptionsPanel ? (
    <RenderOptionsPanel options={renderOptions} onChange={setRenderOptions} />
  ) : null;

  const {
    state,
    isRunning,
    time,
    maxSimulatedTime,
    isCatchingUp,
    start,
    pause,
    reset,
    step,
    seekTo,
  } = useSimulation({ model: currentModel, params: currentParams, paramChangeBehavior });

  // Screenshot: download current canvas as PNG
  const handleSaveScreenshot = useCallback(() => {
    const dataUrl = canvasRef.current?.getScreenshot();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `simulation_${time.toFixed(2)}h.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [time]);

  // Movie recording: toggle recording mode with selected format
  const handleSaveMovie = useCallback(async () => {
    if (isRecording) {
      // Stop recording and save
      setIsRecording(false);
      try {
        const result = await canvasRef.current?.stopRecording();
        if (result) {
          const { blob } = result;
          // Get file extension based on format
          const { extension } = getVideoFormatInfo(videoFormat);
          const link = document.createElement('a');
          link.download = `simulation_${time.toFixed(2)}h.${extension}`;
          link.href = URL.createObjectURL(blob);
          link.click();
          URL.revokeObjectURL(link.href);
        }
      } catch (error) {
        console.error('Failed to save movie:', error);
        alert('Failed to save movie. Check console for details.');
      }
    } else {
      // Start recording with selected format
      try {
        await canvasRef.current?.startRecording(videoFormat);
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);

        // Detect Firefox
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

        // Provide format-specific error messages
        let formatName = 'MP4 (H.264)';
        let supportInfo = 'Chrome 94+, Safari 16.4+, Edge 94+';
        if (videoFormat === 'mp4-av1') {
          formatName = 'MP4 (AV1)';
          supportInfo = 'Chrome 90+, Edge 90+ (Safari not supported)';
        } else if (videoFormat === 'webm' || videoFormat === 'webm-vp9' || videoFormat === 'webm-vp8') {
          formatName = 'WebM (VP9)';
          supportInfo = 'Chrome 94+, Edge 94+ (Safari not supported)';
          if (videoFormat === 'webm-vp8') {
            formatName = 'WebM (VP8)';
          }
        }

        let errorMessage = `Failed to start ${formatName} recording. Your browser may not support this format.\n\nSupported browsers: ${supportInfo}`;

        // Add Firefox-specific guidance for H.264/AV1 failures
        if (isFirefox && (videoFormat === 'mp4' || videoFormat === 'mp4-av1')) {
          errorMessage += '\n\n⚠️ Firefox has known issues with H.264 and AV1 encoding.\n';
          errorMessage += '✅ Solution: Select "WebM (VP9)" format instead.\n';
          errorMessage += '\n💡 To convert WebM to MP4 later, use:\n';
          errorMessage += 'ffmpeg -i video.webm -c:v libx264 -crf 23 video.mp4\n';
          errorMessage += 'If compatibility issues remain, you can re-encode with HandBrake using a standard H.264 preset.';
        }

        alert(errorMessage);
      }
    }
  }, [isRecording, time, videoFormat]);

  // Export TSV: use model's getSnapshot to export current state
  const handleExportCSV = useCallback(() => {
    if (!state) return;

    const snapshot = currentModel.getSnapshot(state);
    if (snapshot.length === 0) return;

    // Convert to TSV (tab-separated)
    const headers = Object.keys(snapshot[0]);
    const tsvRows = [
      headers.join('\t'),
      ...snapshot.map(row => headers.map(h => row[h] ?? '').join('\t'))
    ];
    const tsvContent = tsvRows.join('\n');

    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
    const link = document.createElement('a');
    link.download = `simulation_state_${time.toFixed(2)}h.tsv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [state, currentModel, time]);

  // Compute per-cell snapshot data for frame display, merged with computed metrics
  const frameSnapshot = useMemo(() => {
    if (!state) return [];

    const snapshot = currentModel.getSnapshot(state);

    // If model provides exportCellMetrics, merge computed metrics into snapshot
    if (currentModel.exportCellMetrics) {
      const metrics = currentModel.exportCellMetrics(state, currentParams);

      // Merge metrics into snapshot rows (by index, assuming same order)
      return snapshot.map((row, idx) => {
        const metricRow = metrics[idx];
        if (!metricRow) return row;

        // Get metric keys (excluding cell_id, but including cell_type to override typeIndex)
        const metricKeys = Object.keys(metricRow).filter(
          k => k !== 'cell_id'
        );

        // Build merged row: id, snapshot state, then computed metrics where names overlap.
        const { id, typeIndex: _typeIndex, ...restSnapshot } = row as Record<string, unknown>;
        const metricValues: Record<string, unknown> = {};
        for (const k of metricKeys) {
          metricValues[k] = metricRow[k];
        }

        // Use cell_type from metrics as typeIndex if available, otherwise use original
        const typeIndex = metricRow.cell_type ?? _typeIndex;

        return { id, typeIndex, ...restSnapshot, ...metricValues };
      });
    }

    return snapshot;
  }, [state, currentModel, currentParams]);

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <Card className="overflow-hidden">
        <SimulationCanvas
          ref={canvasRef}
          state={state}
          params={currentParams}
          minHeight={350}
          maxHeight={600}
          renderOptions={renderOptions}
        />
      </Card>

      {/* Browser-specific format recommendation */}
      {formatRecommendation && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-800 dark:text-blue-200">
          <span className="font-medium">ℹ️ Tip:</span> {formatRecommendation}
        </div>
      )}

      {/* Controls */}
      <SimulationControls
        isRunning={isRunning}
        time={time}
        endTime={currentParams.general.t_end}
        maxSimulatedTime={maxSimulatedTime}
        isCatchingUp={isCatchingUp}
        onStart={start}
        onPause={pause}
        onReset={reset}
        onStep={step}
        onSeek={seekTo}
        paramChangeBehavior={paramChangeBehavior}
        onParamChangeBehaviorChange={setParamChangeBehavior}
        onSaveScreenshot={handleSaveScreenshot}
        onSaveMovie={handleSaveMovie}
        onExportCSV={handleExportCSV}
        isRecording={isRecording}
        videoFormat={videoFormat}
        onVideoFormatChange={setVideoFormat}
        renderOptionsPanel={renderOptionsPanel}
      />

      {/* Frame Data Table */}
      <FrameStatsPanel snapshot={frameSnapshot} />
    </div>
  );
}
