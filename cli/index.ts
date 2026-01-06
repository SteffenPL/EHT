#!/usr/bin/env node
/**
 * CLI entry point for EHT Simulator.
 * Run simulations headlessly via `npm run cli`.
 */

import { runCommand } from './commands/run';
import { batchCommand } from './commands/batch';
import { statsCommand } from './commands/stats';

const args = process.argv.slice(2);
const command = args[0];

function showHelp(): void {
  console.log(`
EHT Simulator CLI

Usage:
  npm run cli -- <command> [options]

Commands:
  run       Run a single simulation
  batch     Run batch simulations with parameter sweeps
  stats     List all available statistics

Options for 'run':
  -c, --config <file>      TOML config file (optional, uses defaults if not provided)
  -o, --output <file>      Output CSV file (default: stdout)
  --seed <number>          Override random seed
  --param <key=value>      Override parameter (can be used multiple times)
  --times <start,end,step> Sample times in hours (default: 0,48,12)
  --stats <stat1,stat2>    Compute statistics (comma-separated)

Options for 'batch':
  -c, --config <file>      TOML batch config file (required)
  -o, --output <file>      Output CSV file (default: stdout)
  --stats <stat1,stat2>    Compute statistics (comma-separated, or 'all')

Examples:
  npm run cli -- run
  npm run cli -- run -c simulation.toml -o output.csv
  npm run cli -- run --seed 42 --times 0,24,6 --param general.N_emt=10
  npm run cli -- batch -c batch_config.toml -o results.csv --stats all
`);
}

async function main(): Promise<void> {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'run':
        await runCommand(args.slice(1));
        break;
      case 'batch':
        await batchCommand(args.slice(1));
        break;
      case 'stats':
        statsCommand(args.slice(1));
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
