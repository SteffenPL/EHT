/**
 * Integration tests for CLI commands.
 * Tests basic CLI functionality without checking detailed output.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Integration Tests', () => {
  it('should run stats command without error', () => {
    const result = execSync('npm run cli -- stats', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Check that output contains expected statistics
    expect(result).toContain('ab_distance_all');
    expect(result).toContain('ab_distance_control');
    expect(result).toContain('ab_distance_emt');
  });

  it('should run a simple simulation without error', () => {
    // Run a very short simulation
    const result = execSync('npm run cli -- run --times 0,0.01,0.01', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000, // 30 second timeout
    });

    // Check that we got CSV output (headers)
    expect(result).toContain('run_index');
    expect(result).toContain('seed');
    expect(result).toContain('time_h');
  });

  it('should run batch simulation with TOML config', () => {
    // Create a temporary TOML file
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eht-test-'));
    const tomlPath = path.join(tempDir, 'test_batch.toml');

    const tomlContent = `[general]
N_init = 10
t_end = 0.01
dt = 0.001
random_seed = 42

[parameter_ranges]
# No parameter sweeps

[batch]
seeds_per_config = 1
time_samples = "0,0.01"
`;

    fs.writeFileSync(tomlPath, tomlContent);

    try {
      // Run batch command
      const result = execSync(`npm run cli -- batch -c ${tomlPath}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60000, // 60 second timeout
      });

      // Check that we got CSV output
      expect(result).toContain('run_index');
      expect(result).toContain(',42,'); // seed is in a column, not header

      // Check that we got at least 2 snapshots (t=0 and t=0.01)
      const lines = result.split('\n').filter(l => l.trim().length > 0);
      expect(lines.length).toBeGreaterThan(10); // Header + data rows for 10 cells
    } finally {
      // Clean up
      fs.unlinkSync(tomlPath);
      fs.rmdirSync(tempDir);
    }
  });

  it('should run batch simulation with parameter sweep', () => {
    // Create a temporary TOML file with a parameter sweep
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eht-test-'));
    const tomlPath = path.join(tempDir, 'test_sweep.toml');

    const tomlContent = `[general]
N_init = 5
t_end = 0.01
dt = 0.001
random_seed = 42

[[parameter_ranges]]
path = "general.N_init"
values = [5, 6]

[batch]
seeds_per_config = 1
time_samples = "0,0.01"
`;

    fs.writeFileSync(tomlPath, tomlContent);

    try {
      // Run batch command
      const result = execSync(`npm run cli -- batch -c ${tomlPath}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60000, // 60 second timeout
      });

      // Check that we got CSV output
      expect(result).toContain('run_index');

      // Check that we have data from both runs (run_index 0 and 1)
      expect(result).toContain(',0,');
      expect(result).toContain(',1,');
    } finally {
      // Clean up
      fs.unlinkSync(tomlPath);
      fs.rmdirSync(tempDir);
    }
  });
});
