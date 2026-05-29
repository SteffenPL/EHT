// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationControls, type SimulationControlsProps } from './SimulationControls';

function baseProps(overrides: Partial<SimulationControlsProps> = {}): SimulationControlsProps {
  return {
    isRunning: false,
    time: 0,
    endTime: 10,
    maxSimulatedTime: 0,
    isCatchingUp: false,
    onStart: vi.fn(),
    onPause: vi.fn(),
    onReset: vi.fn(),
    onStep: vi.fn(),
    onResetRandom: vi.fn(),
    onSeek: vi.fn(),
    simulationMode: 'slider',
    onSimulationModeChange: vi.fn(),
    paramChangeBehavior: 'run',
    onParamChangeBehaviorChange: vi.fn(),
    ...overrides,
  };
}

describe('SimulationControls profiler toggle', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the profiler toggle without timing readouts while disabled', () => {
    const onProfilerEnabledChange = vi.fn();

    render(
      <SimulationControls
        {...baseProps({
          profilerEnabled: false,
          onProfilerEnabledChange,
          profilerSnapshot: {
            frameMs: 16.2,
            stepMs: 4.8,
          },
        })}
      />
    );

    const profilerButton = screen.getByRole('button', { name: /profiler/i });
    expect(profilerButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Frame')).not.toBeInTheDocument();

    fireEvent.click(profilerButton);

    expect(onProfilerEnabledChange).toHaveBeenCalledWith(true);
  });

  it('renders compact profiler readouts while enabled', () => {
    render(
      <SimulationControls
        {...baseProps({
          profilerEnabled: true,
          onProfilerEnabledChange: vi.fn(),
          profilerSnapshot: {
            frameMs: 16.23,
            stepMs: 4.81,
            forcesMs: 1.2,
            formulaMs: 0.44,
            constraintsMs: 0.7,
            renderMs: 2.5,
            cloneMs: 0.31,
            cellCount: 42,
            stateHistoryLength: 3,
            formulaCacheSize: 5,
          },
        })}
      />
    );

    expect(screen.getByRole('button', { name: /profiler/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Frame')).toBeInTheDocument();
    expect(screen.getByText('16.2ms')).toBeInTheDocument();
    expect(screen.getAllByText('Step').length).toBeGreaterThan(1);
    expect(screen.getByText('4.81ms')).toBeInTheDocument();
    expect(screen.getByText('Formula cache')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
