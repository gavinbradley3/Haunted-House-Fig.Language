// In-game verification of the final painting collection (real GPU, Low quality).
//  - every painting texture loads at its exact size (no placeholder left)
//  - every lesson painting is still registered as interactive
//  - a screenshot of every painting in its frame, framed from in front at a sensible distance
//  - the Lady's two gaze states, the waiting portrait's moths, the caretaker's lightning, the blank canvas
// Usage: node scripts/paintings/ingame.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5180/';
const out = process.argv[3] ?? 'docs/paintings/screenshots/ingame';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && !/X4122|THREE.Clock/.test(m.text()) && logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('response', (r) => r.status() >= 400 && logs.push(`[http ${r.status()}] ${r.url()}`));

const t0 = Date.now();
await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 240000 });
const titleMs = Date.now() - t0;
await page.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
await page.evaluate(() => window.__hosl.nav.startIntro(true));
await page.waitForTimeout(3000);
await page.addStyleTag({ content: '[data-shot-hide]{visibility:hidden!important}' });
await page.evaluate(() => {
  for (const el of document.querySelectorAll('div,p,span,h1,h2'))
    if (/^Click to look around/.test(el.textContent?.trim() ?? '') && !el.querySelector('canvas') && el.children.length < 8) el.setAttribute('data-shot-hide', '');
});

// 1. Load state of every file (same module instance the game uses)
const isOriginal = process.argv.includes('--original'); // the release build has no painting files
if (!isOriginal)
  await page.waitForFunction(async () => {
    const m = await import('/src/systems/paintingImages.ts');
    return m.paintingLoadState().every((s) => s.loaded);
  }, null, { timeout: 60000, polling: 500 }).catch(() => {});
else await page.waitForTimeout(6000); // let the procedural painter finish
const loadState = isOriginal
  ? { files: [], sizeMismatches: [] }
  : await page.evaluate(async () => {
      const m = await import('/src/systems/paintingImages.ts');
      return { files: m.paintingLoadState(), sizeMismatches: m.sizeMismatches };
    });
const allLoadedMs = Date.now() - t0;

// 2. Interactions still registered
const interactive = await page.evaluate(() =>
  ['houseBreath', 'ladyOfHouse', 'whisperingWalls', 'coldFeet', 'caretaker', 'deafeningSilence', 'oldManShadow', 'nervousSitter', 'emptyFrame'].map((id) => {
    const it = window.__hosl.getInteractable(`painting-${id}`);
    return { id, registered: !!it, maxDist: it?.maxDist };
  }),
);

// 3. Find every painted canvas in the scene: world centre, facing and size.
// With --replay <report.json>, reuse another run's canvases (e.g. to shoot the original game identically).
const replay = process.argv.indexOf('--replay');
const canvases = replay > 0 ? JSON.parse(fs.readFileSync(process.argv[replay + 1], 'utf8')).canvases : await page.evaluate(() => {
  const THREE_V = (x, y, z) => ({ x, y, z });
  const out = [];
  window.__hosl.scene().traverse((o) => {
    const map = o.material?.map;
    if (!o.isMesh || !map || !/\.webp$|^$/.test(map.name ?? '') || o.geometry?.type !== 'PlaneGeometry') return;
    if (!map.name) return;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const nx = e[8], ny = e[9], nz = e[10];
    const nl = Math.hypot(nx, ny, nz);
    const sx = Math.hypot(e[0], e[1], e[2]);
    const sy = Math.hypot(e[4], e[5], e[6]);
    const p = o.geometry.parameters;
    out.push({ file: map.name, pos: THREE_V(e[12], e[13], e[14]), n: THREE_V(nx / nl, ny / nl, nz / nl), w: p.width * sx, h: p.height * sy, img: map.image ? [map.image.naturalWidth ?? map.image.width, map.image.naturalHeight ?? map.image.height] : null });
  });
  return out;
});

const poseFor = (c, extra = 1) => {
  const size = Math.max(c.h, c.w / 1.5);
  // Paintings hung high in the two-storey hall are seen from across the room, as a player sees them.
  const d = c.pos.y > 3 ? 8 : Math.max(1.1, size / 0.62 + 0.25) * extra;
  const eye = { x: c.pos.x + c.n.x * d, z: c.pos.z + c.n.z * d };
  const dir = { x: c.pos.x - eye.x, y: c.pos.y - 1.65, z: c.pos.z - eye.z };
  const len = Math.hypot(dir.x, dir.y, dir.z);
  return { position: [eye.x, 1.65, eye.z], yaw: Math.atan2(-dir.x, -dir.z), pitch: Math.asin(dir.y / len) };
};
const shoot = async (name, pose, settle = 2200) => {
  await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), pose);
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${out}/${name}.png` });
};

const shots = [];
for (const c of canvases.sort((a, b) => a.file.localeCompare(b.file))) {
  const name = c.file.replace(/\.webp$/, '');
  const pose = poseFor(c);
  await shoot(name, pose);
  const aspectCanvas = c.w / c.h;
  const aspectImage = c.img ? c.img[0] / c.img[1] : null;
  shots.push({ name, aspectCanvas: +aspectCanvas.toFixed(4), aspectImage: aspectImage && +aspectImage.toFixed(4), stretchPct: aspectImage ? +((aspectCanvas / aspectImage - 1) * 100).toFixed(2) : null });
  console.log(name.padEnd(36), 'canvas', aspectCanvas.toFixed(4), 'image', aspectImage?.toFixed(4));
}

// 4. Effects and states
const find = (f) => canvases.find((c) => c.file === f);
const lady = find('painting-ladyOfHouse.webp');
if (lady) {
  const far = { ...poseFor(lady, 1.0) };
  await page.evaluate(() => window.__hosl.hungPaintings.get('ladyOfHouse').swapArt('ladyOfHouseTurned'));
  await shoot('effect-lady-turned', far);
  await page.evaluate(() => window.__hosl.hungPaintings.get('ladyOfHouse').swapArt('ladyOfHouse'));
  await shoot('effect-lady-base', far);
  // As players see her: from the middle of the hall and from the front door
  await page.evaluate(() => window.__hosl.hungPaintings.get('ladyOfHouse').swapArt('ladyOfHouseTurned'));
  await shoot('effect-lady-turned-from-hall-centre', { position: [-1.0, 1.65, -4.6], yaw: -Math.PI / 2, pitch: 0.18 });
  await shoot('effect-lady-turned-from-front-door', { position: [-1.2, 1.65, -0.9], yaw: -Math.PI / 2 + 0.75, pitch: 0.1 });
  await page.evaluate(() => window.__hosl.hungPaintings.get('ladyOfHouse').swapArt('ladyOfHouse'));
  await shoot('effect-lady-base-from-front-door', { position: [-1.2, 1.65, -0.9], yaw: -Math.PI / 2 + 0.75, pitch: 0.1 });
}
const sitter = find('painting-nervousSitter.webp');
if (sitter) {
  // The lesson re-applies its defaults on state changes, so hold the moths on every frame.
  await page.evaluate(async () => {
    const { gfx } = await import('/src/lesson/galleryFx.ts');
    window.__holdMoths = true;
    const f = () => {
      if (!window.__holdMoths) return;
      gfx.sitter.targets.moths = 1;
      gfx.sitter.moths = 1;
      requestAnimationFrame(f);
    };
    f();
  });
  await shoot('effect-sitter-moths', poseFor(sitter, 0.8), 3000);
  await page.evaluate(() => (window.__holdMoths = false));
}
const caretaker = find('painting-caretaker.webp');
if (caretaker) {
  await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), poseFor(caretaker));
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const { gfx } = await import('/src/lesson/galleryFx.ts');
    window.__holdFlash = true;
    const f = () => {
      if (!window.__holdFlash) return;
      gfx.caretaker.flash = 1;
      requestAnimationFrame(f);
    };
    f();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/effect-caretaker-lightning.png` });
  await page.evaluate(() => (window.__holdFlash = false));
}
// The students' blank canvas (procedural, not part of the collection)
const blank = await page.evaluate(() => {
  const h = window.__hosl.hungPaintings.get('emptyFrame');
  if (!h) return null;
  const p = { x: 0, y: 0, z: 0 };
  h.group.updateWorldMatrix(true, false);
  const e = h.group.matrixWorld.elements;
  const nl = Math.hypot(e[8], e[9], e[10]);
  return { pos: { x: e[12], y: e[13] - 0.45, z: e[14] }, n: { x: e[8] / nl, y: e[9] / nl, z: e[10] / nl }, w: 0.72, h: 0.9 };
});
if (blank) await shoot('effect-empty-canvas-blank', poseFor(blank));

const report = { titleMs, allLoadedMs, loadState, interactive, shots, canvasesFound: canvases.length, canvases, logs };
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log('\nloaded', loadState.files.filter((f) => f.loaded).length, '/', loadState.files.length, 'mismatches', loadState.sizeMismatches.length);
console.log('interactive', interactive.filter((i) => i.registered).length, '/ 9');
console.log('canvases found', canvases.length, ' title', titleMs, 'ms  all loaded by', allLoadedMs, 'ms');
console.log(logs.slice(0, 15).join('\n'));
await browser.close();
