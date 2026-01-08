/**
 * EHT model renderer.
 * Handles all EHT-specific rendering: cells with apical/basal points, links, and curved membrane.
 */

import { Graphics } from 'pixi.js';
import type { ModelRenderContext, BoundingBox } from '@/core/registry/types';
import type { ModelRenderer } from '@/core/interfaces/renderer';
import type { EHTSimulationState, GeometryState } from './types';
import type { EHTParams } from './params/types';
import { shapeCenter } from '@/core/math/geometry';
import { computeEllipseFromPerimeter } from './params/geometry';

/**
 * Get curvatures from state.geometry or compute from params as fallback.
 */
function getCurvatures(state: EHTSimulationState | undefined, params: EHTParams): GeometryState {
  if (state?.geometry) {
    return state.geometry;
  }
  // Fallback: compute from params (e.g., for initial render before simulation starts)
  const geometry = computeEllipseFromPerimeter(params.general.perimeter, params.general.aspect_ratio);
  return {
    curvature_1: geometry.curvature_1,
    curvature_2: geometry.curvature_2,
  };
}

/** Theme colors for EHT rendering */
interface EHTThemeColors {
  apicalPoint: number;
  basalPoint: number;
  apicalLink: number;
  basalLink: number;
  cytoskeleton: number;
  membrane: number;
}

const LIGHT_THEME: EHTThemeColors = {
  apicalPoint: 0x961414,
  basalPoint: 0x000000,
  apicalLink: 0x640000,
  basalLink: 0x000000,
  cytoskeleton: 0x643200,
  membrane: 0xcccccc,
};

const DARK_THEME: EHTThemeColors = {
  apicalPoint: 0xff8f8f,
  basalPoint: 0xffffff,
  apicalLink: 0xff6b6b,
  basalLink: 0xeeeeee,
  cytoskeleton: 0xd4a574,
  membrane: 0x666666,
};

/**
 * Convert RGB to hex color number.
 */
function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

/**
 * Draw the basal membrane curve.
 */
function drawBasalCurve(graphics: Graphics, curvature_1: number, curvature_2: number, theme: EHTThemeColors): void {
  if (curvature_1 === 0 && curvature_2 === 0) {
    // Straight line
    graphics.moveTo(-50, 0);
    graphics.lineTo(50, 0);
    graphics.stroke({ color: theme.membrane, alpha: 0.5, width: 0.05 });
  } else {
    // Ellipse
    const center = shapeCenter(curvature_1, curvature_2);
    const a = curvature_1 !== 0 ? Math.abs(1 / curvature_1) : 20;
    const b = curvature_2 !== 0 ? Math.abs(1 / curvature_2) : 20;

    graphics.ellipse(center.x, center.y, a, b);
    graphics.stroke({ color: theme.membrane, alpha: 0.5, width: 0.05 });
  }
}

/**
 * Draw all cells with their apical/basal points and cytoskeleton.
 */
function drawCells(graphics: Graphics, state: EHTSimulationState, params: EHTParams, theme: EHTThemeColors): void {
  for (const cell of state.cells) {
    const cellType = params.cell_types[cell.typeIndex] ?? params.cell_types.control;
    const color = cellType.color;

    // Draw soft radius (semi-transparent ellipse)
    graphics.circle(cell.pos.x, cell.pos.y, cell.R_soft);
    graphics.fill({ color: rgbToHex(color.r, color.g, color.b), alpha: 0.4 });

    // Draw hard radius (solid circle)
    graphics.circle(cell.pos.x, cell.pos.y, cell.R_hard);
    graphics.fill({ color: rgbToHex(color.r, color.g, color.b), alpha: 1 });

    // Draw apical point
    graphics.circle(cell.A.x, cell.A.y, 0.1);
    graphics.fill({ color: theme.apicalPoint, alpha: 1 });

    // Draw basal point
    graphics.circle(cell.B.x, cell.B.y, 0.1);
    graphics.fill({ color: theme.basalPoint, alpha: 1 });

    // Draw cytoskeleton lines (A to pos, B to pos)
    graphics.moveTo(cell.A.x, cell.A.y);
    graphics.lineTo(cell.pos.x, cell.pos.y);
    graphics.lineTo(cell.B.x, cell.B.y);
    graphics.stroke({ color: theme.cytoskeleton, alpha: 0.5, width: 0.05 });
  }
}

/**
 * Draw apical links between neighboring cells.
 */
function drawApicalLinks(graphics: Graphics, state: EHTSimulationState, theme: EHTThemeColors): void {
  for (const link of state.ap_links) {
    const cellI = state.cells[link.l];
    const cellJ = state.cells[link.r];

    if (cellI && cellJ) {
      graphics.moveTo(cellI.A.x, cellI.A.y);
      graphics.lineTo(cellJ.A.x, cellJ.A.y);
    }
  }

  graphics.stroke({ color: theme.apicalLink, alpha: 1, width: 0.05 });
}

/**
 * Draw basal links between neighboring cells.
 */
function drawBasalLinks(graphics: Graphics, state: EHTSimulationState, theme: EHTThemeColors): void {
  for (const link of state.ba_links) {
    const cellI = state.cells[link.l];
    const cellJ = state.cells[link.r];

    if (cellI && cellJ) {
      graphics.moveTo(cellI.B.x, cellI.B.y);
      graphics.lineTo(cellJ.B.x, cellJ.B.y);
    }
  }

  graphics.stroke({ color: theme.basalLink, alpha: 1, width: 0.05 });
}

/**
 * EHT Model Renderer
 */
export const ehtRenderer: ModelRenderer<EHTParams, EHTSimulationState> = {
  getBoundingBox(params: EHTParams, state?: EHTSimulationState): BoundingBox {
    const { curvature_1, curvature_2 } = getCurvatures(state, params);
    const h_init = params.general.h_init;

    if (curvature_1 === 0 && curvature_2 === 0) {
      // Straight line case
      return { minX: -20, maxX: 20, minY: -2, maxY: h_init + 2 };
    }

    const center = shapeCenter(curvature_1, curvature_2);
    const a = curvature_1 !== 0 ? Math.abs(1 / curvature_1) : 20;
    const b = curvature_2 !== 0 ? Math.abs(1 / curvature_2) : 20;

    // Ellipse bounds with padding for cells
    const minX = center.x - a;
    const maxX = center.x + a;
    const ellipseBottom = center.y - b;
    const ellipseTop = center.y + b;

    const minY = Math.min(ellipseBottom, 0) - 2;
    const maxY = Math.max(ellipseTop, h_init) + 2;

    return { minX, maxX, minY, maxY };
  },

  render(ctx: ModelRenderContext, state: EHTSimulationState, params: EHTParams): void {
    const theme = ctx.isDark ? DARK_THEME : LIGHT_THEME;
    const cellsGraphics = ctx.graphics.cells as Graphics;
    const linksGraphics = ctx.graphics.links as Graphics;
    const { curvature_1, curvature_2 } = getCurvatures(state, params);

    // Draw basal membrane
    drawBasalCurve(linksGraphics, curvature_1, curvature_2, theme);

    // Draw links (behind cells)
    drawBasalLinks(linksGraphics, state, theme);
    drawApicalLinks(linksGraphics, state, theme);

    // Draw cells
    drawCells(cellsGraphics, state, params, theme);
  },

  getBackgroundColor(isDark: boolean): number {
    return isDark ? 0x111827 : 0xffffff;
  },
};
