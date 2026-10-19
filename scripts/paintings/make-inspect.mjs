// Builds the close-inspection images: the archive PNGs re-encoded as WebP at their native size
// (Chrome's encoder, no new dependency). They are loaded only when a student examines a painting,
// so in-game texture memory is unchanged. Usage: node scripts/paintings/make-inspect.mjs <nativePngDir> [quality]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const q = Number(process.argv[3] ?? 0.86);
const out = 'src/assets/paintings/inspect';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.setContent('<html></html>');
for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.png')).sort()) {
  const b64 = fs.readFileSync(path.join(src, f)).toString('base64');
  const res = await page.evaluate(async ({ b64, q }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    c.getContext('2d').drawImage(bmp, 0, 0);
    const blob = await c.convertToBlob({ type: 'image/webp', quality: q });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { w: bmp.width, h: bmp.height, b64: btoa(s), type: blob.type };
  }, { b64, q });
  if (res.type !== 'image/webp') throw new Error(`${f}: encoder produced ${res.type}`);
  const name = f.replace(/\.png$/, '.webp');
  fs.writeFileSync(path.join(out, name), Buffer.from(res.b64, 'base64'));
  console.log(name.padEnd(40), `${res.w}x${res.h}`, `${(fs.statSync(path.join(out, name)).size / 1024).toFixed(0)} KB`);
}
await browser.close();
