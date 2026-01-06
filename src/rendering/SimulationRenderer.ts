/**
 * Main Pixi.js renderer for the simulation.
 * Handles all visual rendering of cells, links, and overlays.
 */
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { SimulationState, SimulationParams } from '../core/types';
import { shapeCenter } from '../core/math/geometry';
import { defaultTheme, type ColorTheme, rgbToHex } from './themes';

export interface RendererConfig {
  width: number;
  height: number;
  theme?: ColorTheme;
  showScaleBar?: boolean;
}

/**
 * Compute the bounding box for the basal curve (ellipse or line).
 * Returns { minX, maxX, minY, maxY } in simulation coordinates.
 */
function getBasalCurveBounds(
  curvature_1: number,
  curvature_2: number,
  h_init: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  if (curvature_1 === 0 && curvature_2 === 0) {
    // Straight line case - use a default width
    return { minX: -20, maxX: 20, minY: 0, maxY: h_init };
  }

  const center = shapeCenter(curvature_1, curvature_2);
  const a = curvature_1 !== 0 ? Math.abs(1 / curvature_1) : 20;
  const b = curvature_2 !== 0 ? Math.abs(1 / curvature_2) : 20;

  // Ellipse bounds
  const minX = center.x - a;
  const maxX = center.x + a;

  // For the Y bounds, include space above the ellipse for cells
  // The ellipse bottom is at center.y - b (if curvature_2 > 0)
  // Cells extend upward by h_init
  const ellipseBottom = center.y - b;
  const ellipseTop = center.y + b;

  // We want to show from below the ellipse to above where cells might be
  const minY = Math.min(ellipseBottom, 0) - 2;
  const maxY = Math.max(ellipseTop, h_init) + 2;

  return { minX, maxX, minY, maxY };
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
  private uiContainer: Container; // Non-transformed container for UI elements

  private theme: ColorTheme;
  private showScaleBar: boolean;

  private params: SimulationParams | null = null;

  // Viewport transform
  private scale = 1;
  private centerX = 0;
  private centerY = 0;

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
    this.uiContainer = new Container(); // For scale bar, text, etc.

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
    this.app.stage.addChild(this.uiContainer);
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
   * Update viewport transform based on basal curve geometry.
   * Centers view on the shape with 10% padding on each side.
   */
  private updateViewport(): void {
    if (!this.params) return;

    const pg = this.params.general;
    const canvasWidth = this.app.renderer.width;
    const canvasHeight = this.app.renderer.height;

    // Get bounds of the basal curve
    const bounds = getBasalCurveBounds(pg.curvature_1, pg.curvature_2, pg.h_init);

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
  render(state: SimulationState): void {
    if (!this.params) return;

    // Clear previous frame
    this.cellsContainer.removeChildren();
    this.linksContainer.removeChildren();
    this.overlayContainer.removeChildren();
    this.uiContainer.removeChildren();

    // Draw basal curve
    this.drawBasalCurve();

    // Draw links first (behind cells)
    this.drawBasalLinks(state);
    this.drawApicalLinks(state);

    // Draw cells
    this.drawCells(state);

    // Draw UI overlays (in screen space)
    if (this.showScaleBar) {
      this.drawScaleBar();
    }
  }

  /**
   * Draw the basal curve (ellipse or line).
   */
  private drawBasalCurve(): void {
    if (!this.params) return;

    const pg = this.params.general;
    const graphics = new Graphics();

    if (pg.curvature_1 === 0 && pg.curvature_2 === 0) {
      // Straight line
      graphics.moveTo(-50, 0);
      graphics.lineTo(50, 0);
      graphics.stroke({ color: 0xcccccc, alpha: 0.5, width: 0.05 });
    } else {
      // Ellipse
      const center = shapeCenter(pg.curvature_1, pg.curvature_2);
      const a = pg.curvature_1 !== 0 ? Math.abs(1 / pg.curvature_1) : 20;
      const b = pg.curvature_2 !== 0 ? Math.abs(1 / pg.curvature_2) : 20;

      graphics.ellipse(center.x, center.y, a, b);
      graphics.stroke({ color: 0xcccccc, alpha: 0.5, width: 0.05 });
    }

    this.linksContainer.addChild(graphics);
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
   * Draw scale bar in the bottom-right corner (in screen space).
   */
  private drawScaleBar(): void {
    const canvasWidth = this.app.renderer.width;
    const canvasHeight = this.app.renderer.height;

    // Scale bar: 10 μm = 2 simulation units
    const barLengthSim = 2; // simulation units
    const barLengthScreen = barLengthSim * this.scale;

    // Position in bottom-right corner with padding
    const padding = 20;
    const barX = canvasWidth - padding - barLengthScreen;
    const barY = canvasHeight - padding - 10;

    const graphics = new Graphics();

    // Draw the bar
    graphics.moveTo(barX, barY);
    graphics.lineTo(barX + barLengthScreen, barY);
    graphics.stroke({ color: this.theme.scaleBar, alpha: 1, width: 2 });

    // Draw end caps
    graphics.moveTo(barX, barY - 5);
    graphics.lineTo(barX, barY + 5);
    graphics.moveTo(barX + barLengthScreen, barY - 5);
    graphics.lineTo(barX + barLengthScreen, barY + 5);
    graphics.stroke({ color: this.theme.scaleBar, alpha: 1, width: 2 });

    this.uiContainer.addChild(graphics);

    // Text label
    const textStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: this.theme.text,
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
