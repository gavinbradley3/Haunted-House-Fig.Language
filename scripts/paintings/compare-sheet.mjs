// Before/after sheet: original (left) vs new (right) for each screenshot name matching a pattern.
// Usage: node scripts/paintings/compare-sheet.mjs <origDir> <newDir> <regex> <out.png>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const [a, b, pattern, outFile] = process.argv.slice(2);
const names = fs.readdirSync(b).filter((f) => f.endsWith('.png') && new RegExp(pattern).test(f) && fs.existsSync(path.join(a, f))).sort();
const img = (d, f) => `data:image/png;base64,${fs.readFileSync(path.join(d, f)).toString('base64')}`;
const rows = names.map((f) => `<div class=r><img src="${img(a, f)}"><img src="${img(b, f)}"><p>${f.replace('.png', '')} — original (left) · final collection (right)</p></div>`).join('');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 400 } });
await page.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:13px sans-serif;padding:6px}.r{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}img{width:100%}p{grid-column:1/3;margin:0}</style>${rows}`);
await page.waitForTimeout(400);
await page.screenshot({ path: outFile, fullPage: true });
await browser.close();
console.log(outFile, names.length);
