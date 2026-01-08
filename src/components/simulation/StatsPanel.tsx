/**
 * Statistics and export panel for single simulation.
 * Generic version that uses model definitions.
 */
import { Camera, Video, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { useModel } from '@/contexts';
import type { BaseSimulationParams } from '@/core/registry'; // Removed SimulationState

export interface StatsPanelProps {
  state: any; // Generic state
  params: BaseSimulationParams;
  onScreenshot?: () => void;
  onRecord?: () => void;
  onExportCSV?: () => void;
  isRecording?: boolean;
}

export function StatsPanel({
  state,
  params,
  onScreenshot,
  onRecord,
  onExportCSV,
  isRecording,
}: StatsPanelProps) {
  const { currentModel } = useModel();

  // Compute stats if state is available
  const stats = (state && currentModel) ? currentModel.computeStats(state) : {};
  // Also get list of stat definitions to show labels
  const statDefs = currentModel?.statistics || [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dynamic Statistics */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {statDefs.map(def => (
            <div key={def.id} className="contents">
              <span className="text-muted-foreground" title={def.description}>{def.label}:</span>
              <span className="font-medium">
                {stats[def.id] !== undefined
                  ? (Number.isInteger(stats[def.id]) ? stats[def.id] : stats[def.id].toFixed(2))
                  : '-'}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-1">
          <h4 className="text-sm font-medium">Time</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Current:</span>
            <span className="font-medium">{state?.t !== undefined ? state.t.toFixed(2) : (state?.time?.toFixed(2) ?? '0.00')}h</span>

            <span className="text-muted-foreground">End:</span>
            <span className="font-medium">{params.general?.t_end ?? '-'}h</span>

            <span className="text-muted-foreground">Steps:</span>
            <span className="font-medium">{state?.step_count ?? '-'}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Export</h4>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" size="sm" onClick={onScreenshot} disabled={!state}>
              <Camera className="h-4 w-4 mr-2" />
              Screenshot
            </Button>
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="sm"
              onClick={onRecord}
              disabled={!state}
            >
              <Video className="h-4 w-4 mr-2" />
              {isRecording ? 'Stop Recording' : 'Record Video'}
            </Button>
            <Button variant="outline" size="sm" onClick={onExportCSV} disabled={!state}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
