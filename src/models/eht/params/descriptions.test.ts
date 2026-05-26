import { describe, expect, it } from 'vitest';
import { getParameterDescription } from './descriptions';

describe('event parameter descriptions', () => {
  it('explains dependency-controlled start timing', () => {
    expect(getParameterDescription('events.time_range')).toContain('sampled after the prerequisite event fires');
    expect(getParameterDescription('events.prereq')).toContain('automatically controls this event');
  });

  it('explains conditional probability for dependent events', () => {
    const probability = getParameterDescription('events.probability') ?? '';
    const overview = getParameterDescription('events.overview') ?? '';

    expect(probability).toContain('conditional');
    expect(overview).toContain('A happens exactly in the cells where B happens');
  });
});
