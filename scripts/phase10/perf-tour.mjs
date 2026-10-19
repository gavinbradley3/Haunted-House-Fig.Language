// Performance tour on Low at a Chromebook resolution, in a production (test) bundle:
// load time, then per location: frame rate, frame-time percentiles, draw calls and triangles per frame;
// shader programs compiled after the title screen (mid-game compiles cause stutters); textures; JS heap.
// The automatic resolution guard is switched off (?testdt) so every location is measured at the same resolution.
// Usage: node scripts/phase10/perf-tour.mjs <url> <tag> [WxH] [seconds per location]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2];
const tag = process.argv[3];
const [W, H] = (process.argv[4] ?? '1366x768').split('x').map(Number);
const secs = Number(process.argv[5] ?? 6);
const out = 'scripts/out/phase10/perf';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const t0 = Date.now();
await page.goto(`${base}?testdt`);
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000, polling: 50 });
const loadMs = Date.now() - t0;
await page.evaluate(() => {
  const s = window.__hosl.useGame.getState();
  s.setQuality('low');
  s.setEventLevel?.('off');
  s.progressDispatch({ type: 'GRANT', upTo: 'deskOpen' });
});
await page.waitForTimeout(4000); // let the title-screen precompile finish
const programsAtTitle = await page.evaluate(() => window.__hosl.programs());
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await page.mouse.move(3, 3);
await page.evaluate(() => {
  const s = window.__hosl.useGame.getState();
  for (const d of ['mirror', 'gallery', 'dining', 'jib', 'echoes', 'press', 'kitchen', 'ballroom', 'study']) s.setDoor(d, true);
  // Count every draw call in a frame (the effect composer renders several passes).
  const gl = window.__hosl.gl();
  gl.info.autoReset = false;
  window.__frame = { calls: 0, tris: 0 };
  const tick = () => {
    window.__frame = { calls: gl.info.render.calls, tris: gl.info.render.triangles };
    gl.info.reset();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const PLACES = [
  ['hall (entering)', [0, 1.65, -1.4], 0, 0],
  ['hall (fireplace)', [2.5, 1.65, -3.2], -1.3, -0.1],
  ['hall (looking up at landing)', [1.5, 1.65, -2.0], 0.15, 0.3],
  ['upper landing', [-3.2, 5.05, -8.7], -Math.PI / 2 + 0.3, -0.05],
  ['corridor', [0, 1.65, -11], 0, 0],
  ['hall of mirrors', [0, 1.65, -20.5], 0, 0],
  ['portrait gallery', [-3, 1.65, -14.1], Math.PI / 2, 0],
  ['dining room', [2.2, 1.65, -16.3], -Math.PI / 2 - 0.2, 0],
  ['nursery', [-5.6, 1.65, -23.4], Math.PI / 2 + 0.4, -0.06],
  ['chamber of echoes', [-5.9, 1.65, -28.7], 0.67, -0.04],
  ['whispering press', [-13.8, 1.65, -32], Math.PI / 2, -0.04],
  ['crooked kitchen', [7.1, 1.65, -8.4], -2.36, -0.05],
  ['ballroom', [9.4, 1.65, -19.8], -0.12, 0.02],
  ['scholar’s study', [-7.1, 1.65, -8.6], 2.39, -0.05],
];

async function measure(ms) {
  return page.evaluate(
    (ms) =>
      new Promise((res) => {
        const d = [];
        let calls = 0;
        let tris = 0;
        let last = performance.now();
        const t0 = last;
        const step = (now) => {
          d.push(now - last);
          last = now;
          calls += window.__frame.calls;
          tris += window.__frame.tris;
          if (now - t0 < ms) requestAnimationFrame(step);
          else {
            const n = d.length;
            d.shift();
            d.sort((a, b) => a - b);
            const avg = d.reduce((a, b) => a + b, 0) / d.length;
            const pct = (p) => +d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1);
            res({ fps: +(1000 / avg).toFixed(1), avgMs: +avg.toFixed(1), p50Ms: pct(0.5), p95Ms: pct(0.95), p99Ms: pct(0.99), worstMs: +d[d.length - 1].toFixed(1), drawCalls: Math.round(calls / n), trianglesK: +(tris / n / 1000).toFixed(1) });
          }
        };
        requestAnimationFrame(step);
      }),
    ms,
  );
}

const rows = [];
for (const [name, pos, yaw, pitch] of PLACES) {
  await page.evaluate(([p, y, pi]) => window.__hosl.useGame.getState().teleportTo({ position: p, yaw: y, pitch: pi }), [pos, yaw, pitch]);
  await page.waitForTimeout(2500);
  const r = await measure(secs * 1000);
  rows.push({ place: name, ...r });
  console.log(`${name.padEnd(30)} ${String(r.fps).padStart(5)} fps  p50 ${r.p50Ms} ms  p95 ${r.p95Ms} ms  worst ${r.worstMs} ms  ${r.drawCalls} draws  ${r.trianglesK}k tris`);
}
const after = await page.evaluate(() => ({
  programs: window.__hosl.programs(),
  textures: window.__hosl.gl().info.memory.textures,
  geometries: window.__hosl.gl().info.memory.geometries,
  heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
  dpr: window.__hosl.gl().getPixelRatio(),
  canvas: [window.__hosl.gl().domElement.width, window.__hosl.gl().domElement.height],
}));
const audio = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\.(mp3|ogg)/.test(e.name)).map((e) => ({ file: e.name.split('/').pop().replace(/-[A-Za-z0-9_]{8}\./, '.'), startS: +(e.startTime / 1000).toFixed(1), kB: Math.round(e.transferSize / 1024) })));
const summary = { tag, size: `${W}x${H}`, loadMs, programsAtTitle, ...after, programsCompiledAfterTitle: after.programs - programsAtTitle, audioRequests: audio };
console.log(JSON.stringify(summary, null, 1));
fs.writeFileSync(`${out}/${tag}.json`, JSON.stringify({ summary, rows }, null, 2));
await browser.close();
