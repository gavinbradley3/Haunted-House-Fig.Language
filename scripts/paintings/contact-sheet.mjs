// Tiles screenshots into contact sheets for review. Usage: node scripts/paintings/contact-sheet.mjs <dir> <prefixRegex> <out.png> [cols]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const [dir, pattern, outFile, colsArg] = process.argv.slice(2);
const cols = Number(colsArg ?? 3);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png') && new RegExp(pattern).test(f)).sort();
const cells = files.map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`).join('');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: cols * 540, height: 400 } });
await page.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:14px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px}figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 4px}</style>${cells}`);
await page.waitForTimeout(500);
await page.screenshot({ path: outFile, fullPage: true });
await browser.close();
console.log(outFile, files.length);
