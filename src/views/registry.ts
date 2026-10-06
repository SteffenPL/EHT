/**
 * View registry - top-level routable views.
 *
 * A *view* is a page that composes one or more simulations and presents them
 * (e.g. the main simulation workspace, or a scenario comparison). Views are
 * distinct from simulation *models* (src/models), which remain the unit of
 * registration in the model registry used by the engine, batch workers, and
 * the CLI. Views may reuse registered models and model internals directly.
 */
import type { ComponentType } from 'react';
import { SimulationView } from './simulation/SimulationView';
import { ComparisonView } from './comparison/ComparisonView';

export interface ViewDefinition {
  id: string;
  title: string;
  path: string;
  component: ComponentType;
}

/** All registered views. Array order defines header navigation order. */
export const VIEW_DEFINITIONS: ViewDefinition[] = [
  {
    id: 'simulation',
    title: 'Simulation',
    path: '/',
    component: SimulationView,
  },
  {
    id: 'comparison',
    title: 'Comparison',
    path: '/comparison',
    component: ComparisonView,
  },
];
