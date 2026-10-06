/**
 * EHT model renderer.
 * Handles all EHT-specific rendering: cells with apical/basal points, links, and curved membrane.
 */

import { Graphics, Text, TextStyle } from 'pixi.js';
import type { ModelRenderContext, BoundingBox } from '@/core/registry/types';
import type { ModelRenderer } from '@/core/interfaces/renderer';
import type { EHTSimulationState, GeometryState } from './types';
import type { EHTParams } from './params/types';
import { shapeCenter } from '@/core/math/geometry';
import { computeEllipseFromPerimeter } from './params/geometry';
import { toEHTEngineParams } from './compat/engine-params';
import { calcAllForces } from './simulation/forces';
import { buildTissueLineSamples, sampleTissueLinePoints } from './tissue-lines';

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

/** Theme colors for EHT rendering (exported for composite renderers). */
export interface EHTThemeColors {
    apicalPoint: number;
    basalPoint: number;
    apicalLink: number;
    basalLink: number;
    cytoskeleton: number;
    membrane: number;
    forceArrow: number;
}

export const LIGHT_THEME: EHTThemeColors = {
  apicalPoint: 0x961414,
  basalPoint: 0x000000,
  apicalLink: 0x640000,
  basalLink: 0x000000,
  cytoskeleton: 0x643200,
  membrane: 0xcccccc,
  forceArrow: 0x2563eb,
};

const DARK_THEME: EHTThemeColors = {
  apicalPoint: 0xff8f8f,
  basalPoint: 0xffffff,
  apicalLink: 0xff6b6b,
  basalLink: 0xeeeeee,
  cytoskeleton: 0xd4a574,
  membrane: 0x666666,
  forceArrow: 0x93c5fd,
};

/**
 * Styling for a reusable EHT scene draw pass.
 * `theme` selects the palette, `alphaScale` scales every fill/stroke alpha
 * (useful for superimposing multiple scenes on one canvas).
 */
export interface EHTRenderStyle {
    theme: EHTThemeColors;
    alphaScale: number;
}

/** Optional styling overrides resolved over the active light/dark theme. */
export interface EHTRenderStyleOverrides {
    theme?: Partial<EHTThemeColors>;
    /** Multiplier applied to all fill/stroke alphas (default 1). */
    alphaScale?: number;
}

/** Resolve the effective render style from theme + optional overrides. */
export function resolveEHTRenderStyle(isDark: boolean, overrides?: EHTRenderStyleOverrides): EHTRenderStyle {
    return {
        theme: { ...(isDark ? DARK_THEME : LIGHT_THEME), ...overrides?.theme },
        alphaScale: overrides?.alphaScale ?? 1,
    };
}

/** Scale a base alpha by the style's alphaScale, clamped to [0, 1]. */
function scaledAlpha(style: EHTRenderStyle, value: number): number {
    return Math.max(0, Math.min(1, value * style.alphaScale));
}

function getDraggedCellIndex(renderOptions: Record<string, unknown>, state: EHTSimulationState): number | null {
  const value = renderOptions.draggedCellIndex;
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value >= 0 && value < state.cells.length ? value : null;
}

/**
 * Convert RGB to hex color number.
 */
function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

/**
 * Draw the basal membrane curve.
 */
function drawBasalCurve(graphics: Graphics, curvature_1: number, curvature_2: number, w_init: number, style: EHTRenderStyle): void {
  if (curvature_1 === 0 && curvature_2 === 0) {
    // Straight line - use w_init for extent
    const halfWidth = w_init / 2 + 5;
    graphics.moveTo(-halfWidth, 0);
    graphics.lineTo(halfWidth, 0);
    graphics.stroke({ color: style.theme.membrane, alpha: scaledAlpha(style, 0.5), width: 0.05 });
  } else {
    // Ellipse
    const center = shapeCenter(curvature_1, curvature_2);
    const a = curvature_1 !== 0 ? Math.abs(1 / curvature_1) : 20;
    const b = curvature_2 !== 0 ? Math.abs(1 / curvature_2) : 20;

    graphics.ellipse(center.x, center.y, a, b);
    graphics.stroke({ color: style.theme.membrane, alpha: scaledAlpha(style, 0.5), width: 0.05 });
  }
}

/**
 * Draw all cells with their apical/basal points and cytoskeleton.
 */
function drawCells(graphics: Graphics, state: EHTSimulationState, params: EHTParams, style: EHTRenderStyle): void {
  for (const cell of state.cells) {
    const cellType = params.cell_types[cell.typeIndex] ?? params.cell_types.control;
    const color = cellType.color;

    // Draw soft radius (semi-transparent ellipse)
    graphics.circle(cell.pos.x, cell.pos.y, cell.R_soft);
    graphics.fill({ color: rgbToHex(color.r, color.g, color.b), alpha: scaledAlpha(style, 0.4) });

    // Draw hard radius (solid circle)
    graphics.circle(cell.pos.x, cell.pos.y, cell.R_hard);
    graphics.fill({ color: rgbToHex(color.r, color.g, color.b), alpha: scaledAlpha(style, 1) });

    // Draw apical point
    graphics.circle(cell.A.x, cell.A.y, 0.1);
    graphics.fill({ color: style.theme.apicalPoint, alpha: scaledAlpha(style, 1) });

    // Draw basal point
    graphics.circle(cell.B.x, cell.B.y, 0.1);
    graphics.fill({ color: style.theme.basalPoint, alpha: scaledAlpha(style, 1) });

    // Draw cytoskeleton lines (A to pos, B to pos)
    graphics.moveTo(cell.A.x, cell.A.y);
    graphics.lineTo(cell.pos.x, cell.pos.y);
    graphics.lineTo(cell.B.x, cell.B.y);
    graphics.stroke({ color: style.theme.cytoskeleton, alpha: scaledAlpha(style, 0.5), width: 0.05 });
  }
}

/**
 * Draw apical links between neighboring cells.
 */
function drawApicalLinks(graphics: Graphics, state: EHTSimulationState, style: EHTRenderStyle): void {
  for (const link of state.ap_links) {
    const cellI = state.cells[link.l];
    const cellJ = state.cells[link.r];

    if (cellI && cellJ) {
      graphics.moveTo(cellI.A.x, cellI.A.y);
      graphics.lineTo(cellJ.A.x, cellJ.A.y);
    }
  }

  graphics.stroke({ color: style.theme.apicalLink, alpha: scaledAlpha(style, 1), width: 0.05 });
}

/**
 * Draw basal links between neighboring cells.
 */
function drawBasalLinks(graphics: Graphics, state: EHTSimulationState, style: EHTRenderStyle): void {
  for (const link of state.ba_links) {
    const cellI = state.cells[link.l];
    const cellJ = state.cells[link.r];

    if (cellI && cellJ) {
      graphics.moveTo(cellI.B.x, cellI.B.y);
      graphics.lineTo(cellJ.B.x, cellJ.B.y);
    }
  }

  graphics.stroke({ color: style.theme.basalLink, alpha: scaledAlpha(style, 1), width: 0.05 });
}

function drawPolyline(graphics: Graphics, points: { x: number; y: number }[], color: number, style: EHTRenderStyle): void {
  if (points.length < 2) return;

  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y);
  }
  graphics.stroke({ color, alpha: scaledAlpha(style, 0.75), width: 0.09 });
}

/**
 * Draw curved-coordinate control-cell tissue strips used by below_basal and above_apical.
 */
function drawTissueLines(graphics: Graphics, state: EHTSimulationState, params: EHTParams, style: EHTRenderStyle): void {
  const tissueLines = buildTissueLineSamples(state, params);
  const basalPoints = sampleTissueLinePoints(
    tissueLines.basal,
    tissueLines.geometry,
    tissueLines.fullCircle
  );
  const apicalPoints = sampleTissueLinePoints(
    tissueLines.apical,
    tissueLines.geometry,
    tissueLines.fullCircle
  );

  drawPolyline(graphics, basalPoints, style.theme.basalLink, style);
  drawPolyline(graphics, apicalPoints, style.theme.apicalLink, style);
}

/**
 * Draw cell IDs at the nucleus center of each cell.
 * Text is rendered in screen space (uiContainer) for crisp display.
 */
function drawCellIds(ctx: ModelRenderContext, state: EHTSimulationState): void {
  const style = new TextStyle({
    fontFamily: 'monospace',
    fontSize: 10,
    fill: ctx.isDark ? 0xffffff : 0x000000,
    fontWeight: 'bold',
  });

  const { width: canvasWidth, height: canvasHeight } = ctx.canvasSize;
  const { x: centerX, y: centerY } = ctx.viewportCenter;

  for (const cell of state.cells) {
    const text = new Text({ text: cell.id.toString(), style });
    text.anchor.set(0.5, 0.5);
    // Transform from simulation coordinates to screen coordinates
    const screenX = canvasWidth / 2 + (cell.pos.x - centerX) * ctx.scale;
    const screenY = canvasHeight / 2 - (cell.pos.y - centerY) * ctx.scale;
    text.position.set(screenX, screenY);
    ctx.uiContainer.addChild(text);
  }
}

/**
 * Draw the current net force on a dragged nucleus.
 */
function drawForceArrow(
  graphics: Graphics,
  state: EHTSimulationState,
  params: EHTParams,
  cellIndex: number,
  style: EHTRenderStyle
): void {
  const cell = state.cells[cellIndex];
  if (!cell) return;

  const forces = calcAllForces(state, params);
  const force = forces[cellIndex]?.f;
  if (!force || !Number.isFinite(force.x) || !Number.isFinite(force.y)) return;

  const magnitude = Math.hypot(force.x, force.y);
  if (magnitude < 1e-9) return;

  const ux = force.x / magnitude;
  const uy = force.y / magnitude;
  const minLength = Math.max(cell.R_soft * 0.8, 0.5);
  const maxLength = Math.max(cell.R_soft * 4, 1.5);
  const length = Math.min(maxLength, Math.max(minLength, magnitude * 0.35));
  const startX = cell.pos.x;
  const startY = cell.pos.y;
  const endX = startX + ux * length;
  const endY = startY + uy * length;
  const headLength = Math.min(length * 0.35, Math.max(cell.R_soft * 0.9, 0.35));
  const headWidth = headLength * 0.55;
  const px = -uy;
  const py = ux;

  graphics.moveTo(startX, startY);
  graphics.lineTo(endX, endY);
  graphics.stroke({ color: style.theme.forceArrow, alpha: scaledAlpha(style, 0.95), width: 0.1 });

  graphics.moveTo(endX, endY);
  graphics.lineTo(endX - ux * headLength + px * headWidth, endY - uy * headLength + py * headWidth);
  graphics.lineTo(endX - ux * headLength - px * headWidth, endY - uy * headLength - py * headWidth);
  graphics.closePath();
  graphics.fill({ color: style.theme.forceArrow, alpha: scaledAlpha(style, 0.95) });
}

/**
 * Draw a full EHT scene (basal curve, links, cells, optional tissue lines)
 * into the render context using the given style.
 *
 * Exported so composite renderers (e.g. the comparison view) can superimpose
 * multiple EHT scenes on one canvas with per-scene palettes and alpha.
 * `params` must already be in engine units (see toEHTEngineParams).
 */
export function renderEHTScene(
  ctx: ModelRenderContext,
  state: EHTSimulationState,
  engineParams: EHTParams,
  style: EHTRenderStyle
): void {
  const cellsGraphics = ctx.graphics.cells as Graphics;
  const linksGraphics = ctx.graphics.links as Graphics;
  const overlayGraphics = ctx.graphics.overlay as Graphics;
  const { curvature_1, curvature_2 } = getCurvatures(state, engineParams);

  // Draw basal membrane
  drawBasalCurve(linksGraphics, curvature_1, curvature_2, engineParams.general.w_init, style);

  // Draw links (behind cells)
  drawBasalLinks(linksGraphics, state, style);
  drawApicalLinks(linksGraphics, state, style);

  // Draw cells
  drawCells(cellsGraphics, state, engineParams, style);

  if (ctx.renderOptions?.showTissueLines) {
    drawTissueLines(overlayGraphics, state, engineParams, style);
  }
}

/**
 * EHT Model Renderer
 */
export const ehtRenderer: ModelRenderer<EHTParams, EHTSimulationState> = {
  getBoundingBox(params: EHTParams, state?: EHTSimulationState): BoundingBox {
    const engineParams = toEHTEngineParams(params);
    const { curvature_1, curvature_2 } = getCurvatures(state, engineParams);
    const h_init = engineParams.general.h_init;
    const w_init = engineParams.general.w_init;
    const w_screen = engineParams.general.w_screen;
    const h_screen = engineParams.general.h_screen;

    let minX: number, maxX: number, minY: number, maxY: number;

    if (curvature_1 === 0 && curvature_2 === 0) {
      // Straight line case - use w_init for width
      const halfWidth = w_init / 2 + 2; // Add small padding
      minX = -halfWidth;
      maxX = halfWidth;
      minY = -2;
      maxY = h_init + 2;
    } else {
      const center = shapeCenter(curvature_1, curvature_2);
      const a = curvature_1 !== 0 ? Math.abs(1 / curvature_1) : 20;
      const b = curvature_2 !== 0 ? Math.abs(1 / curvature_2) : 20;

      // Ellipse bounds with padding for cells
      minX = center.x - a;
      maxX = center.x + a;
      const ellipseBottom = center.y - b;
      const ellipseTop = center.y + b;

      minY = Math.min(ellipseBottom, 0) - 2;
      maxY = Math.max(ellipseTop, h_init) + 2;
    }

    // Apply minimum screen bounds (w_screen, h_screen) centered on the computed bounds
    const computedWidth = maxX - minX;
    const computedHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const finalWidth = Math.max(computedWidth, w_screen);
    const finalHeight = Math.max(computedHeight, h_screen);

    return {
      minX: centerX - finalWidth / 2,
      maxX: centerX + finalWidth / 2,
      minY: centerY - finalHeight / 2,
      maxY: centerY + finalHeight / 2,
    };
  },

  render(ctx: ModelRenderContext, state: EHTSimulationState, params: EHTParams): void {
    const engineParams = toEHTEngineParams(params);
    const style = resolveEHTRenderStyle(ctx.isDark);

    renderEHTScene(ctx, state, engineParams, style);

    const draggedCellIndex = getDraggedCellIndex(ctx.renderOptions, state);
    if (draggedCellIndex !== null) {
      drawForceArrow(ctx.graphics.overlay as Graphics, state, state.params ?? engineParams, draggedCellIndex, style);
    }

    // Draw cell IDs if enabled
    if (ctx.renderOptions?.showCellIds) {
      drawCellIds(ctx, state);
    }
  },

  getBackgroundColor(isDark: boolean): number {
    return isDark ? 0x111827 : 0xffffff;
  },
};
