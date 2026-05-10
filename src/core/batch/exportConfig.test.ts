import { describe, expect, it } from 'vitest';
import {
  formatTimeSampleConfig,
  parseExportTimeSpec,
  resolveExportCountLimit,
  resolveExportFrameRange,
} from './exportConfig';

describe('parseExportTimeSpec', () => {
  it('parses comma-separated times and ranges with t_end as the default end', () => {
    expect(parseExportTimeSpec('0, 6, 12:24:', 100)).toEqual([0, 6, 12, 36, 60, 84, 100]);
  });

  it('accepts ranges without a trailing colon and includes the end point', () => {
    expect(parseExportTimeSpec('24:24', 72)).toEqual([24, 48, 72]);
    expect(parseExportTimeSpec('0:30:100', 100)).toEqual([0, 30, 60, 90, 100]);
  });

  it('deduplicates and sorts mixed time specifications', () => {
    expect(parseExportTimeSpec('48, 0:24:48, 24', 48)).toEqual([0, 24, 48]);
  });

  it('supports t_end aliases in explicit lists and ranges', () => {
    expect(parseExportTimeSpec('0, t_end, 20:40:end', 95)).toEqual([0, 20, 60, 95]);
  });

  it('rejects invalid syntax and out-of-range times', () => {
    expect(() => parseExportTimeSpec('', 48)).toThrow(/at least one time/);
    expect(() => parseExportTimeSpec('0:0:48', 48)).toThrow(/positive step/);
    expect(() => parseExportTimeSpec('-1, 12', 48)).toThrow(/non-negative/);
    expect(() => parseExportTimeSpec('12:bad:48', 48)).toThrow(/Invalid range step/);
    expect(() => parseExportTimeSpec('60', 48)).toThrow(/outside 0 to t_end/);
  });
});

describe('formatTimeSampleConfig', () => {
  it('formats batch time sample config as a range', () => {
    expect(formatTimeSampleConfig({ start: 0, step: 12, end: 48 })).toBe('0:12:48');
  });
});

describe('resolveExportCountLimit', () => {
  it('returns the total when no explicit limit is set', () => {
    expect(resolveExportCountLimit(null, 8, 'samples')).toBe(8);
  });

  it('caps explicit limits to the available total', () => {
    expect(resolveExportCountLimit(10, 8, 'samples')).toBe(8);
  });

  it('rejects invalid explicit limits', () => {
    expect(() => resolveExportCountLimit(0, 8, 'samples')).toThrow(/at least 1/);
    expect(() => resolveExportCountLimit(1.5, 8, 'samples')).toThrow(/at least 1/);
  });
});

describe('resolveExportFrameRange', () => {
  it('resolves an open-ended frame range to the maximum frame', () => {
    expect(resolveExportFrameRange(0, null, 480, 'Video frames')).toEqual({ start: 0, end: 480 });
  });

  it('caps explicit frame ends to the maximum frame', () => {
    expect(resolveExportFrameRange(10, 500, 120, 'Video frames')).toEqual({ start: 10, end: 120 });
  });

  it('rejects invalid frame ranges', () => {
    expect(() => resolveExportFrameRange(-1, null, 120, 'Video frames')).toThrow(/non-negative integer/);
    expect(() => resolveExportFrameRange(10, 9, 120, 'Video frames')).toThrow(/greater than or equal/);
    expect(() => resolveExportFrameRange(121, null, 120, 'Video frames')).toThrow(/no greater than 120/);
  });
});
