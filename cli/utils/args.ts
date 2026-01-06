/**
 * CLI argument parsing utilities.
 */

export interface ParsedArgs {
  config?: string;
  output?: string;
  seed?: number;
  params: Record<string, string>;
  times?: { start: number; end: number; step: number };
  stats?: string[];
}

/**
 * Parse command line arguments.
 */
export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    params: {},
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '-c' || arg === '--config') {
      result.config = args[++i];
    } else if (arg === '-o' || arg === '--output') {
      result.output = args[++i];
    } else if (arg === '--seed') {
      result.seed = parseInt(args[++i], 10);
    } else if (arg === '--param') {
      const param = args[++i];
      const [key, value] = param.split('=');
      if (key && value !== undefined) {
        result.params[key] = value;
      }
    } else if (arg === '--times') {
      const timesStr = args[++i];
      const [start, end, step] = timesStr.split(',').map(Number);
      result.times = { start, end, step };
    } else if (arg === '--stats') {
      const statsStr = args[++i];
      result.stats = statsStr.split(',').map((s) => s.trim());
    }

    i++;
  }

  return result;
}

/**
 * Generate time sample array from start, end, step.
 */
export function generateTimeSamples(
  start: number,
  end: number,
  step: number
): number[] {
  const samples: number[] = [];
  for (let t = start; t <= end; t += step) {
    samples.push(t);
  }
  return samples;
}
