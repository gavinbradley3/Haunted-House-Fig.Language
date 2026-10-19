// Phase 7: screenshots and statistics from the isolated asset preview (real GPU).
// Usage: node scripts/phase7/preview-shots.mjs [baseUrl] [quality] [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5180';
const quality = process.argv[3] ?? 'low';
const out = process.argv[4] ?? 'docs/phase7/screenshots/preview';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(`${base}/preview/assets.html?quality=${quality}&view=overview`);
await page.waitForFunction(() => window.__preview?.ready(), null, { timeout: 180000 });
const readyMs = Date.now() - t0;
await page.waitForTimeout(6000); // let the lazy painter finish the artwork

const frameMs = (n = 120) =>
  page.evaluate(
    (n) =>
      new Promise((res) => {
        const ts = [];
        let last = performance.now();
        const f = () => {
          const t = performance.now();
          ts.push(t - last);
          last = t;
          if (ts.length < n) requestAnimationFrame(f);
          else {
            const s = ts.slice(10).sort((a, b) => a - b);
            res({ mean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2) });
          }
        };
        requestAnimationFrame(f);
      }),
    n,
  );
const glInfo = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const i = window.__preview.gl().info;
        i.autoReset = false;
        i.reset();
        let k = 0;
        const g = () => {
          if (++k <= 5) return requestAnimationFrame(g);
          const r = { calls: Math.round(i.render.calls / 5), triangles: Math.round(i.render.triangles / 5), geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs.length };
          i.autoReset = true;
          res(r);
        };
        requestAnimationFrame(g);
      }),
  );

const views = (process.argv[5] ?? 'overview,consoles,doors,frames,variants,stretched,console-close,door-close,frame-close').split(',');
const results = { quality, readyMs, views: {} };
for (const v of views) {
  await page.evaluate((v) => window.__setView(v), v);
  await page.waitForTimeout(1200);
  results.views[v] = { frame: await frameMs(), gl: await glInfo() };
  await page.screenshot({ path: `${out}/${quality}-${v}.png` });
  console.log(v, JSON.stringify(results.views[v]));
}
// doors open
await page.evaluate(() => window.__preview.swing(true));
await page.evaluate(() => window.__setView('doors'));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/${quality}-doors-open.png` });
results.assets = await page.evaluate(() => window.__preview.stats());
results.loadTimes = await page.evaluate(() => window.__preview.loadTimes());
results.gpu = await page.evaluate(() => {
  const gl = window.__preview.gl().getContext();
  return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
});
fs.writeFileSync(`${out}/${quality}-stats.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.assets, null, 1));
console.log('load', results.loadTimes, 'ready', readyMs, results.gpu);
console.log(logs.filter((l) => /error|warn/i.test(l) && !/X4122|THREE.Clock/.test(l)).slice(0, 15).join('\n'));
await browser.close();
