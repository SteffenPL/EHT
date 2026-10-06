// @vitest-environment jsdom
/**
 * End-to-end wiring test for the Comparison view: renders the full view
 * (lockstep scenarios, composite canvas, controls, plots) with a mocked
 * Pixi renderer and asserts the canvas wiring and transport interactions.
 */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComparisonView } from './ComparisonView';
import { comparisonCanvasModel } from './comparisonRenderer';

vi.mock('@/rendering', () => ({
  SimulationRenderer: class MockSimulationRenderer {
    initCalls: unknown[][] = [];
    destroyCalls: unknown[][] = [];
    setModelCalls: unknown[][] = [];
    setParamsCalls: unknown[][] = [];
    renderCalls: unknown[][] = [];
    resizeCalls: unknown[][] = [];
    setDarkModeCalls: unknown[][] = [];
    setRenderOptionsCalls: unknown[][] = [];
    setInteractionOverlayCalls: unknown[][] = [];

    init(...args: unknown[]) {
      this.initCalls.push(args);
      const store = ((globalThis as any).__comparisonViewRendererMock ??= {
        instances: [],
        initResolvers: [],
      });
      return new Promise<void>(resolve => {
        store.initResolvers.push(resolve);
      });
    }

    destroy(...args: unknown[]) { this.destroyCalls.push(args); }
    setModel(...args: unknown[]) { this.setModelCalls.push(args); }
    setParams(...args: unknown[]) { this.setParamsCalls.push(args); }
    render(...args: unknown[]) { this.renderCalls.push(args); }
    resize(...args: unknown[]) { this.resizeCalls.push(args); }
    setDarkMode(...args: unknown[]) { this.setDarkModeCalls.push(args); }
    setRenderOptions(...args: unknown[]) { this.setRenderOptionsCalls.push(args); }
    setInteractionOverlay(...args: unknown[]) { this.setInteractionOverlayCalls.push(args); }

    constructor() {
      const store = ((globalThis as any).__comparisonViewRendererMock ??= {
        instances: [],
        initResolvers: [],
      });
      store.instances.push(this);
    }
  },
}));

vi.mock('@/contexts', () => ({
  useTheme: () => ({ isDark: false }),
  useModel: () => ({ currentModel: { name: 'test-model' } }),
}));

const rendererMock = ((globalThis as any).__comparisonViewRendererMock ??= {
  instances: [],
  initResolvers: [],
});

function resolveInit(index = 0) {
  const resolve = rendererMock.initResolvers[index];
  if (!resolve) throw new Error(`No renderer init resolver at index ${index}`);
  resolve();
}

describe('ComparisonView', () => {
  beforeEach(() => {
    rendererMock.instances.length = 0;
    rendererMock.initResolvers.length = 0;

    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(performance.now()), 0);
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders scenario controls and wires the composite renderer to the canvas', async () => {
    const view = render(<ComparisonView />);

    // Both scenario toggles and the tissue-lines toggle are present
    expect(view.getByRole('checkbox', { name: 'Oscillating (120 bpm)' })).toBeInTheDocument();
    expect(view.getByRole('checkbox', { name: 'Averaged model' })).toBeInTheDocument();
    expect(view.getByRole('checkbox', { name: 'Tissue lines' })).toBeInTheDocument();

    await waitFor(() => expect(rendererMock.initResolvers).toHaveLength(1));

    await act(async () => {
      resolveInit();
      await Promise.resolve();
    });

    const renderer = rendererMock.instances[0];

    // The composite comparison model (not the global model) drives the canvas
    await waitFor(() => {
      expect(renderer.setModelCalls).toContainEqual([comparisonCanvasModel]);
    });

    // Canvas params carry both scenario params for the viewport bounds
    const paramsCall = renderer.setParamsCalls.find(
      (args: any[]) => args[0]?.scenarioParams?.length === 2
    );
    expect(paramsCall).toBeDefined();

    // The composite frame with both scenario states is rendered
    const renderCall = renderer.renderCalls.find(
      (args: any[]) => args[0]?.scenarios?.length === 2
    );
    expect(renderCall).toBeDefined();

    view.unmount();
    expect(renderer.destroyCalls).toHaveLength(1);
  });

  it('advances the shared timeline with the Step button', async () => {
    const view = render(<ComparisonView />);

    await waitFor(() => expect(rendererMock.initResolvers).toHaveLength(1));
    await act(async () => {
      resolveInit();
      await Promise.resolve();
    });

    // Initial frame: nothing computed yet
    expect(view.getByText(/computed 0/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: /Step/i }));
      await Promise.resolve();
    });

    // One lockstep frame computed for both scenarios
    expect(view.getByText(/computed 1/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: /Reset/i }));
      await Promise.resolve();
    });
    expect(view.getByText(/computed 1/)).toBeInTheDocument();
    expect(view.getByText(/frame 0\/360/)).toBeInTheDocument();
  });

  it('toggles scenario visibility through the render options', async () => {
    const view = render(<ComparisonView />);

    await waitFor(() => expect(rendererMock.initResolvers).toHaveLength(1));
    await act(async () => {
      resolveInit();
      await Promise.resolve();
    });

    const renderer = rendererMock.instances[0];
    const renderOptionsWithHiddenScenario = () =>
      renderer.setRenderOptionsCalls.some((args: any[]) => args[0]?.show_averaged === false);

    await act(async () => {
      fireEvent.click(view.getByRole('checkbox', { name: 'Averaged model' }));
      await Promise.resolve();
    });

    await waitFor(() => expect(renderOptionsWithHiddenScenario()).toBe(true));

    view.unmount();
  });
});
