/**
 * Single simulation tab - combines canvas, controls, params, and stats.
 */
import { useState, useRef, useCallback } from 'react';
import { useSimulation, type ParamChangeBehavior } from '@/hooks';
import { useModel } from '@/contexts';
import { SimulationCanvas, type SimulationCanvasRef } from './SimulationCanvas';
import { SimulationControls } from './SimulationControls';
import { SimulationTerminal } from './SimulationTerminal';
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

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <Card className="overflow-hidden">
        <SimulationCanvas
          ref={canvasRef}
          state={state}
          params={currentParams}
          minHeight={350}
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
      />

      {/* Terminal */}
      <SimulationTerminal />
    </div>
  );
}
