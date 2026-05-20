/**
 * CLI command for listing available statistics.
 */

import { EHTHeadlessModel as EHTModel } from '../../src/models/eht/headless';
import { listStatistics } from '../../src/core/batch/statistics';

/**
 * List all available statistics.
 */
export function statsCommand(_args: string[]): void {
  const stats = listStatistics(EHTModel);

  console.log('\nAvailable Statistics\n');
  console.log('Use these IDs with --stats when running simulations.\n');
  console.log('Units: EHT distance statistics are reported in legacy engine units (1 unit = 5 microns). Multiply distance-like outputs by 5 for microns; ratios and fractions are unitless.\n');

  // Group statistics by category
  const categories: Record<string, typeof stats> = {
    'Distances (engine units)': stats.filter((s) =>
      s.id.startsWith('ab_distance_') ||
      s.id.startsWith('AX_') ||
      s.id.startsWith('BX_') ||
      s.id.startsWith('ax_') ||
      s.id.startsWith('bx_')
    ),
    'Position Ratios': stats.filter((s) => s.id.startsWith('x_')),
    'Fractions': stats.filter((s) =>
      s.id.startsWith('below_basal_') ||
      s.id.startsWith('above_apical_') ||
      s.id.startsWith('below_control_cells_')
    ),
  };

  for (const [category, categoryStats] of Object.entries(categories)) {
    if (categoryStats.length === 0) continue;

    console.log(`${category}:`);
    for (const stat of categoryStats) {
      console.log(`  ${stat.id.padEnd(24)} ${stat.description}`);
    }
    console.log();
  }

  console.log(`Total: ${stats.length} statistics available`);
  console.log('\nExample: npm run cli -- run --stats ab_distance_all,x_emt,below_basal_emt');
}
