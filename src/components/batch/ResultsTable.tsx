/**
 * Table to display batch statistics results.
 */
import { Play } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';

export interface ResultsTableProps {
  columns: string[];
  rows: (string | number)[][];
  /** Optional callback when "Run" button is clicked for a row */
  onRunRow?: (rowIndex: number) => void;
}

export function ResultsTable({ columns, rows, onRunRow }: ResultsTableProps) {
  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No results to display. Run batch or compute statistics.
      </div>
    );
  }

  const showRunColumn = !!onRunRow;

  return (
    <ScrollArea className="h-[300px] border rounded-md">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {showRunColumn && (
              <th className="text-left px-2 py-2 font-medium border-b whitespace-nowrap w-12">
                Run
              </th>
            )}
            {columns.map((col, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 font-medium border-b whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b last:border-0 hover:bg-muted/50">
              {showRunColumn && (
                <td className="px-2 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onRunRow(rowIdx)}
                    title="Open simulation with these parameters"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </td>
              )}
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-3 py-1.5 whitespace-nowrap font-mono text-xs">
                  {typeof cell === 'number' ? cell.toFixed(4) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}
