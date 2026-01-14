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
  const { currentModel, currentParams } = useModel();
  const canvasRef = useRef<SimulationCanvasRef>(null);

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

  // Movie recording: toggle recording mode using MediaRecorder
  const handleSaveMovie = useCallback(async () => {
    if (isRecording) {
      // Stop recording and save
      setIsRecording(false);
      const blob = await canvasRef.current?.stopRecording();
      if (blob) {
        const link = document.createElement('a');
        link.download = `simulation_${time.toFixed(2)}h.webm`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } else {
      // Start recording
      canvasRef.current?.startRecording();
      setIsRecording(true);
    }
  }, [isRecording, time]);

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

        // Build merged row: id, then metrics (including cell_type), then rest of snapshot
        const { id, typeIndex: _typeIndex, ...restSnapshot } = row as Record<string, unknown>;
        const metricValues: Record<string, unknown> = {};
        for (const k of metricKeys) {
          metricValues[k] = metricRow[k];
        }

        // Use cell_type from metrics as typeIndex if available, otherwise use original
        const typeIndex = metricRow.cell_type ?? _typeIndex;

        return { id, typeIndex, ...metricValues, ...restSnapshot };
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
          renderOptions={renderOptions}
        />
      </Card>

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
        renderOptionsPanel={renderOptionsPanel}
      />

      {/* Frame Data Table */}
      <FrameStatsPanel snapshot={frameSnapshot} />
    </div>
  );
}
