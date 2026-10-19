// Decodes every painting WebP in Chrome (the game's renderer) and checks it is a real image:
// decoded size, mean brightness, nearly-uniform (failed export) detection. Then compares the two
// Lady of the House states pixel by pixel and reports where they differ.
// Usage: node scripts/paintings/check-images.mjs [dir] [outJson]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? 'src/assets/paintings';
const outJson = process.argv[3];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).sort();
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');

const results = [];
for (const f of files) {
  const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
  const r = await page.evaluate(async (b64) => {
    try {
      const blob = await (await fetch(`data:image/webp;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const g = c.getContext('2d');
      g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
      let sum = 0, sum2 = 0, n = 0, opaque = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        sum += l; sum2 += l * l; n++;
        if (d[i + 3] === 255) opaque++;
      }
      const mean = sum / n;
      return { decoded: true, w: bmp.width, h: bmp.height, mean: +mean.toFixed(1), std: +Math.sqrt(sum2 / n - mean * mean).toFixed(1), opaquePct: +((opaque / n) * 100).toFixed(1) };
    } catch (e) {
      return { decoded: false, error: String(e) };
    }
  }, b64);
  results.push({ file: f, ...r });
  console.log(f.padEnd(40), r.decoded ? `${r.w}x${r.h}  mean ${r.mean}  std ${r.std}  opaque ${r.opaquePct}%` : `DECODE FAILED ${r.error}`);
}

// The two Lady states: where do they differ?
const a = path.join(dir, 'painting-ladyOfHouse.webp');
const b = path.join(dir, 'painting-ladyOfHouse-turned.webp');
let lady = null;
if (fs.existsSync(a) && fs.existsSync(b)) {
  lady = await page.evaluate(async ([a64, b64]) => {
    const load = async (s) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/webp;base64,${s}`)).blob());
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const g = c.getContext('2d');
      g.drawImage(bmp, 0, 0);
      return { w: bmp.width, h: bmp.height, d: g.getImageData(0, 0, bmp.width, bmp.height).data };
    };
    const A = await load(a64);
    const B = await load(b64);
    if (A.w !== B.w || A.h !== B.h) return { sameSize: false };
    let changed = 0, maxDiff = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, outside = 0;
    const T = 6; // ignore sub-visible noise
    const diffs = new Uint8Array(A.w * A.h);
    for (let y = 0; y < A.h; y++)
      for (let x = 0; x < A.w; x++) {
        const i = (y * A.w + x) * 4;
        const d = Math.max(Math.abs(A.d[i] - B.d[i]), Math.abs(A.d[i + 1] - B.d[i + 1]), Math.abs(A.d[i + 2] - B.d[i + 2]));
        maxDiff = Math.max(maxDiff, d);
        if (d > T) {
          changed++;
          diffs[y * A.w + x] = 1;
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
    // How much change lies outside the central 90% of the changed pixels (stray flicker elsewhere)?
    const xs = [], ys = [];
    for (let i = 0; i < diffs.length; i++) if (diffs[i]) { xs.push(i % A.w); ys.push((i / A.w) | 0); }
    xs.sort((p, q) => p - q); ys.sort((p, q) => p - q);
    const q = (arr, f) => arr[Math.floor(arr.length * f)] ?? -1;
    const core = { x0: q(xs, 0.05), x1: q(xs, 0.95), y0: q(ys, 0.05), y1: q(ys, 0.95) };
    for (let i = 0; i < diffs.length; i++) {
      if (!diffs[i]) continue;
      const x = i % A.w, y = (i / A.w) | 0;
      if (x < core.x0 - 40 || x > core.x1 + 40 || y < core.y0 - 40 || y > core.y1 + 40) outside++;
    }
    return { sameSize: true, w: A.w, h: A.h, changedPct: +((changed / (A.w * A.h)) * 100).toFixed(2), maxDiff, bbox: { x0, y0, x1, y1 }, core, strayPixels: outside };
  }, [fs.readFileSync(a).toString('base64'), fs.readFileSync(b).toString('base64')]);
  console.log('\nLady states:', JSON.stringify(lady));
}
if (outJson) fs.writeFileSync(outJson, JSON.stringify({ results, lady }, null, 2));
await browser.close();
const bad = results.filter((r) => !r.decoded || r.std < 3);
process.exit(bad.length ? 1 : 0);
