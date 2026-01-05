/**
 * Main Pixi.js renderer for the simulation.
 * Handles all visual rendering of cells, links, and overlays.
 */
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { SimulationState, SimulationParams } from '../core/types';
import { defaultTheme, type ColorTheme, rgbToHex } from './themes';

export interface RendererConfig {
  width: number;
  height: number;
  theme?: ColorTheme;
  showScaleBar?: boolean;
}

/**
 * Simulation renderer using Pixi.js.
 */
export class SimulationRenderer {
  private app: Application;
  private mainContainer: Container;
  private cellsContainer: Container;
  private linksContainer: Container;
  private overlayContainer: Container;

  private theme: ColorTheme;
  private showScaleBar: boolean;

  private params: SimulationParams | null = null;

  // Viewport transform
  private scaleX = 1;
  private scaleY = 1;
  private translateX = 0;
  private translateY = 0;

  constructor(config: RendererConfig) {
    this.theme = config.theme ?? defaultTheme;
    this.showScaleBar = config.showScaleBar ?? true;

    // Create Pixi application
    this.app = new Application();

    // Create containers for layering
    this.linksContainer = new Container();
    this.cellsContainer = new Container();
    this.overlayContainer = new Container();
    this.mainContainer = new Container();

    this.mainContainer.addChild(this.linksContainer);
    this.mainContainer.addChild(this.cellsContainer);
    this.mainContainer.addChild(this.overlayContainer);
  }

  /**
   * Initialize the renderer asynchronously.
   */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      canvas,
      width: canvas.width,
      height: canvas.height,
      backgroundColor: this.theme.background,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.app.stage.addChild(this.mainContainer);
  }

  /**
   * Set simulation parameters (for viewport calculation).
   */
  setParams(params: SimulationParams): void {
    this.params = params;
    this.updateViewport();
  }

  /**
   * Resize the renderer.
   */
  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    this.updateViewport();
  }

  /**
   * Update viewport transform based on params and canvas size.
   */
  private updateViewport(): void {
    if (!this.params) return;

    const pg = this.params.general;
    const canvasWidth = this.app.renderer.width;
    const canvasHeight = this.app.renderer.height;

    const simAspect = pg.w_screen / pg.h_screen;
    const canvasAspect = canvasWidth / canvasHeight;

    // Scale to fit simulation in canvas
    if (canvasAspect > simAspect) {
      // Canvas is wider - fit by height
      this.scaleY = -canvasHeight / pg.h_screen;
      this.scaleX = -this.scaleY;
    } else {
      // Canvas is taller - fit by width
      this.scaleX = canvasWidth / pg.w_screen;
      this.scaleY = -this.scaleX;
    }

    // Center the simulation
    this.translateX = canvasWidth / 2;
    this.translateY = canvasHeight - (pg.h_screen - pg.h_init) * 0.25 * Math.abs(this.scaleY);

    // Apply transform to main container
    this.mainContainer.scale.set(this.scaleX, this.scaleY);
    this.mainContainer.position.set(this.translateX, this.translateY);
  }

  /**
   * Render the current simulation state.
   */
  render(state: SimulationState): void {
    if (!this.params) return;

    // Clear previous frame
    this.cellsContainer.removeChildren();
    this.linksContainer.removeChildren();
    this.overlayContainer.removeChildren();

    // Draw links first (behind cells)
    this.drawBasalLinks(state);
    this.drawApicalLinks(state);

    // Draw cells
    this.drawCells(state);

    // Draw overlays
    if (this.showScaleBar) {
      this.drawScaleBar();
    }
  }

  /**
   * Draw all cells.
   */
  private drawCells(state: SimulationState): void {
    const graphics = new Graphics();

    for (const cell of state.cells) {
      const cellType = this.params!.cell_types[cell.typeIndex] ?? this.params!.cell_types.control;
      const color = cellType.color;

      // Draw soft radius (semi-transparent ellipse)
      // For simplicity, draw as circle - could add velocity-based deformation later
      graphics.circle(cell.pos.x, cell.pos.y, cell.R_soft);
      graphics.fill({ color: rgbToHex(color.r, color.g, color.b), alpha: 0.4 });

      // Draw hard radius (solid circle)
      graphics.circle(cell.pos.x, cell.pos.y, cell.R_hard);
      graphics.fill({ color: rgbToHex(color.r, color.g, color.b), alpha: 1 });

      // Draw apical point
      graphics.circle(cell.A.x, cell.A.y, 0.1);
      graphics.fill({ color: this.theme.apicalPoint, alpha: 1 });

      // Draw basal point
      graphics.circle(cell.B.x, cell.B.y, 0.1);
      graphics.fill({ color: this.theme.basalPoint, alpha: 1 });

      // Draw cytoskeleton lines (A to pos, B to pos)
      graphics.moveTo(cell.A.x, cell.A.y);
      graphics.lineTo(cell.pos.x, cell.pos.y);
      graphics.lineTo(cell.B.x, cell.B.y);
      graphics.stroke({ color: 0x643200, alpha: 0.5, width: 0.05 });
    }

    this.cellsContainer.addChild(graphics);
  }

  /**
   * Draw apical links between cells.
   */
  private drawApicalLinks(state: SimulationState): void {
    const graphics = new Graphics();

    for (const link of state.ap_links) {
      const cellI = state.cells[link.l];
      const cellJ = state.cells[link.r];

      if (cellI && cellJ) {
        graphics.moveTo(cellI.A.x, cellI.A.y);
        graphics.lineTo(cellJ.A.x, cellJ.A.y);
      }
    }

    graphics.stroke({ color: this.theme.apicalLink, alpha: 1, width: 0.05 });
    this.linksContainer.addChild(graphics);
  }

  /**
   * Draw basal links between cells.
   */
  private drawBasalLinks(state: SimulationState): void {
    const graphics = new Graphics();

    for (const link of state.ba_links) {
      const cellI = state.cells[link.l];
      const cellJ = state.cells[link.r];

      if (cellI && cellJ) {
        graphics.moveTo(cellI.B.x, cellI.B.y);
        graphics.lineTo(cellJ.B.x, cellJ.B.y);
      }
    }

    graphics.stroke({ color: this.theme.basalLink, alpha: 1, width: 0.05 });
    this.linksContainer.addChild(graphics);
  }

  /**
   * Draw scale bar overlay.
   */
  private drawScaleBar(): void {
    if (!this.params) return;

    const pg = this.params.general;

    // Scale bar in simulation units (2 units = 10 μm)
    const barLength = 2;
    const barX = pg.w_screen / 2 - 6;
    const barY = -0.05 * pg.h_screen;

    const graphics = new Graphics();
    graphics.moveTo(barX, barY);
    graphics.lineTo(barX + barLength, barY);
    graphics.stroke({ color: this.theme.scaleBar, alpha: 1, width: 0.1 });

    this.overlayContainer.addChild(graphics);

    // Text label - rendered in screen space
    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: this.theme.text,
    });

    const text = new Text({ text: '10 μm', style: textStyle });

    // Convert simulation coords to screen coords for text
    const screenX = barX * this.scaleX + this.translateX;
    const screenY = barY * this.scaleY + this.translateY;

    // Text needs to be in stage coords, not in transformed container
    text.position.set(screenX, screenY + 15);
    text.scale.set(1 / Math.abs(this.scaleX), 1 / Math.abs(this.scaleY));

    // Actually, let's add it to a separate non-transformed container
    // For simplicity, skip text for now - can add later
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
