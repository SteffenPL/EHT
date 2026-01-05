/**
 * Simulation module - public API exports
 */

export { SimulationEngine } from './engine';
export type { SimulationEngineConfig } from './engine';

export { createCell, getCellType, updateCellPhase } from './cell';

export {
  calcAllForces,
  calcRepulsionForces,
  calcApicalNucleiForces,
  calcBasalNucleiForces,
  calcStraightnessForces,
  calcApicalJunctionForces,
  zeroForces,
} from './forces';
export type { CellForces } from './forces';

export {
  applyAllConstraints,
  projectHardSphereConstraints,
  projectBasalOrderingConstraints,
  projectMaxBasalDistanceConstraints,
  projectBasalCurveConstraints,
} from './constraints';

export {
  processEMTEvents,
  processLoseApicalAdhesion,
  processLoseBasalAdhesion,
  processLoseStraightness,
  processStartRunning,
  updateRunningState,
} from './events';

export { processCellDivisions } from './division';

export { performTimestep } from './timestep';
