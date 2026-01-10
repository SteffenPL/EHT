import type { Graphics } from 'pixi.js';

/**
 * Generic interface for a model renderer.
 *
 * @template Params The type of the simulation parameters.
 * @template State The type of the simulation state.
 */

export interface BoundingBox {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface ModelRenderContext {
    graphics: {
        cells: Graphics;
        links: Graphics;
        overlay: Graphics;
    };
    isDark: boolean;
    scale: number;
}

export interface ModelRenderer<Params = any, State = any> {
    // Initialize any potential resources (textures etc)
    init?(): Promise<void>;

    // Render the current state
    render(ctx: ModelRenderContext, state: State, params: Params): void;

    // Get the bounding box of the simulation for viewport scaling
    getBoundingBox(params: Params, state?: State): BoundingBox;

    // Get background color
    getBackgroundColor(isDark: boolean): number;
}
