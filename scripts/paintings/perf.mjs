// Original vs final-collection performance on this GPU at Low: frame time, draw calls, textures, programs,
// and time until the title screen. Alternates the two builds (A B A B) to limit thermal drift.
// Usage: node scripts/paintings/perf.mjs <originalUrl> <newUrl> [rounds] [out.json]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [origUrl, newUrl, roundsArg, outFile] = process.argv.slice(2);
const rounds = Number(roundsArg ?? 2);
const views = {
  'hall-lady': { position: [-1.0, 1.65, -4.6], yaw: -Math.PI / 2, pitch: 0.18 },
  'hall-entry': { position: [0, 1.65, -1.2], yaw: 0, pitch: 0.05 },
  'gallery-caretaker': { position: [-7.4, 1.65, -14.1], yaw: Math.PI / 2, pitch: 0.12 },
  'gallery-north': { position: [-8.0, 1.65, -13.0], yaw: 0, pitch: 0.08 },
  'dining': { position: [6.0, 1.65, -13.0], yaw: -1.2, pitch: 0.08 },
};
async function run(url) {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 240000 });
  const titleMs = Date.now() - t0;
  await page.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
  await page.evaluate(() => window.__hosl.nav.startIntro(true));
  await page.waitForTimeout(8000);
  const res = { titleMs, views: {} };
  for (const [name, pose] of Object.entries(views)) {
    await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), pose);
    await page.waitForTimeout(2500);
    res.views[name] = await page.evaluate(() => new Promise((done) => {
      const i = window.__hosl.gl().info; i.autoReset = false; i.reset();
      const ts = []; let last = performance.now();
      const f = () => { const t = performance.now(); ts.push(t - last); last = t;
        if (ts.length < 150) return requestAnimationFrame(f);
        const s = ts.slice(10).sort((a, b) => a - b);
        const r = { meanMs: s.reduce((a, b) => a + b, 0) / s.length, p95Ms: s[Math.floor(s.length * 0.95)], calls: i.render.calls / ts.length, tris: i.render.triangles / ts.length, textures: i.memory.textures, programs: i.programs.length };
        i.autoReset = true; done(r); };
      requestAnimationFrame(f);
    }));
  }
  await browser.close();
  return res;
}
const all = { original: [], final: [] };
for (let r = 0; r < rounds; r++) {
  all.original.push(await run(origUrl)); console.log('original round', r + 1, 'done');
  all.final.push(await run(newUrl)); console.log('final round', r + 1, 'done');
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const summary = { titleMs: {}, views: {} };
for (const k of ['original', 'final']) summary.titleMs[k] = Math.round(med(all[k].map((x) => x.titleMs)));
for (const v of Object.keys(views)) {
  summary.views[v] = {};
  for (const k of ['original', 'final']) {
    const xs = all[k].map((x) => x.views[v]);
    summary.views[v][k] = { meanMs: +med(xs.map((x) => x.meanMs)).toFixed(1), p95Ms: +med(xs.map((x) => x.p95Ms)).toFixed(1), calls: Math.round(med(xs.map((x) => x.calls))), tris: Math.round(med(xs.map((x) => x.tris))), textures: xs[0].textures, programs: xs[0].programs };
  }
  console.log(v.padEnd(18), JSON.stringify(summary.views[v]));
}
console.log('title screen ready (ms)', summary.titleMs);
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ summary, raw: all }, null, 2));
