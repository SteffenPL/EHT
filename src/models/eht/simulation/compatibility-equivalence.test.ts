import { describe, expect, it } from 'vitest';
import { EHTHeadlessModel } from '../headless';
import { DEFAULT_EHT_PARAMS, LEGACY_DEFAULT_EHT_PARAMS } from '../params/defaults';
import { EHTModel } from '../index';
import { ehtRenderer } from '../renderer';

function sampledCellRows(state = EHTHeadlessModel.init(DEFAULT_EHT_PARAMS, 'equiv')) {
  return EHTHeadlessModel.getSnapshot(state).slice(0, 8).map((row) => ({
    id: row.id,
    typeIndex: row.typeIndex,
    pos_x: row.pos_x,
    pos_y: row.pos_y,
    A_x: row.A_x,
    A_y: row.A_y,
    B_x: row.B_x,
    B_y: row.B_y,
    R_soft: row.R_soft,
    R_hard: row.R_hard,
  }));
}

describe('v2 compatibility adapter equivalence', () => {
  it('initializes v2 public defaults to the same engine snapshot as legacy defaults', () => {
    const v2State = EHTHeadlessModel.init(DEFAULT_EHT_PARAMS, 'equiv');
    const legacyState = EHTHeadlessModel.init(LEGACY_DEFAULT_EHT_PARAMS, 'equiv');

    const v2Rows = sampledCellRows(v2State);
    const legacyRows = sampledCellRows(legacyState);
    for (let i = 0; i < v2Rows.length; i++) {
      expect(v2Rows[i].id).toBe(legacyRows[i].id);
      expect(v2Rows[i].typeIndex).toBe(legacyRows[i].typeIndex);
      expect(Number(v2Rows[i].pos_x)).toBeCloseTo(Number(legacyRows[i].pos_x), 10);
      expect(Number(v2Rows[i].pos_y)).toBeCloseTo(Number(legacyRows[i].pos_y), 10);
      expect(Number(v2Rows[i].R_soft)).toBeCloseTo(Number(legacyRows[i].R_soft), 10);
      expect(Number(v2Rows[i].R_hard)).toBeCloseTo(Number(legacyRows[i].R_hard), 10);
    }
    expect(v2State.params!.general.perimeter).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.general.perimeter);
    expect(v2State.cells[0].R_soft).toBeCloseTo(LEGACY_DEFAULT_EHT_PARAMS.cell_types.control.R_soft);
  });

  it('keeps sampled trajectories equivalent after timesteps', () => {
    const v2State = EHTHeadlessModel.init(DEFAULT_EHT_PARAMS, 'equiv');
    const legacyState = EHTHeadlessModel.init(LEGACY_DEFAULT_EHT_PARAMS, 'equiv');

    for (let i = 0; i < 3; i++) {
      EHTHeadlessModel.step(v2State, DEFAULT_EHT_PARAMS.general.dt, DEFAULT_EHT_PARAMS);
      EHTHeadlessModel.step(legacyState, LEGACY_DEFAULT_EHT_PARAMS.general.dt, LEGACY_DEFAULT_EHT_PARAMS);
    }

    const v2Rows = sampledCellRows(v2State);
    const legacyRows = sampledCellRows(legacyState);
    for (let i = 0; i < v2Rows.length; i++) {
      expect(Number(v2Rows[i].pos_x)).toBeCloseTo(Number(legacyRows[i].pos_x), 10);
      expect(Number(v2Rows[i].pos_y)).toBeCloseTo(Number(legacyRows[i].pos_y), 10);
      expect(Number(v2Rows[i].A_x)).toBeCloseTo(Number(legacyRows[i].A_x), 10);
      expect(Number(v2Rows[i].B_y)).toBeCloseTo(Number(legacyRows[i].B_y), 10);
      expect(Number(v2Rows[i].R_soft)).toBeCloseTo(Number(legacyRows[i].R_soft), 10);
    }
  });

  it('keeps browser and headless adapters aligned', () => {
    const browserState = EHTModel.init(DEFAULT_EHT_PARAMS, 'equiv');
    const headlessState = EHTHeadlessModel.init(DEFAULT_EHT_PARAMS, 'equiv');

    expect(sampledCellRows(browserState)).toEqual(sampledCellRows(headlessState));
  });

  it('computes renderer bounds in engine scale for public v2 params', () => {
    const v2State = EHTHeadlessModel.init(DEFAULT_EHT_PARAMS, 'equiv');
    const legacyState = EHTHeadlessModel.init(LEGACY_DEFAULT_EHT_PARAMS, 'equiv');

    expect(ehtRenderer.getBoundingBox(DEFAULT_EHT_PARAMS, v2State)).toEqual(
      ehtRenderer.getBoundingBox(LEGACY_DEFAULT_EHT_PARAMS, legacyState)
    );
  });
});
