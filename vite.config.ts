import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { resolve } from 'path';

function getGitTagVersion(): string {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim().replace(/^v/, '');
  } catch {
    return '';
  }
}

export default defineConfig(({ command }) => {
  // Support custom subdirectory via VITE_BASE_SUBDIR env var (e.g., "beta" -> /internal/eht/beta/)
  const subdir = process.env.VITE_BASE_SUBDIR;
  const basePath = subdir ? `/internal/eht/${subdir}/` : '/internal/eht/';
  const gitTagVersion = getGitTagVersion();

  return {
    plugins: [react(), tailwindcss()],
    base: command === 'build' ? basePath : '/',
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@core': resolve(__dirname, './src/core'),
      },
    },
    define: {
      global: 'globalThis',
      'import.meta.env.VITE_GIT_TAG_VERSION': JSON.stringify(gitTagVersion),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
