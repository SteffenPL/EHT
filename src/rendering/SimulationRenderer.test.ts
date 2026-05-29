import { describe, expect, it, vi } from 'vitest';
import { SimulationRenderer } from './SimulationRenderer';
import type { SimulationModel } from '@/core/interfaces/model';

const destroyedChildren: string[] = [];

vi.mock('pixi.js', () => {
  class MockDisplayObject {
    label: string;
    destroyed = false;

    constructor(label: string) {
      this.label = label;
    }

    destroy(): void {
      this.destroyed = true;
      destroyedChildren.push(this.label);
    }
  }

  class MockContainer extends MockDisplayObject {
    children: MockDisplayObject[] = [];
    scale = { set: vi.fn() };
    position = { set: vi.fn() };

    constructor(label = 'container') {
      super(label);
    }

    addChild(...children: MockDisplayObject[]): MockDisplayObject {
      this.children.push(...children);
      return children[0];
    }

    removeChildren(): MockDisplayObject[] {
      const removed = this.children;
      this.children = [];
      return removed;
    }
  }

  class MockGraphics extends MockDisplayObject {
    constructor() {
      super('graphics');
    }

    moveTo(): this { return this; }
    lineTo(): this { return this; }
    stroke(): this { return this; }
  }

  class MockText extends MockDisplayObject {
    anchor = { set: vi.fn() };
    position = { set: vi.fn() };

    constructor() {
      super('text');
    }
  }

  class MockApplication {
    stage = new MockContainer('stage');
    renderer = {
      width: 800,
      height: 600,
      background: { color: 0 },
      resize: vi.fn((width: number, height: number) => {
        this.renderer.width = width;
        this.renderer.height = height;
      }),
    };

    async init(): Promise<void> {}
    render(): void {}
    destroy(): void {}
  }

  return {
    Application: MockApplication,
    Container: MockContainer,
    Graphics: MockGraphics,
    Text: MockText,
    TextStyle: class MockTextStyle {},
  };
});

describe('SimulationRenderer', () => {
  it('destroys transient Pixi children before replacing them on the next frame', async () => {
    destroyedChildren.length = 0;

    const model = {
      renderer: {
        getBackgroundColor: () => 0xffffff,
        getBoundingBox: () => ({ minX: -10, maxX: 10, minY: -10, maxY: 10 }),
        render: vi.fn(),
      },
    } as unknown as SimulationModel<Record<string, unknown>, Record<string, unknown>>;

    const renderer = new SimulationRenderer<Record<string, unknown>, Record<string, unknown>>({
      width: 800,
      height: 600,
    });

    await renderer.init({ width: 800, height: 600 } as HTMLCanvasElement);
    renderer.setModel(model);
    renderer.setParams({});

    renderer.render({});
    expect(destroyedChildren).toHaveLength(0);

    renderer.render({});
    expect(destroyedChildren).toEqual(['graphics', 'graphics', 'graphics', 'graphics', 'text']);
  });
});
