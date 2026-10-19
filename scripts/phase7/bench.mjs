// Phase 7 A/B benchmark in one session: preview/hall.html swaps between the original procedural
// assets and the pilots in place, so page load, texture state, GC and GPU clocks are shared.
// For each view: A B A B A B (or more), each 150 frames; reports medians.
// Usage: node scripts/phase7/bench.mjs [quality] [reps] [outFile]
import { chromium } from 'playwright';
import fs from 'node:fs';

const quality = process.argv[2] ?? 'low';
const reps = Number(process.argv[3] ?? 3);
const outFile = process.argv[4] ?? `docs/phase7/bench-${quality}.json`;
const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5180/preview/hall.html?pilot=1');
await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 240000 });
await page.evaluate((q) => window.__hosl.useGame.getState().setQuality(q), quality);
await page.waitForTimeout(3000);
await page.evaluate(() => window.__hosl.nav.startIntro(true));
await page.waitForFunction(() => window.__pilot?.ready, null, { timeout: 120000 });
await page.waitForTimeout(4000);

const sample = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const gl = window.__hosl.gl();
        const i = gl.info;
        i.autoReset = false;
        i.reset();
        const ts = [];
        let last = performance.now();
        const f = () => {
          const t = performance.now();
          ts.push(t - last);
          last = t;
          if (ts.length < 150) return requestAnimationFrame(f);
          const n = ts.length;
          const calls = i.render.calls / n;
          const tris = i.render.triangles / n;
          i.autoReset = true;
          const s = ts.slice(10).sort((a, b) => a - b);
          res({ mean: s.reduce((a, b) => a + b, 0) / s.length, p95: s[Math.floor(s.length * 0.95)], calls, tris });
        };
        requestAnimationFrame(f);
      }),
  );
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const views = {
  'hall-entry': { position: [0, 1.65, -1.2], yaw: 0, pitch: 0.05 },
  'console-and-painting': { position: [-3.0, 1.65, -7.3], yaw: 0, pitch: -0.12 },
  'console-close': { position: [-2.9, 1.45, -8.7], yaw: 0, pitch: -0.32 },
  'kitchen-door': { position: [3.4, 1.65, -8.6], yaw: -Math.PI / 2, pitch: 0 },
  'painting-close': { position: [-4.0, 1.75, -8.4], yaw: 0, pitch: 0.12 },
};
const result = { quality, reps, gpu: '', views: {} };
for (const [name, pose] of Object.entries(views)) {
  await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), pose);
  await page.waitForTimeout(1500);
  const runs = { original: [], pilot: [] };
  for (let r = 0; r < reps; r++) {
    for (const on of [false, true]) {
      await page.evaluate((on) => window.__pilot.show(on), on);
      await page.waitForTimeout(700);
      runs[on ? 'pilot' : 'original'].push(await sample());
    }
  }
  const summary = {};
  for (const k of ['original', 'pilot']) {
    summary[k] = {
      meanMs: +median(runs[k].map((x) => x.mean)).toFixed(2),
      p95Ms: +median(runs[k].map((x) => x.p95)).toFixed(2),
      calls: Math.round(median(runs[k].map((x) => x.calls))),
      tris: Math.round(median(runs[k].map((x) => x.tris))),
      spreadMs: +(Math.max(...runs[k].map((x) => x.mean)) - Math.min(...runs[k].map((x) => x.mean))).toFixed(2),
    };
  }
  summary.deltaMs = +(summary.pilot.meanMs - summary.original.meanMs).toFixed(2);
  summary.deltaPct = +((summary.deltaMs / summary.original.meanMs) * 100).toFixed(1);
  result.views[name] = summary;
  console.log(name, JSON.stringify(summary));
}
result.gpu = await page.evaluate(() => {
  const gl = window.__hosl.gl().getContext();
  return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
});
result.pilot = await page.evaluate(() => {
  const { show, ...rest } = window.__pilot;
  return rest;
});
fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log(result.gpu);
await browser.close();
