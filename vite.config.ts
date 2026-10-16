import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The classroom build must not contain the browser test hook (it exposes answers and progression
 * shortcuts). Outside dev and `--mode test`, src/testHook.ts is replaced with an empty stub.
 */
function stripTestHook(enabled: boolean): Plugin {
  return {
    name: 'hosl-strip-test-hook',
    enforce: 'pre',
    load(id) {
      if (enabled && /[\\/]src[\\/]testHook\.ts$/.test(id)) return 'export function installTestHook() {}';
    },
  };
}

export default defineConfig(({ command, mode }) => ({
  // Relative asset paths so the built game works from any folder or sub-path (Netlify, GitHub Pages, USB stick).
  base: './',
  plugins: [stripTestHook(command === 'build' && mode !== 'test'), react()],
  server: { host: true, port: 5173 },
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})) as never;
