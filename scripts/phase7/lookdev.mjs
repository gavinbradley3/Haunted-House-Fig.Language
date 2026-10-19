// Phase 7: quick look-development captures with material tweaks.
// Usage: node scripts/phase7/lookdev.mjs <view> <outName> '<tweak json>'
import { chromium } from 'playwright';
import fs from 'node:fs';

const [view = 'frames', name = 'lookdev', tweak = ''] = process.argv.slice(2);
const out = 'C:/Users/gavin.bradley/Desktop/hosl-asset-production/renders/lookdev';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const q = new URLSearchParams({ quality: 'low', view });
if (tweak) q.set('tweak', tweak);
await page.goto(`http://localhost:5180/preview/assets.html?${q}`);
await page.waitForFunction(() => window.__preview?.ready(), null, { timeout: 180000 });
await page.evaluate(() => (document.getElementById('hud').hidden = true));
await page.waitForTimeout(5000);
await page.screenshot({ path: `${out}/${name}.png` });
console.log(`${out}/${name}.png`);
await browser.close();
