// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FrameStatsPanel } from './FrameStatsPanel';

const snapshot = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  typeIndex: index % 2,
  x: index * 0.25,
  y: index * 0.5,
}));

describe('FrameStatsPanel', () => {
  it('opens inline frame data with a vertical scroll owner', () => {
    render(<FrameStatsPanel snapshot={snapshot} />);

    fireEvent.click(screen.getByRole('button', { name: /Frame Data/ }));

    const table = screen.getByRole('table');
    expect(table.parentElement).toHaveClass('overflow-auto');
    expect(table.parentElement).toHaveClass('max-w-full');
    expect(table.closest('.bg-card')).toHaveClass('min-w-0');
    expect(table).toHaveClass('min-w-max');
    expect(table.parentElement?.className).toContain('max-h-[min(520px,calc(100vh-280px))]');
  });

  it('opens a maximized frame data dialog', () => {
    render(<FrameStatsPanel snapshot={snapshot} />);

    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Frame Data')).toBeInTheDocument();
    expect(within(dialog).getByText('12 cells, 4 columns')).toBeInTheDocument();
    expect(within(dialog).getByRole('table').parentElement).toHaveClass('overflow-auto');
  });
});
