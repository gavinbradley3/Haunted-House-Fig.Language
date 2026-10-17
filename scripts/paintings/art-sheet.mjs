// Plain sheet of artwork files (no game), for reading what each painting actually shows.
// Usage: node scripts/paintings/art-sheet.mjs <dir> <regex> <out.png> [cols] [cellWidth]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const [dir, pattern, outFile, colsArg, cellArg] = process.argv.slice(2);
const cols = Number(colsArg ?? 4), cell = Number(cellArg ?? 480);
const files = fs.readdirSync(dir).filter((f) => new RegExp(pattern).test(f)).sort();
const cells = files.map((f) => `<figure><img src="data:image/webp;base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}"><figcaption>${f}</figcaption></figure>`).join('');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: cols * (cell + 8), height: 300 } });
await p.setContent(`<style>body{margin:0;background:#222;color:#ddd;font:13px sans-serif;display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:8px;padding:4px;align-items:start}figure{margin:0}img{width:100%;display:block}</style>${cells}`);
await p.waitForTimeout(500);
await p.screenshot({ path: outFile, fullPage: true });
await b.close();
