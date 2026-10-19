import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Modules that must not ship in every build, replaced at build time with empty stubs:
 *  - src/testHook.ts exposes answers and progression shortcuts: only dev and `--mode test` keep it.
 *  - src/ui/TeacherPanel.tsx holds the teacher's bypasses (skip ahead, reveal, reset): only dev,
 *    `--mode test` and `--mode teacher` keep it. The student build (`npm run build`) has neither.
 */
function stripModules(opts: { testHook: boolean; teacher: boolean }): Plugin {
  return {
    name: 'hosl-strip-modules',
    enforce: 'pre',
    load(id) {
      if (opts.testHook && /[\\/]src[\\/]testHook\.ts$/.test(id)) return 'export function installTestHook() {}';
      if (opts.teacher && /[\\/]src[\\/]ui[\\/]TeacherPanel\.tsx$/.test(id)) return 'export function TeacherPanel() { return null; }';
    },
  };
}

export default defineConfig(({ command, mode }) => ({
  // Relative asset paths so the built game works from any folder or sub-path (Netlify, GitHub Pages, USB stick).
  base: './',
  plugins: [stripModules({ testHook: command === 'build' && mode !== 'test', teacher: command === 'build' && mode !== 'test' && mode !== 'teacher' }), react()],
  server: { host: true, port: 5173 },
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})) as never;
