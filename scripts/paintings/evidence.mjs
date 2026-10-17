// Phase 9 evidence: hidden-clue close-ups in the viewer, the Lady's two states, the moths,
// and repeated-inspection performance (memory, textures, frame time).
// Usage: node scripts/paintings/evidence.mjs <url> <outDir> [--moths-only]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5180/';
const out = process.argv[3] ?? 'docs/paintings/phase9/evidence';
const mothsOnly = process.argv.includes('--moths-only');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 240000 });
await page.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
await page.evaluate(() => window.__hosl.nav.startIntro(true));
await page.waitForTimeout(6000);
await page.addStyleTag({ content: '.hint,.controls-hint{visibility:hidden!important}' });
const hide = () => page.evaluate(() => {
  for (const el of document.querySelectorAll('div,p,span,h1,h2'))
    if (/^Click to look around/.test(el.textContent?.trim() ?? '') && !el.querySelector('canvas') && el.children.length < 8) el.style.visibility = 'hidden';
});
const tp = (p) => page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), p);
const report = {};

// ---- the waiting portrait's moths, from the same spot on any build
{
  const pose = await page.evaluate(() => {
    const h = window.__hosl.hungPaintings.get('nervousSitter');
    h.group.updateWorldMatrix(true, false);
    const e = h.group.matrixWorld.elements;
    const n = Math.hypot(e[8], e[9], e[10]);
    const nx = e[8] / n, nz = e[10] / n;
    const x = e[12] + nx * 2.2, z = e[14] + nz * 2.2, y = e[13] - 0.6;
    return { position: [x, 1.65, z], yaw: Math.atan2(-(e[12] - x), -(e[14] - z)), pitch: Math.atan2(y - 1.65, 2.2) };
  });
  await page.evaluate(async () => {
    const { gfx } = await import('/src/lesson/galleryFx.ts');
    window.__hold = true;
    const f = () => { if (!window.__hold) return; gfx.sitter.targets.moths = 1; gfx.sitter.moths = 1; requestAnimationFrame(f); };
    f();
  });
  await tp(pose);
  for (const t of [3000, 900, 900]) {
    await page.waitForTimeout(t);
    await hide();
    await page.screenshot({ path: `${out}/moths-${report.mothShots = (report.mothShots ?? 0) + 1}.png` });
  }
  await page.evaluate(() => (window.__hold = false));
}
if (mothsOnly) { await browser.close(); process.exit(0); }

// ---- open a painting's viewer the way a student does (its interaction), optionally zoomed on a point
async function viewer(id, name, zoomAt) {
  await page.evaluate((id) => window.__hosl.getInteractable(`painting-${id}`).onUse(), id);
  await page.waitForFunction(() => { const i = [...document.querySelectorAll('.painting-viewer .pv-img')].pop(); return i?.complete && i.naturalWidth > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-full.png` });
  if (zoomAt) {
    const r = await page.evaluate(() => { const b = document.querySelector('.pv-canvas').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    const px = r.x + r.w * zoomAt[0], py = r.y + r.h * zoomAt[1];
    await page.mouse.move(px, py);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(120); }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}-zoom.png` });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

// The three small clues, as a curious student would zoom in on them
await viewer('deafeningSilence', 'clue-deafeningSilence', [0.5, 0.62]);
await viewer('D07', 'clue-D07-pewter-jug', [0.53, 0.6]);
await viewer('D16', 'clue-D16-dolls-house', [0.5, 0.2]);
await viewer('coldFeet', 'clue-coldFeet', null);
// Staff portraits (Easter eggs)
await viewer('caretaker', 'staff-caretaker', null);
await viewer('oldManShadow', 'staff-oldManShadow', null);

// The Lady's two states: in the viewer and from the middle of the hall
for (const [state, art] of [['base', 'ladyOfHouse'], ['turned', 'ladyOfHouseTurned']]) {
  await page.evaluate((a) => window.__hosl.hungPaintings.get('ladyOfHouse').swapArt(a), art);
  await viewer('ladyOfHouse', `lady-${state}`, [0.5, 0.2]);
  await tp({ position: [-1.0, 1.65, -4.6], yaw: -Math.PI / 2, pitch: 0.18 });
  await page.waitForTimeout(2000);
  await hide();
  await page.screenshot({ path: `${out}/lady-${state}-from-hall.png` });
}
await page.evaluate(() => window.__hosl.hungPaintings.get('ladyOfHouse').swapArt('ladyOfHouse'));

// ---- repeated inspection: memory, textures, frame time
const frame = () => page.evaluate(() => new Promise((res) => { const ts = []; let l = performance.now(); const f = () => { const t = performance.now(); ts.push(t - l); l = t; if (ts.length < 90) requestAnimationFrame(f); else { const s = ts.slice(10).sort((a, b) => a - b); res(+(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1)); } }; requestAnimationFrame(f); }));
const mem = () => page.evaluate(() => { window.gc?.(); const i = window.__hosl.gl().info; return { heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs.length, imgs: document.querySelectorAll('img').length }; });
await tp({ position: [-8.0, 1.65, -13.0], yaw: 0, pitch: 0.08 });
await page.waitForTimeout(2500);
report.before = { ...(await mem()), frameMs: await frame() };
const ids = ['caretaker', 'deafeningSilence', 'oldManShadow', 'nervousSitter', 'D06', 'D07', 'D08', 'D09'];
const openTimes = [];
for (let i = 0; i < 32; i++) {
  const id = ids[i % ids.length];
  const t0 = Date.now();
  await page.evaluate((id) => window.__hosl.getInteractable(`painting-${id}`).onUse(), id);
  await page.waitForFunction(() => { const im = [...document.querySelectorAll('.painting-viewer .pv-img')].pop(); return im?.complete && im.naturalWidth > 0; }, null, { timeout: 15000 });
  openTimes.push(Date.now() - t0);
  if (i === 3) report.whileOpenFrameMs = await frame();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
}
await page.waitForTimeout(1500);
report.after = { ...(await mem()), frameMs: await frame() };
report.openMs = { first8: openTimes.slice(0, 8), repeatMedian: openTimes.slice(8).sort((a, b) => a - b)[12] };
report.errors = errors;
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
await browser.close();
