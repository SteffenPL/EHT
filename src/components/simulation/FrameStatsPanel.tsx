/**
 * Frame statistics panel - displays per-cell data table for current frame with collapsible UI and sorting.
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ArrowUpDown, Maximize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

export interface FrameStatsPanelProps {
  /** Per-cell snapshot data (array of row objects) */
  snapshot: Record<string, unknown>[];
}

type SortDirection = 'asc' | 'desc';

/** Format a cell value for display */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(3);
  }
  return String(value);
}

export function FrameStatsPanel({ snapshot }: FrameStatsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Extract column names from first row
  const columns = useMemo(() => {
    if (snapshot.length === 0) return [];
    return Object.keys(snapshot[0]);
  }, [snapshot]);

  // Build sorted rows
  const sortedRows = useMemo(() => {
    if (snapshot.length === 0) return [];

    const rows = [...snapshot];
    rows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      let cmp: number;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''));
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [snapshot, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortIndicator = (key: string) => {
    if (sortKey !== key) return null;
    return sortDirection === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  if (snapshot.length === 0) {
    return null;
  }

  const renderTable = () => (
    <table className="min-w-max text-xs border-collapse">
      {/* Table Header */}
      <thead className="bg-muted/30 sticky top-0 z-20">
        <tr>
          {columns.map((col, colIndex) => (
            <th
              key={col}
              className={`px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap ${
                colIndex === 0
                  ? 'sticky left-0 z-30 bg-muted/80 border-r border-border/50'
                  : ''
              }`}
            >
              <button
                type="button"
                onClick={() => handleSort(col)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {col}
                <ArrowUpDown size={8} className="opacity-50" />
                {getSortIndicator(col)}
              </button>
            </th>
          ))}
        </tr>
      </thead>

      {/* Table Body */}
      <tbody>
        {sortedRows.map((row, rowIndex) => (
          <tr
            key={rowIndex}
            className="border-t border-border/50 hover:bg-muted/20"
          >
            {columns.map((col, colIndex) => (
              <td
                key={col}
                className={`px-2 py-1 font-mono whitespace-nowrap ${
                  colIndex === 0
                    ? 'sticky left-0 z-10 bg-card border-r border-border/50'
                    : ''
                }`}
              >
                {formatValue(row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-card">
      {/* Header / Toggle */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left text-sm font-medium hover:text-foreground/80 transition-colors"
          aria-expanded={isOpen}
        >
          <span>Frame Data</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs">{snapshot.length} cells, {columns.length} columns</span>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMaximized(true)}
          className="h-7 shrink-0 gap-1.5 text-xs"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Maximize
        </Button>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="max-w-full overflow-auto border-t max-h-[min(520px,calc(100vh-280px))]">
          {renderTable()}
        </div>
      )}

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="w-[min(1280px,calc(100vw-2rem))] max-w-none max-h-[92vh] gap-0 overflow-hidden p-0">
          <div className="flex max-h-[92vh] min-h-0 flex-col">
            <div className="border-b bg-background px-4 py-3 pr-14">
              <DialogHeader>
                <DialogTitle>Frame Data</DialogTitle>
                <DialogDescription className="sr-only">
                  Inspect and sort per-cell data for the current simulation frame.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-1 text-xs text-muted-foreground">
                {snapshot.length} cells, {columns.length} columns
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {renderTable()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
