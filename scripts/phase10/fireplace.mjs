// Fireplace before/after: the same two views (close-up, and from where you enter the hall) on Low,
// three frames a second apart, plus frame timing. For the new fire it also measures, in the same
// session, the frame time with the new fire meshes hidden (an A/B that avoids page-to-page noise).
// Usage: node scripts/phase10/fireplace.mjs <url of a dev or test build> <tag>
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5190/';
const tag = process.argv[3] ?? 'after';
const [W, H] = (process.argv[4] ?? '1366x768').split('x').map(Number);
const out = 'scripts/out/phase10/fireplace';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => {
  const s = window.__hosl.useGame.getState();
  s.setQuality('low');
  s.setEventLevel('off');
});
await page.waitForTimeout(2500);
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await page.mouse.move(5, 5);
await page.addStyleTag({ content: '.free-hint, .location, .corner-buttons, .notice { display: none !important; }' });

const VIEWS = {
  close: { position: [4.05, 1.65, -4.6], yaw: -Math.PI / 2, pitch: -0.32 },
  hall: { position: [0, 1.65, -1.4], yaw: Math.atan2(-5.65, 3.2), pitch: -0.12 },
};

async function measure(ms = 5000) {
  return page.evaluate(
    (ms) =>
      new Promise((res) => {
        const d = [];
        let last = performance.now();
        const t0 = last;
        const gl = window.__hosl.gl();
        let calls = 0;
        let n = 0;
        const step = (now) => {
          d.push(now - last);
          last = now;
          calls += gl.info.render.calls;
          n++;
          if (now - t0 < ms) requestAnimationFrame(step);
          else {
            d.shift();
            d.sort((a, b) => a - b);
            const avg = d.reduce((a, b) => a + b, 0) / d.length;
            res({ fps: +(1000 / avg).toFixed(1), avgMs: +avg.toFixed(2), p95Ms: +d[Math.floor(d.length * 0.95)].toFixed(2), worstMs: +d[d.length - 1].toFixed(1), calls: Math.round(calls / n), frames: d.length });
          }
        };
        requestAnimationFrame(step);
      }),
    ms,
  );
}

const result = { tag, size: `${W}x${H}`, views: {} };
for (const [name, pose] of Object.entries(VIEWS)) {
  await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), pose);
  await page.waitForTimeout(2500);
  for (let i = 0; i < 3; i++) {
    await page.screenshot({ path: `${out}/${tag}-${name}-${i}.png` });
    await page.waitForTimeout(700);
  }
  const on = await measure();
  const r = { fireOn: on };
  // Hide only the new fire's shader meshes (flames, logs, embers) to measure what they cost.
  const hidden = await page.evaluate(() => {
    let n = 0;
    window.__hosl.scene().traverse((o) => {
      if (o.material?.isShaderMaterial && o.material.uniforms?.uLevel) {
        o.visible = false;
        n++;
      }
    });
    return n;
  });
  if (hidden) {
    await page.waitForTimeout(800);
    r.fireHidden = await measure();
    r.hiddenMeshes = hidden;
    await page.evaluate(() => window.__hosl.scene().traverse((o) => o.material?.uniforms?.uLevel && (o.visible = true)));
    await page.waitForTimeout(800);
    r.fireOnAgain = await measure();
  }
  r.programs = await page.evaluate(() => window.__hosl.programs());
  result.views[name] = r;
  console.log(name, JSON.stringify(r));
}
fs.writeFileSync(`${out}/${tag}-timing.json`, JSON.stringify(result, null, 2));
await browser.close();
