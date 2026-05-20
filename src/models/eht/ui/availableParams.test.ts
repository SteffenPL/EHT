import { describe, expect, it } from 'vitest';
import { DEFAULT_EHT_PARAMS } from '../params/defaults';
import { generateEHTBatchParameters } from './availableParams';

describe('generateEHTBatchParameters', () => {
  it('labels length sweep values as micron-facing', () => {
    const params = structuredClone(DEFAULT_EHT_PARAMS);
    const batchParams = generateEHTBatchParameters(params);

    expect(batchParams.find((p) => p.path === 'general.perimeter')?.label).toContain('(um)');
    expect(batchParams.find((p) => p.path === 'cell_types.control.R_soft')?.label).toContain('(um)');
    expect(batchParams.find((p) => p.path === 'cell_types.control.running_speed')?.label).toContain('(um)');
    expect(batchParams.find((p) => p.path === 'cell_types.control.stiffness_repulsion')?.label).not.toContain('(um)');
  });
});
