import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  // Support custom subdirectory via VITE_BASE_SUBDIR env var (e.g., "beta" -> /internal/eht/beta/)
  const subdir = process.env.VITE_BASE_SUBDIR;
  const basePath = subdir ? `/internal/eht/${subdir}/` : '/internal/eht/';

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
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  };
});
