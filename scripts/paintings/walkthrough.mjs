// Phase 9: how a student sees every painting (real GPU, Low quality, dev server).
// For each hung painting: a walking-distance view, a near-interaction view (with the prompt shown),
// and the inspection view opened through the painting's real interaction. On-screen brightness of the
// canvas (and of the wall around it) is measured from the walking-distance screenshot.
// Usage: node scripts/paintings/walkthrough.mjs <baseUrl> <outDir> [WxH] [--no-inspect] [--only=name,name]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5180/';
const out = process.argv[3] ?? 'docs/paintings/phase9/baseline';
const [W, H] = (process.argv[4] && /^\d+x\d+$/.test(process.argv[4]) ? process.argv[4] : '1920x1080').split('x').map(Number);
const noInspect = process.argv.includes('--no-inspect');
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const helper = await browser.newPage();
const logs = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && !/X4122|THREE.Clock/.test(m.text()) && logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('response', (r) => r.status() >= 400 && logs.push(`[http ${r.status()}] ${r.url()}`));

await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 240000 });
await page.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
await page.evaluate(() => window.__hosl.nav.startIntro(true));
await page.waitForTimeout(6000);
await page.addStyleTag({ content: '[data-shot-hide]{visibility:hidden!important}' });
await page.evaluate(() => {
  for (const el of document.querySelectorAll('div,p,span,h1,h2'))
    if (/^Click to look around/.test(el.textContent?.trim() ?? '') && !el.querySelector('canvas') && el.children.length < 8) el.setAttribute('data-shot-hide', '');
});

// Every hung canvas (by texture file name), plus the students' blank canvas.
const canvases = await page.evaluate(() => {
  const list = [];
  window.__hosl.scene().traverse((o) => {
    const map = o.material?.map;
    if (!o.isMesh || o.geometry?.type !== 'PlaneGeometry' || !map) return;
    const name = map.name?.replace(/\.webp$/, '') || (o.parent && window.__hosl.hungPaintings.get('emptyFrame')?.group && isIn(o, window.__hosl.hungPaintings.get('emptyFrame').group) ? 'painting-emptyFrame' : '');
    if (!name) return;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const nl = Math.hypot(e[8], e[9], e[10]);
    const p = o.geometry.parameters;
    list.push({ name, uuid: o.uuid, pos: { x: e[12], y: e[13], z: e[14] }, n: { x: e[8] / nl, y: e[9] / nl, z: e[10] / nl }, w: p.width * Math.hypot(e[0], e[1], e[2]), h: p.height * Math.hypot(e[4], e[5], e[6]) });
  });
  function isIn(o, a) { for (let q = o; q; q = q.parent) if (q === a) return true; return false; }
  return list.sort((a, b) => a.name.localeCompare(b.name));
});

// Where a student actually stands to see the paintings hung high in the two-storey hall (the landing,
// stair and balcony are in the way of a straight-back view), and the dining-room seascape by the window.
const STAND = {
  'decor-D01-hall-landing': [0, -1.0],
  'decor-D02-hall-stair-portrait': [2.6, -3.4],
  'decor-D03-hall-stair-landscape': [2.6, -5.6],
  'decor-D04-hall-east-stilllife': [-2.6, -1.9],
  'decor-D05-hall-east-sea': [-1.5, -5.0],
  'decor-D13-dining-south-sea': [9.4, -15.0],
};

/** Standing spots: march out along the painting's normal while the player could stand there. */
async function poses(c) {
  return page.evaluate(async ([c, stand]) => {
    const col = await import('/src/world/collision.ts');
    const lay = await import('/src/world/layout.ts');
    const free = (x, z, zone) => { const [rx, rz] = col.resolveCircle(x, z); return Math.hypot(rx - x, rz - z) < 1e-3 && lay.zoneAt(z, x) === zone; };
    const start = { x: c.pos.x + c.n.x * 0.5, z: c.pos.z + c.n.z * 0.5 };
    const zone = lay.zoneAt(start.z, start.x);
    let maxD = 0.5;
    for (let d = 0.5; d <= 10; d += 0.1) { if (!free(c.pos.x + c.n.x * d, c.pos.z + c.n.z * d, zone)) break; maxD = d; }
    const look = (ex, ez) => { const dx = c.pos.x - ex, dy = c.pos.y - 1.65, dz = c.pos.z - ez; const l = Math.hypot(dx, dy, dz); return { position: [ex, 1.65, ez], yaw: Math.atan2(-dx, -dz), pitch: Math.asin(dy / l) }; };
    const high = c.pos.y > 3;
    let walk;
    const target = high ? 8 : 3.6;
    if (maxD >= Math.min(target, 2.6)) { const d = Math.min(target, maxD); walk = look(c.pos.x + c.n.x * d, c.pos.z + c.n.z * d); }
    else {
      // A narrow corridor: seen at an angle while walking along it
      const t = { x: -c.n.z, z: c.n.x };
      const d = Math.max(0.6, maxD * 0.9);
      for (const s of [1, -1]) for (let a = 3; a >= 1.5; a -= 0.25) {
        const ex = c.pos.x + c.n.x * d + t.x * a * s, ez = c.pos.z + c.n.z * d + t.z * a * s;
        if (free(ex, ez, zone)) { walk = look(ex, ez); break; }
        if (walk) break;
      }
      walk ??= look(c.pos.x + c.n.x * d, c.pos.z + c.n.z * d);
    }
    if (stand) walk = look(stand[0], stand[1]);
    const nd = Math.min(1.6, maxD);
    const near = stand && c.pos.y > 3 ? walk : look(c.pos.x + c.n.x * nd, c.pos.z + c.n.z * nd);
    return { walk, near, maxFree: +maxD.toFixed(2), zone };
  }, [c, STAND[c.name] ?? null]);
}

/** Mean luminance and detail (std) of the canvas on screen, and the wall just around its frame. */
async function measure(pngPath, c) {
  const rect = await page.evaluate(async (c) => {
    const { renderer } = await import('/src/systems/renderer.ts');
    const cam = renderer.camera;
    const canvas = renderer.gl.domElement.getBoundingClientRect();
    const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => null);
    const right = { x: -c.n.z, y: 0, z: c.n.x };
    const pts = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const v = { x: c.pos.x + right.x * sx * c.w / 2, y: c.pos.y + sy * c.h / 2, z: c.pos.z + right.z * sx * c.w / 2 };
      const p = new cam.position.constructor(v.x, v.y, v.z).project(cam);
      pts.push([canvas.left + ((p.x + 1) / 2) * canvas.width, canvas.top + ((1 - p.y) / 2) * canvas.height, p.z]);
    }
    void THREE;
    return pts;
  }, c);
  const xs = rect.map((p) => p[0]), ys = rect.map((p) => p[1]);
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  const b64 = fs.readFileSync(pngPath).toString('base64');
  return helper.evaluate(async ({ b64, box }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const cv = new OffscreenCanvas(img.width, img.height);
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const stat = (inside) => {
      let s = 0, s2 = 0, n = 0;
      for (let y = 0; y < img.height; y += 2) for (let x = 0; x < img.width; x += 2) {
        if (!inside(x, y)) continue;
        const i = (y * img.width + x) * 4;
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        s += l; s2 += l * l; n++;
      }
      return n ? { mean: +(s / n).toFixed(1), std: +Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)).toFixed(1), px: n } : null;
    };
    const w = box.x1 - box.x0, h = box.y1 - box.y0;
    const inner = { x0: box.x0 + w * 0.1, x1: box.x1 - w * 0.1, y0: box.y0 + h * 0.1, y1: box.y1 - h * 0.1 };
    const onScreen = box.x1 > 0 && box.x0 < img.width && box.y1 > 0 && box.y0 < img.height;
    const canvas = onScreen ? stat((x, y) => x >= inner.x0 && x <= inner.x1 && y >= inner.y0 && y <= inner.y1) : null;
    const pad = Math.max(w, h) * 0.45;
    const wall = onScreen ? stat((x, y) => x >= box.x0 - pad && x <= box.x1 + pad && y >= box.y0 - pad && y <= box.y1 + pad && !(x >= box.x0 - w * 0.2 && x <= box.x1 + w * 0.2 && y >= box.y0 - h * 0.2 && y <= box.y1 + h * 0.2)) : null;
    return { box: { x0: Math.round(box.x0), y0: Math.round(box.y0), x1: Math.round(box.x1), y1: Math.round(box.y1) }, canvas, wall };
  }, { b64, box });
}

const hidePrompt = () => page.evaluate(() => {
  for (const el of document.querySelectorAll('div,p,span,h1,h2'))
    if (/^Click to look around/.test(el.textContent?.trim() ?? '') && !el.querySelector('canvas') && el.children.length < 8) el.setAttribute('data-shot-hide', '');
});
const results = [];
const tp = (p) => page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), p);
for (const c of canvases) {
  if (only.length && !only.some((o) => c.name.includes(o))) continue;
  const id = c.name.replace(/^painting-/, '').replace(/^decor-(D\d\d).*/, '$1');
  const p = await poses(c);
  const r = { name: c.name, id, zone: p.zone, maxFree: p.maxFree, size: [+c.w.toFixed(2), +c.h.toFixed(2)], heightY: +c.pos.y.toFixed(2) };
  await tp(p.walk);
  await page.waitForTimeout(2200);
  const walkPng = `${out}/walk-${c.name}.png`;
  await hidePrompt();
  await page.screenshot({ path: walkPng });
  r.walk = await measure(walkPng, c);
  await tp(p.near);
  await page.waitForTimeout(1800);
  r.prompt = await page.evaluate(() => window.__hosl.useGame.getState().hover?.label ?? null);
  // the prompt follows the centre ray only with the mouse captured; ask the interaction system directly too
  r.interactable = await page.evaluate((id) => {
    const ids = [`painting-${id}`, `decor-${id}`];
    const hit = ids.map((x) => window.__hosl.getInteractable(x)).find(Boolean);
    return hit ? { id: hit.id, label: hit.label(), maxDist: hit.maxDist } : null;
  }, id);
  await hidePrompt();
  await page.screenshot({ path: `${out}/near-${c.name}.png` });
  if (!noInspect && r.interactable) {
    await page.evaluate((iid) => window.__hosl.getInteractable(iid).onUse(), r.interactable.id);
    await page.waitForTimeout(2600);
    r.inspecting = await page.evaluate(() => window.__hosl.useGame.getState().inspecting);
    await page.screenshot({ path: `${out}/inspect-${c.name}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    r.closedByEsc = await page.evaluate(() => window.__hosl.useGame.getState().inspecting === null);
  }
  results.push(r);
  console.log(c.name.padEnd(38), 'walk canvas', JSON.stringify(r.walk?.canvas), 'wall', JSON.stringify(r.walk?.wall), r.interactable ? `[${r.interactable.label}]` : '[not interactive]');
}
fs.writeFileSync(`${out}/walkthrough-${W}x${H}.json`, JSON.stringify({ viewport: [W, H], results, logs }, null, 2));
console.log(logs.slice(0, 10).join('\n'));
await browser.close();
