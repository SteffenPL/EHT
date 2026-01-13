/**
 * Frame statistics panel - displays per-cell data table for current frame with collapsible UI and sorting.
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';

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

  return (
    <div className="border rounded-md bg-card">
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span>Frame Data</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs">{snapshot.length} cells, {columns.length} columns</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t overflow-x-auto max-h-72">
          <table className="w-full text-xs border-collapse">
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
        </div>
      )}
    </div>
  );
}
