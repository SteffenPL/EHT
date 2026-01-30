import { SimulationRenderer } from '../../rendering/SimulationRenderer';
import type { SimulationModel } from '../interfaces/model';
import type { BaseSimulationParams } from '../registry';

export interface OffscreenRendererConfig {
  width: number;
  height: number;
  isDark: boolean;
}

/**
 * Headless renderer for exporting simulations without displaying in the DOM.
 * Uses OffscreenCanvas if available, otherwise creates a hidden HTMLCanvasElement.
 */
export class OffscreenRenderer<
  Params extends BaseSimulationParams = BaseSimulationParams,
  State = any
> {
  private renderer: SimulationRenderer<Params, State> | null = null;
  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private config: OffscreenRendererConfig;
  private isOffscreen: boolean = false;

  constructor(config: OffscreenRendererConfig) {
    this.config = config;
  }

  /**
   * Initialize the renderer with a model and parameters.
   * Creates an OffscreenCanvas (or hidden canvas) and initializes Pixi.js.
   */
  async init(
    model: SimulationModel<Params, State>,
    params: Params
  ): Promise<void> {
    if (this.renderer) {
      throw new Error('Renderer already initialized');
    }

    // Try to use OffscreenCanvas if available
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(this.config.width, this.config.height);
      this.isOffscreen = true;
    } else {
      // Fallback to hidden HTMLCanvasElement
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
      this.canvas.style.display = 'none';
      document.body.appendChild(this.canvas);
      this.isOffscreen = false;
    }

    // Create renderer
    this.renderer = new SimulationRenderer({
      width: this.config.width,
      height: this.config.height,
      isDark: this.config.isDark,
    });

    // Initialize with canvas
    await this.renderer.init(this.canvas as HTMLCanvasElement);

    // Set model and params
    this.renderer.setModel(model);
    this.renderer.setParams(params);
  }

  /**
   * Render the given simulation state.
   */
  render(state: State): void {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call init() first.');
    }
    this.renderer.render(state);
  }

  /**
   * Set render options (e.g., showCellIds, showScaleBar).
   */
  setRenderOptions(options: Record<string, boolean>): void {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call init() first.');
    }
    this.renderer.setRenderOptions(options);
  }

  /**
   * Get a PNG screenshot as a Blob.
   * Works with both OffscreenCanvas and HTMLCanvasElement.
   */
  async getScreenshot(): Promise<Blob> {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    if (this.isOffscreen) {
      // OffscreenCanvas has convertToBlob
      return (this.canvas as OffscreenCanvas).convertToBlob({
        type: 'image/png',
      });
    } else {
      // HTMLCanvasElement: convert data URL to blob
      return new Promise((resolve, reject) => {
        const canvas = this.canvas as HTMLCanvasElement;
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/png'
        );
      });
    }
  }

  /**
   * Get the underlying canvas (for video encoding).
   * Note: If using OffscreenCanvas, this returns OffscreenCanvas which may not be
   * compatible with all video encoders. In that case, consider using HTMLCanvasElement fallback.
   */
  getCanvas(): HTMLCanvasElement | OffscreenCanvas {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }
    return this.canvas;
  }

  /**
   * Destroy the renderer and clean up resources.
   */
  destroy(): void {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    // Clean up canvas
    if (this.canvas && !this.isOffscreen) {
      // Remove hidden canvas from DOM
      const canvas = this.canvas as HTMLCanvasElement;
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }

    this.canvas = null;
  }
}
