/**
 * Modal dialog showing batch export progress with cancellation support.
 */
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { X } from 'lucide-react';
import type { BatchExportProgress } from '../../core/batch/exportRunner';

export interface ExportProgressModalProps {
  progress: BatchExportProgress;
  onCancel: () => void;
}

/**
 * Modal overlay showing export progress.
 */
export function ExportProgressModal({
  progress,
  onCancel,
}: ExportProgressModalProps) {
  const phaseLabels: Record<BatchExportProgress['phase'], string> = {
    initializing: 'Initializing...',
    simulating: 'Running simulations...',
    encoding: 'Encoding video...',
    packaging: 'Packaging ZIP...',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Exporting Batch Data</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Phase */}
        <div className="space-y-1">
          <p className="text-sm font-medium">{phaseLabels[progress.phase]}</p>
          <p className="text-xs text-muted-foreground">
            Run {progress.currentRun} of {progress.totalRuns}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress.overallPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {progress.overallPercent.toFixed(1)}%
          </p>
        </div>

        {/* Current Config */}
        {progress.currentConfig && Object.keys(progress.currentConfig).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Current parameters:</p>
            <div className="text-xs font-mono bg-muted p-2 rounded space-y-0.5">
              {Object.entries(progress.currentConfig).map(([key, value]) => (
                <div key={key}>
                  <span className="text-muted-foreground">{key}:</span>{' '}
                  <span>{typeof value === 'number' ? value.toFixed(3) : value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Button */}
        <div className="pt-2">
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel Export
          </Button>
        </div>
      </Card>
    </div>
  );
}
