/**
 * Table to display batch statistics results.
 */
import { ScrollArea } from '../ui/scroll-area';

export interface ResultsTableProps {
  columns: string[];
  rows: (string | number)[][];
}

export function ResultsTable({ columns, rows }: ResultsTableProps) {
  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No results to display. Run batch or compute statistics.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] border rounded-md">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr>
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
