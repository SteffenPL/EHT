import type { TimeSampleConfig } from './types';

const TIME_EPSILON = 1e-9;
const MAX_TIME_POINTS = 10000;

export function formatTimeSampleConfig(config: TimeSampleConfig): string {
  return `${formatTimeValue(config.start)}:${formatTimeValue(config.step)}:${formatTimeValue(config.end)}`;
}

export function parseExportTimeSpec(spec: string, tEnd: number): number[] {
  if (!Number.isFinite(tEnd) || tEnd < 0) {
    throw new Error('t_end must be a non-negative number.');
  }

  const trimmed = spec.trim();
  if (!trimmed) {
    throw new Error('Enter at least one time or range.');
  }

  const times: number[] = [];
  const tokens = trimmed.split(',').map(token => token.trim()).filter(Boolean);

  if (tokens.length === 0) {
    throw new Error('Enter at least one time or range.');
  }

  for (const token of tokens) {
    if (token.includes(':')) {
      addRangeTimes(token, tEnd, times);
    } else {
      times.push(parseTimeValue(token, tEnd, 'time'));
    }

    if (times.length > MAX_TIME_POINTS) {
      throw new Error(`Time specification produces more than ${MAX_TIME_POINTS} points.`);
    }
  }

  const unique = new Map<string, number>();
  for (const time of times) {
    if (time < -TIME_EPSILON || time > tEnd + TIME_EPSILON) {
      throw new Error(`Time ${formatTimeValue(time)} is outside 0 to t_end (${formatTimeValue(tEnd)}).`);
    }
    const normalized = normalizeTime(time);
    unique.set(normalized.toString(), normalized);
  }

  return Array.from(unique.values()).sort((a, b) => a - b);
}

export function resolveExportCountLimit(
  value: number | null,
  total: number,
  label: string
): number {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error(`${label} total must be a non-negative integer.`);
  }

  if (value === null) {
    return total;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be at least 1.`);
  }

  return Math.min(value, total);
}

function addRangeTimes(token: string, tEnd: number, times: number[]): void {
  const parts = token.split(':').map(part => part.trim());
  if (parts.length !== 2 && parts.length !== 3) {
    throw new Error(`Invalid range "${token}". Use start:step or start:step:end.`);
  }

  const start = parseTimeValue(parts[0], tEnd, 'range start');
  const step = parseTimeValue(parts[1], tEnd, 'range step');
  const end = parts.length === 3 && parts[2] !== ''
    ? parseTimeValue(parts[2], tEnd, 'range end')
    : tEnd;

  if (step <= 0) {
    throw new Error(`Range "${token}" must use a positive step.`);
  }

  if (start > end + TIME_EPSILON) {
    throw new Error(`Range "${token}" starts after it ends.`);
  }

  let value = start;
  let count = 0;
  while (value <= end + TIME_EPSILON) {
    times.push(normalizeTime(Math.min(value, end)));
    value += step;
    count++;

    if (count > MAX_TIME_POINTS) {
      throw new Error(`Range "${token}" produces more than ${MAX_TIME_POINTS} points.`);
    }
  }

  const last = times[times.length - 1];
  if (last === undefined || Math.abs(last - end) > TIME_EPSILON) {
    times.push(normalizeTime(end));
  }
}

function parseTimeValue(raw: string, tEnd: number, label: string): number {
  if (raw === '' || raw.toLowerCase() === 't_end' || raw.toLowerCase() === 'end') {
    return tEnd;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${label} "${raw}".`);
  }

  if (value < 0) {
    throw new Error(`${label} must be non-negative.`);
  }

  return value;
}

function normalizeTime(value: number): number {
  return Number(value.toFixed(9));
}

function formatTimeValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toString();
}
