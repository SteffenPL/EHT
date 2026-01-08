/**
 * Toy model renderer.
 * Renders simple circles for run-and-tumble cells with polarity indicators.
 */

import { Graphics } from 'pixi.js';
import type { ModelRenderer, ModelRenderContext, BoundingBox } from '@/core/registry/types';
import type { ToySimulationState } from './simulation/types';
import type { ToyParams } from './params/types';

/** Theme colors for Toy rendering */
interface ToyThemeColors {
  cellFill: number;
  cellStroke: number;
  polarityRunning: number;
  polarityTumbling: number;
  boundary: number;
}

const LIGHT_THEME: ToyThemeColors = {
  cellFill: 0x4a90d9,
  cellStroke: 0x2c5282,
  polarityRunning: 0x48bb78,
  polarityTumbling: 0xed8936,
  boundary: 0xcccccc,
};

const DARK_THEME: ToyThemeColors = {
  cellFill: 0x63b3ed,
  cellStroke: 0x90cdf4,
  polarityRunning: 0x68d391,
  polarityTumbling: 0xfbd38d,
  boundary: 0x666666,
};

/**
 * Draw the domain boundary.
 */
function drawBoundary(graphics: Graphics, params: ToyParams, theme: ToyThemeColors): void {
  const { boundary_type, domain_size } = params.general;
  const [width, height] = domain_size;

  if (boundary_type === 'none') return;

  // Draw domain rectangle
  // graphics.rect instead of graphics.drawRect in Pixi v8
  graphics.rect(0, 0, width, height);

  if (boundary_type === 'periodic') {
    // Dashed border for periodic
    graphics.stroke({ color: theme.boundary, alpha: 0.5, width: 0.1 });
  } else {
    // Solid border for box
    graphics.stroke({ color: theme.boundary, alpha: 0.8, width: 0.15 });
  }
}

/**
 * Draw all cells with polarity indicators.
 */
function drawCells(graphics: Graphics, state: ToySimulationState, params: ToyParams, theme: ToyThemeColors): void {
  const { soft_radius } = params.general;

  for (const cell of state.cells) {
    // Determine if cell is running
    const isRunning = cell.phase === 'running';
    const polarityColor = isRunning ? theme.polarityRunning : theme.polarityTumbling;

    // Draw cell body (soft radius)
    graphics.circle(cell.position.x, cell.position.y, soft_radius);
    graphics.fill({ color: theme.cellFill, alpha: 0.6 });
    graphics.stroke({ color: theme.cellStroke, alpha: 1, width: 0.05 });

    // Draw polarity indicator (arrow from center in direction of polarity)
    const arrowLength = soft_radius * 0.8;
    const arrowX = cell.position.x + cell.polarity.x * arrowLength;
    const arrowY = cell.position.y + cell.polarity.y * arrowLength;

    graphics.moveTo(cell.position.x, cell.position.y);
    graphics.lineTo(arrowX, arrowY);
    graphics.stroke({ color: polarityColor, alpha: 1, width: 0.1 });

    // Draw arrowhead
    const headSize = soft_radius * 0.3;
    const angle = Math.atan2(cell.polarity.y, cell.polarity.x);
    const headAngle = Math.PI / 6;

    graphics.moveTo(arrowX, arrowY);
    graphics.lineTo(
      arrowX - headSize * Math.cos(angle - headAngle),
      arrowY - headSize * Math.sin(angle - headAngle)
    );
    graphics.moveTo(arrowX, arrowY);
    graphics.lineTo(
      arrowX - headSize * Math.cos(angle + headAngle),
      arrowY - headSize * Math.sin(angle + headAngle)
    );
    graphics.stroke({ color: polarityColor, alpha: 1, width: 0.1 });
  }
}

/**
 * Toy Model Renderer
 */
export const toyRenderer: ModelRenderer<ToyParams, ToySimulationState> = {
  getBoundingBox(params: ToyParams, _state?: ToySimulationState): BoundingBox {
    const [width, height] = params.general.domain_size;
    const padding = params.general.soft_radius * 2;

    return {
      minX: -padding,
      maxX: width + padding,
      minY: -padding,
      maxY: height + padding,
    };
  },

  render(ctx: ModelRenderContext, state: ToySimulationState, params: ToyParams): void {
    const theme = ctx.isDark ? DARK_THEME : LIGHT_THEME;
    const cellsGraphics = ctx.graphics.cells as Graphics;
    const linksGraphics = ctx.graphics.links as Graphics;

    // Draw domain boundary
    drawBoundary(linksGraphics, params, theme);

    // Draw cells
    drawCells(cellsGraphics, state, params, theme);
  },

  getBackgroundColor(isDark: boolean): number {
    return isDark ? 0x111827 : 0xffffff;
  },
};
