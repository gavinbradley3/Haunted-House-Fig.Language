// Every lesson camera shot on Low, without the panel, to judge the objects students study.
// Usage: node scripts/phase10/lesson-shots.mjs [devUrl] [tag] [onlyShots,comma,separated]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5190/';
const tag = process.argv[3] ?? 'now';
const only = process.argv[4]?.split(',');
const out = `scripts/out/phase10/lesson-shots-${tag}`;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => {
  const s = window.__hosl.useGame.getState();
  s.setQuality('low');
  s.setEventLevel('off');
  s.progressDispatch({ type: 'GRANT', upTo: 'deskOpen' });
});
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await page.addStyleTag({ content: '.free-hint, .location, .corner-buttons, .notice, .keyring { display: none !important; }' });
const names = await page.evaluate(() => Object.keys(window.__hosl.director.SHOTS ?? {}));
const shots = names.length ? names : await page.evaluate(async () => Object.keys((await import('/src/world/layout.ts')).SHOTS));
for (const n of shots) {
  if (only && !only.includes(n)) continue;
  await page.evaluate((x) => {
    const s = window.__hosl.useGame.getState();
    for (const d of ['mirror', 'gallery', 'dining', 'jib', 'echoes', 'press', 'kitchen', 'ballroom', 'study']) s.setDoor(d, true);
    s.setShot(x);
  }, n);
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${out}/${n}.png` });
  console.log(n);
}
await browser.close();
