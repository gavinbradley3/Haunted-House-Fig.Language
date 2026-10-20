// Where the Lady can be seen: a screenshot of her at each apparition spot, from where a student would stand.
// Usage: node scripts/phase11/spots.mjs [devUrl]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4191/';
const out = 'scripts/out/phase11/spots';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const wait = (ms) => page.waitForTimeout(ms);
await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await page.addStyleTag({ content: '.free-hint, .objective { display: none !important; }' });
await page.evaluate(() => {
  window.__hosl.holdHaunting(1e6);
  window.__hosl.useGame.getState().setDoor('mirror', true);
});
const face = (from, target) => {
  const dx = target[0] - from[0], dy = target[1] - from[1], dz = target[2] - from[2];
  return page.evaluate(([p, y, pi]) => window.__hosl.useGame.getState().teleportTo({ position: p, yaw: y, pitch: pi }), [from, Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))]);
};
const VIEWS = [
  ['landing-west', [1.5, 1.65, -2.0], [-1.5, 4.4, -9.45]],
  ['landing-east', [-1.0, 1.65, -2.0], [1.4, 4.4, -9.45]],
  ['mirror-door', [0, 1.65, -6], [0.4, 1.1, -18.3]],
  ['mirrors-end', [0, 1.65, -20.2], [1.1, 1.1, -30.2]],
  ['corridor-back', [0.2, 1.65, -21.5], [-0.3, 1.1, -10.9]],
  ['gallery-west', [-3.0, 1.65, -13.4], [-13.7, 1.1, -15.1]],
  ['dining-east', [2.4, 1.65, -15.4], [11.8, 1.1, -17.5]],
  ['hall-front', [0, 1.65, -14], [-1.1, 1.1, -1.4]],
];
for (const [name, from, target] of VIEWS) {
  await face(from, target);
  await wait(3500);
  const ok = await page.evaluate((n) => window.__hosl.apparitionAt(n), name);
  await wait(1300);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`${name}: ${ok ? 'shown' : 'NOT shown'}`);
  await wait(2500);
}
await browser.close();
