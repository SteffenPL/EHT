/**
 * Composite renderer for the comparison view: superimposes multiple EHT
 * scenario states on one canvas with per-scenario palettes and alpha.
 *
 * Reuses the EHT renderer's exported scene drawing (renderEHTScene) and
 * bounding-box logic; scenarios are toggled via render options keyed
 * `show_<scenarioId>`.
 */
import type { ModelRenderer, BoundingBox } from '@/core/interfaces/renderer';
import type { BaseSimulationParams } from '@/core/registry';
import {
  ehtRenderer,
  renderEHTScene,
  resolveEHTRenderStyle,
} from '@/models/eht/renderer';
import { toEHTEngineParams } from '@/models/eht/compat/engine-params';
import type { EHTParams } from '@/models/eht/params/types';
import type { EHTSimulationState } from '@/models/eht/types';
import type { RenderableModel } from '@/rendering';
import type { ComparisonScenario } from './scenarios';

/** One scenario's draw entry: its resolved public params and current state. */
export interface ComparisonScenarioFrame {
  scenario: ComparisonScenario;
  params: EHTParams;
  state: EHTSimulationState;
}

/** Composite state rendered by the comparison renderer. */
export interface ComparisonFrame {
  scenarios: ComparisonScenarioFrame[];
}

/**
 * Params for the comparison canvas. Structurally satisfies
 * BaseSimulationParams for the shared renderer plumbing while carrying the
 * per-scenario EHT params needed for viewport bounds and rendering.
 */
export interface ComparisonParams extends BaseSimulationParams {
  scenarioParams: EHTParams[];
}

/** Build canvas params from resolved per-scenario params. */
export function buildComparisonParams(scenarioParams: EHTParams[]): ComparisonParams {
  const first = scenarioParams[0];
  return {
    metadata: { model: 'EHT-comparison', version: '1.0.0' },
    general: {
      t_end: first.general.t_end,
      dt: first.general.dt,
      random_seed: first.general.random_seed,
      n_substeps: first.general.n_substeps,
      w_screen: first.general.w_screen,
      h_screen: first.general.h_screen,
      mu: first.general.mu,
    },
    scenarioParams,
  };
}

export const comparisonRenderer: ModelRenderer<ComparisonParams, ComparisonFrame> = {
  render(ctx, frame: ComparisonFrame): void {
    for (const entry of frame.scenarios) {
      if (ctx.renderOptions?.[`show_${entry.scenario.id}`] === false) continue;
      const engineParams = entry.state.params ?? toEHTEngineParams(entry.params);
      const style = resolveEHTRenderStyle(ctx.isDark, entry.scenario.style);
      renderEHTScene(ctx, entry.state, engineParams, style);
    }
  },

  getBoundingBox(params: ComparisonParams): BoundingBox {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const scenarioParams of params.scenarioParams) {
      const box = ehtRenderer.getBoundingBox(scenarioParams);
      minX = Math.min(minX, box.minX);
      maxX = Math.max(maxX, box.maxX);
      minY = Math.min(minY, box.minY);
      maxY = Math.max(maxY, box.maxY);
    }

    return { minX, maxX, minY, maxY };
  },

  getBackgroundColor(isDark: boolean): number {
    return ehtRenderer.getBackgroundColor(isDark);
  },
};

/** Model-like object for SimulationCanvas's `model` prop (only the renderer is consumed). */
export const comparisonCanvasModel: RenderableModel = {
  renderer: comparisonRenderer,
};
