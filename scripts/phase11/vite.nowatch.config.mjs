// The project's Vite config with file watching and hot reload off, for long browser test runs
// (an edit while a run is going would otherwise reload the page and end it).
// Usage: npx vite --config scripts/phase11/vite.nowatch.config.mjs --port 4192
import { mergeConfig } from 'vite';
import base from '../../vite.config.ts';

export default (env) => mergeConfig(base(env), { root: process.cwd(), server: { watch: { ignored: ['**/*'] }, hmr: false } });
