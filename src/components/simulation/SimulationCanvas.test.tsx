// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationCanvas } from './SimulationCanvas';

vi.mock('../../rendering', () => ({
  SimulationRenderer: class MockSimulationRenderer {
    initCalls: unknown[][] = [];
    destroyCalls: unknown[][] = [];
    setModelCalls: unknown[][] = [];
    setParamsCalls: unknown[][] = [];
    renderCalls: unknown[][] = [];
    resizeCalls: unknown[][] = [];
    setDarkModeCalls: unknown[][] = [];
    setRenderOptionsCalls: unknown[][] = [];

    init(...args: unknown[]) {
      this.initCalls.push(args);
      const store = ((globalThis as any).__simulationCanvasRendererMock ??= {
        instances: [],
        initResolvers: [],
      });
      return new Promise<void>(resolve => {
        store.initResolvers.push(resolve);
      });
    }

    destroy(...args: unknown[]) {
      this.destroyCalls.push(args);
    }

    setModel(...args: unknown[]) {
      this.setModelCalls.push(args);
    }

    setParams(...args: unknown[]) {
      this.setParamsCalls.push(args);
    }

    render(...args: unknown[]) {
      this.renderCalls.push(args);
    }

    resize(...args: unknown[]) {
      this.resizeCalls.push(args);
    }

    setDarkMode(...args: unknown[]) {
      this.setDarkModeCalls.push(args);
    }

    setRenderOptions(...args: unknown[]) {
      this.setRenderOptionsCalls.push(args);
    }

    constructor() {
      const store = ((globalThis as any).__simulationCanvasRendererMock ??= {
        instances: [],
        initResolvers: [],
      });
      store.instances.push(this);
    }
  },
}));

vi.mock('@/contexts', () => ({
  useTheme: () => ({ isDark: false }),
  useModel: () => {
    const store = ((globalThis as any).__simulationCanvasContextMock ??= {
      currentModel: { name: 'test-model' },
    });
    return { currentModel: store.currentModel };
  },
}));

const rendererMock = ((globalThis as any).__simulationCanvasRendererMock ??= {
  instances: [],
  initResolvers: [],
});

const contextMock = ((globalThis as any).__simulationCanvasContextMock ??= {
  currentModel: { name: 'test-model' },
});

const params = {
  general: { t_end: 1 },
};

function resolveInit(index = 0) {
  const resolve = rendererMock.initResolvers[index];
  if (!resolve) {
    throw new Error(`No renderer init resolver at index ${index}`);
  }
  resolve();
}

describe('SimulationCanvas', () => {
  beforeEach(() => {
    rendererMock.instances.length = 0;
    rendererMock.initResolvers.length = 0;

    vi.stubGlobal('ResizeObserver', class {
      observe() {}
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

  it('destroys a renderer whose async init resolves after unmount', async () => {
    const view = render(<SimulationCanvas state={{ t: 0 }} params={params as any} />);

    await waitFor(() => expect(rendererMock.initResolvers).toHaveLength(1));
    const renderer = rendererMock.instances[0];

    view.unmount();

    await act(async () => {
      resolveInit();
      await Promise.resolve();
    });

    expect(renderer.destroyCalls).toHaveLength(1);
    expect(renderer.setModelCalls).toHaveLength(0);
    expect(renderer.renderCalls).toHaveLength(0);
  });

  it('renders the latest state after delayed renderer startup completes', async () => {
    const firstState = { t: 0 };
    const latestState = { t: 1 };

    const view = render(<SimulationCanvas state={firstState} params={params as any} />);

    await waitFor(() => expect(rendererMock.initResolvers).toHaveLength(1));
    view.rerender(<SimulationCanvas state={latestState} params={params as any} />);

    await act(async () => {
      resolveInit();
      await Promise.resolve();
    });

    const renderer = rendererMock.instances[0];

    await waitFor(() => expect(renderer.renderCalls).toContainEqual([latestState]));
    expect(renderer.setModelCalls).toContainEqual([contextMock.currentModel]);
    expect(renderer.setParamsCalls).toContainEqual([params]);
  });
});
