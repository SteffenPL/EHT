/**
 * Statistics and export panel for single simulation.
 */
import { Camera, Video, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import type { SimulationState, SimulationParams } from '@/core/types';

export interface StatsPanelProps {
  state: SimulationState | null;
  params: SimulationParams;
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
  const cells = state?.cells ?? [];
  const controlCells = cells.filter((c) => c.typeIndex === 'control');
  const emtCells = cells.filter((c) => c.typeIndex === 'emt');
  const emtWithApical = emtCells.filter((c) => c.has_A);
  const emtWithBasal = emtCells.filter((c) => c.has_B);
  const emtEscaped = emtCells.filter((c) => !c.has_A && !c.has_B);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">Total Cells:</span>
          <span className="font-medium">{cells.length}</span>

          <span className="text-muted-foreground">Control Cells:</span>
          <span className="font-medium">{controlCells.length}</span>

          <span className="text-muted-foreground">EMT Cells:</span>
          <span className="font-medium">{emtCells.length}</span>

          <span className="text-muted-foreground">Apical Links:</span>
          <span className="font-medium">{state?.ap_links.length ?? 0}</span>

          <span className="text-muted-foreground">Basal Links:</span>
          <span className="font-medium">{state?.ba_links.length ?? 0}</span>
        </div>

        <Separator />

        <div className="space-y-1">
          <h4 className="text-sm font-medium">EMT Status</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">With Apical:</span>
            <span className="font-medium">{emtWithApical.length}</span>

            <span className="text-muted-foreground">With Basal:</span>
            <span className="font-medium">{emtWithBasal.length}</span>

            <span className="text-muted-foreground">Escaped:</span>
            <span className="font-medium">{emtEscaped.length}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-1">
          <h4 className="text-sm font-medium">Time</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Current:</span>
            <span className="font-medium">{(state?.t ?? 0).toFixed(2)}h</span>

            <span className="text-muted-foreground">End:</span>
            <span className="font-medium">{params.general.t_end}h</span>

            <span className="text-muted-foreground">Steps:</span>
            <span className="font-medium">{state?.step_count ?? 0}</span>
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
