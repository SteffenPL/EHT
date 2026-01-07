/**
 * Rendering module - public API exports
 *
 * Note: Model-specific rendering is handled by each model's renderer.
 * The SimulationRenderer provides the Pixi.js framework and delegates
 * to model renderers for actual drawing.
 */

export { SimulationRenderer } from './SimulationRenderer';
export type { RendererConfig } from './SimulationRenderer';
