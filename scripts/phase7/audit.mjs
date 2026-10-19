// Phase 7 visual audit: real-GPU screenshots of the entrance hall at a chosen quality,
// with draw calls, triangles and frame time for each view.
// Usage: node scripts/phase7/audit.mjs [baseUrl] [quality] [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5180/';
const quality = process.argv[3] ?? 'low';
const out = process.argv[4] ?? 'docs/phase7/screenshots/audit';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', (m) => m.type() !== 'debug' && logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('response', (r) => r.status() >= 400 && logs.push(`[http ${r.status()}] ${r.url()}`));

await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 240000 });
await page.evaluate((q) => window.__hosl.useGame.getState().setQuality(q), quality);
await page.waitForTimeout(4000);
await page.evaluate(() => window.__hosl.nav.startIntro(true));
await page.waitForTimeout(5000);
// preview/hall.html: wait until the pilot models are installed (absent on the real game page)
await page.waitForFunction(() => !window.__pilot || window.__pilot.pilot === false || window.__pilot.ready, null, { timeout: 120000 });
// Hide the "Click to look around" prompt so it does not cover the furniture in screenshots
await page.addStyleTag({ content: "[data-shot-hide]{visibility:hidden!important}" });
await page.evaluate(() => { for (const el of document.querySelectorAll("div,p,span,h1,h2")) if (/^Click to look around/.test(el.textContent?.trim() ?? "") && !el.querySelector("canvas") && el.children.length < 8) { el.setAttribute("data-shot-hide", ""); } });
await page.waitForTimeout(2000);

/** Mean and 95th-percentile frame time over n frames, plus renderer counters for one frame. */
const measure = (n = 150) =>
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
            const gl = window.__hosl.gl();
            const i = gl.info;
            // The post-processing passes reset the counters mid-frame, and shadow maps refresh every 0.25 s,
            // so accumulate over 60 whole frames.
            i.autoReset = false;
            i.reset();
            let k = 0;
            const g = () => {
              if (++k <= 60) return requestAnimationFrame(g);
              const r = {
                meanMs: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2),
                p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(2),
                calls: Math.round(i.render.calls / 60),
                triangles: Math.round(i.render.triangles / 60),
                geometries: i.memory.geometries,
                textures: i.memory.textures,
                programs: i.programs?.length,
              };
              i.autoReset = true;
              res(r);
            };
            requestAnimationFrame(g);
          }
        };
        requestAnimationFrame(f);
      }),
    n,
  );

const views = [
  ['hall-entry', { position: [0, 1.65, -1.2], yaw: 0, pitch: 0.05 }],
  ['console-and-painting', { position: [-3.0, 1.65, -7.3], yaw: 0, pitch: -0.12 }],
  ['console-close', { position: [-2.9, 1.45, -8.7], yaw: 0, pitch: -0.32 }],
  ['kitchen-door', { position: [3.4, 1.65, -8.6], yaw: -Math.PI / 2, pitch: 0 }],
  ['front-doors', { position: [0.3, 1.65, -5.5], yaw: Math.PI, pitch: 0.05 }],
  ['painting-close', { position: [-4.0, 1.75, -8.4], yaw: 0, pitch: 0.12 }],
];
const results = {};
for (const [name, pose] of views) {
  await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), pose);
  await page.waitForTimeout(2500);
  results[name] = await measure();
  await page.screenshot({ path: `${out}/${quality}-${name}.png` });
  console.log(name, JSON.stringify(results[name]));
}
// The kitchen door swinging open (animation and pivot check)
await page.evaluate(() => {
  const s = window.__hosl.useGame.getState();
  s.setDoor('kitchen', true);
  s.teleportTo({ position: [3.1, 1.65, -7.2], yaw: -1.12, pitch: -0.05 });
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/${quality}-kitchen-door-open.png` });
results.pilot = await page.evaluate(() => window.__pilot ?? null);
results.gpu = await page.evaluate(() => {
  const gl = window.__hosl.gl().getContext();
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  return gl.getParameter(d.UNMASKED_RENDERER_WEBGL);
});
results.quality = quality;
fs.writeFileSync(`${out}/${quality}-metrics.json`, JSON.stringify(results, null, 2));
console.log(results.gpu);
console.log(logs.filter((l) => /error|warn/i.test(l)).slice(0, 10).join('\n'));
await browser.close();
