/**
 * Main Pixi.js renderer for the simulation.
 * Delegates model-specific rendering to the model's renderer.
 */
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type {
  SimulationModel,
  BaseSimulationParams,
  ModelRenderContext,
  BoundingBox,
} from '../core/registry'; // registry re-exports SimulationModel now

export interface RendererConfig {
  width: number;
  height: number;
  isDark?: boolean;
}

/**
 * Simulation renderer using Pixi.js.
 * Provides the rendering framework and delegates model-specific rendering.
 */
export class SimulationRenderer<Params extends BaseSimulationParams = BaseSimulationParams, State = any> {
  private app: Application;
  private mainContainer: Container;
  private cellsContainer: Container;
  private linksContainer: Container;
  private overlayContainer: Container;
  private uiContainer: Container;

  private isDark: boolean;
  private renderOptions: Record<string, boolean> = {};

  private model: SimulationModel<Params, State> | null = null;
  private params: Params | null = null;

  // Viewport transform
  private scale = 1;
  private centerX = 0;
  private centerY = 0;

  constructor(config: RendererConfig) {
    this.isDark = config.isDark ?? false;

    // Create Pixi application
    this.app = new Application();

    // Create containers for layering
    this.linksContainer = new Container();
    this.cellsContainer = new Container();
    this.overlayContainer = new Container();
    this.mainContainer = new Container();
    this.uiContainer = new Container();

    this.mainContainer.addChild(this.linksContainer);
    this.mainContainer.addChild(this.cellsContainer);
    this.mainContainer.addChild(this.overlayContainer);
  }

  /**
   * Initialize the renderer asynchronously.
   */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    const backgroundColor = this.model?.renderer.getBackgroundColor(this.isDark) ?? 0xffffff;

    await this.app.init({
      canvas,
      width: canvas.width,
      height: canvas.height,
      backgroundColor,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      // Required for screenshots and video recording
      preserveDrawingBuffer: true,
    });

    this.app.stage.addChild(this.mainContainer);
    this.app.stage.addChild(this.uiContainer);
  }

  /**
   * Set the current model.
   */
  setModel(model: SimulationModel<Params, State>): void {
    this.model = model;
    // Update background color for the model
    const backgroundColor = model.renderer.getBackgroundColor(this.isDark);
    if (this.app.renderer) {
      this.app.renderer.background.color = backgroundColor;
    }
  }

  /**
   * Set simulation parameters (for viewport calculation).
   */
  setParams(params: Params): void {
    this.params = params;
    this.updateViewport();
  }

  /**
   * Set dark mode.
   */
  setDarkMode(isDark: boolean): void {
    this.isDark = isDark;
    if (this.model && this.app.renderer) {
      const backgroundColor = this.model.renderer.getBackgroundColor(isDark);
      this.app.renderer.background.color = backgroundColor;
    }
  }

  /**
   * Set render options (model-specific toggles like showCellIds, showScaleBar).
   */
  setRenderOptions(options: Record<string, boolean>): void {
    this.renderOptions = options;
  }

  /**
   * Resize the renderer.
   */
  resize(width: number, height: number): void {
    if (this.app.renderer) {
      this.app.renderer.resize(width, height);
      this.updateViewport();
    }
  }

  /**
   * Update viewport transform based on model's bounding box.
   * Centers view with 10% padding on each side.
   */
  private updateViewport(): void {
    if (!this.model || !this.params || !this.app.renderer) return;

    const canvasWidth = this.app.renderer.width;
    const canvasHeight = this.app.renderer.height;

    // Get bounds from the model's renderer
    // We pass undefined for state if we don't have it, assuming model can handle it (e.g. from params)
    const bounds: BoundingBox = this.model.renderer.getBoundingBox(this.params, undefined);

    // Add 10% padding
    const padding = 0.1;
    const simWidth = (bounds.maxX - bounds.minX) * (1 + 2 * padding);
    const simHeight = (bounds.maxY - bounds.minY) * (1 + 2 * padding);

    // Center of the simulation view
    this.centerX = (bounds.minX + bounds.maxX) / 2;
    this.centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate scale to fit the simulation in the canvas
    const scaleX = canvasWidth / simWidth;
    const scaleY = canvasHeight / simHeight;
    this.scale = Math.min(scaleX, scaleY);

    // Apply transform: scale and center
    // We flip Y because canvas Y goes down, simulation Y goes up
    this.mainContainer.scale.set(this.scale, -this.scale);
    this.mainContainer.position.set(
      canvasWidth / 2 - this.centerX * this.scale,
      canvasHeight / 2 + this.centerY * this.scale
    );
  }

  /**
   * Render the current simulation state.
   */
  render(state: State): void {
    if (!this.model || !this.params) return;

    // Clear previous frame
    this.cellsContainer.removeChildren();
    this.linksContainer.removeChildren();
    this.overlayContainer.removeChildren();
    this.uiContainer.removeChildren();

    // Create fresh Graphics objects for the model renderer
    const cellsGraphics = new Graphics();
    const linksGraphics = new Graphics();
    const overlayGraphics = new Graphics();

    this.cellsContainer.addChild(cellsGraphics);
    this.linksContainer.addChild(linksGraphics);
    this.overlayContainer.addChild(overlayGraphics);

    // Create render context
    const canvasWidth = this.app.renderer?.width ?? 800;
    const canvasHeight = this.app.renderer?.height ?? 600;
    const ctx: ModelRenderContext = {
      graphics: {
        cells: cellsGraphics,
        links: linksGraphics,
        overlay: overlayGraphics,
      },
      uiContainer: this.uiContainer,
      isDark: this.isDark,
      scale: this.scale,
      viewportCenter: { x: this.centerX, y: this.centerY },
      canvasSize: { width: canvasWidth, height: canvasHeight },
      renderOptions: this.renderOptions,
    };

    // Delegate rendering to the model
    this.model.renderer.render(ctx, state, this.params);

    // Draw UI overlays (in screen space)
    if (this.renderOptions.showScaleBar !== false) {
      this.drawScaleBar();
    }
  }

  /**
   * Draw scale bar in the bottom-right corner (in screen space).
   */
  private drawScaleBar(): void {
    if (!this.app.renderer) return;

    const canvasWidth = this.app.renderer.width;
    const canvasHeight = this.app.renderer.height;

    // Scale bar: 10 μm = 2 simulation units
    const barLengthSim = 2;
    const barLengthScreen = barLengthSim * this.scale;

    // Position in bottom-right corner with padding
    const padding = 20;
    const barX = canvasWidth - padding - barLengthScreen;
    const barY = canvasHeight - padding - 10;

    const scaleBarColor = this.isDark ? 0xb0b0d0 : 0x646464;
    const textColor = this.isDark ? 0xb0b8ff : 0x5050a0;

    const graphics = new Graphics();

    // Draw the bar
    graphics.moveTo(barX, barY);
    graphics.lineTo(barX + barLengthScreen, barY);
    graphics.stroke({ color: scaleBarColor, alpha: 1, width: 2 });

    // Draw end caps
    graphics.moveTo(barX, barY - 5);
    graphics.lineTo(barX, barY + 5);
    graphics.moveTo(barX + barLengthScreen, barY - 5);
    graphics.lineTo(barX + barLengthScreen, barY + 5);
    graphics.stroke({ color: scaleBarColor, alpha: 1, width: 2 });

    this.uiContainer.addChild(graphics);

    // Text label
    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: textColor,
    });

    const text = new Text({ text: '10 μm', style: textStyle });
    text.anchor.set(0.5, 0);
    text.position.set(barX + barLengthScreen / 2, barY + 8);

    this.uiContainer.addChild(text);
  }

  /**
   * Get the Pixi application (for advanced usage).
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Destroy the renderer and clean up resources.
   */
  destroy(): void {
    this.app.destroy(true);
  }
}
