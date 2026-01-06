/**
 * CLI command for listing available statistics.
 */

import { listStatistics } from '../../src/core/batch/statistics';

/**
 * List all available statistics.
 */
export function statsCommand(_args: string[]): void {
  const stats = listStatistics();

  console.log('\nAvailable Statistics\n');
  console.log('Use these IDs with --stats when running simulations.\n');

  // Group statistics by category
  const categories: Record<string, typeof stats> = {
    'Cell Counts': stats.filter((s) => s.id.startsWith('n_cells')),
    'Position (Y)': stats.filter((s) => s.id.includes('_y_')),
    'Position (X)': stats.filter((s) => s.id.includes('_x_')),
    'Adhesion State': stats.filter((s) => s.id.startsWith('emt_') && !s.id.includes('age')),
    'Distance': stats.filter((s) => s.id.includes('distance')),
    'Tissue Dimensions': stats.filter((s) => s.id.startsWith('tissue_')),
    'Neighbors': stats.filter((s) => s.id.includes('neighbor')),
    'Age': stats.filter((s) => s.id.includes('age')),
    'Cell Phase': stats.filter((s) => s.id.startsWith('cells_in')),
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
  console.log('\nExample: npm run cli -- run --stats n_cells_total,emt_escaped,avg_y_emt');
}
