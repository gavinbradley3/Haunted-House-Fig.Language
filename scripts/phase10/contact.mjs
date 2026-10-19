// Contact sheet of PNGs in a folder: node scripts/phase10/contact.mjs <dir> <out.png> [cols] [thumbW] [filter]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [dir, outFile, cols = 4, tw = 340, filter] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png') && (!filter || new RegExp(filter).test(f))).sort();
const th = Math.round((Number(tw) * 768) / 1366);
const html = `<body style="margin:0;background:#111;color:#ddd;font:12px sans-serif;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:4px;padding:4px">${files
  .map((f) => `<div><img src="data:image/png;base64,${fs.readFileSync(`${dir}/${f}`).toString('base64')}" style="width:${tw}px;height:${th}px;display:block"><div>${f.replace('.png', '')}</div></div>`)
  .join('')}</body>`;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: Number(cols) * (Number(tw) + 4) + 4, height: 400 } });
await p.setContent(html);
await p.screenshot({ path: outFile, fullPage: true });
await b.close();
