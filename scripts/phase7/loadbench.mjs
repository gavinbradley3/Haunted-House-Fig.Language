// Phase 7: isolated load cost of each pilot model on a settled page (UHD 630), 5 cold runs each.
// Optional CPU throttle (e.g. 4) approximates a slower school laptop CPU.
// Usage: node scripts/phase7/loadbench.mjs [cpuThrottle]
import { chromium } from 'playwright';
import fs from 'node:fs';

const throttle = Number(process.argv[2] ?? 1);
const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5180/preview/assets.html?quality=low');
await page.waitForFunction(() => window.__preview?.ready(), null, { timeout: 180000 });
await page.waitForTimeout(8000);
if (throttle > 1) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
}
const out = { cpuThrottle: throttle, models: {} };
for (const key of ['console', 'door', 'frame']) {
  const runs = [];
  for (let i = 0; i < 5; i++) runs.push(await page.evaluate((k) => window.__preview.benchLoad(k), key));
  const med = (f) => runs.map((r) => r[f]).sort((a, b) => a - b)[2];
  out.models[key] = { bytes: runs[0].bytes, textures: runs[0].textures, fetchMs: med('fetchMs'), parseMs: med('parseMs'), uploadMs: med('uploadMs') };
  console.log(key, JSON.stringify(out.models[key]));
}
fs.writeFileSync(`docs/phase7/loadbench-cpu${throttle}x.json`, JSON.stringify(out, null, 2));
await browser.close();
