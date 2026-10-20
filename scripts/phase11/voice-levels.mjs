// The Lady's voice in the final mix: each sound's peak against the ambience just before it.
// Usage: node scripts/phase11/voice-levels.mjs [devUrl]
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4191/';
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const wait = (ms) => page.waitForTimeout(ms);
await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await page.evaluate(() => window.__hosl.holdHaunting(1e6));
await page.evaluate(() => {
  window.__lv = [];
  setInterval(() => window.__lv.push([performance.now(), window.__hosl.level()]), 50);
});
const tp = (p, y) => page.evaluate(([p, y]) => window.__hosl.useGame.getState().teleportTo({ position: p, yaw: y, pitch: 0 }), [p, y]);
await tp([0.5, 1.65, -2.2], 0);
await wait(14000);
const measure = async (name, fn) => {
  await wait(3500);
  const t = await page.evaluate(() => performance.now());
  await page.evaluate(fn);
  await wait(6000);
  const m = await page.evaluate((t0) => {
    const bg = window.__lv.filter(([t]) => t > t0 - 3300 && t < t0 - 200).map(([, l]) => l).sort((a, b) => a - b);
    const pk = window.__lv.filter(([t]) => t >= t0 && t < t0 + 6000).map(([, l]) => l);
    const med = bg[Math.floor(bg.length / 2)];
    return { bg: +med.toFixed(1), peak: +Math.max(...pk).toFixed(1), margin: +(Math.max(...pk) - med).toFixed(1) };
  }, t);
  console.log(`${name.padEnd(28)} peak ${m.peak} dBFS, ${m.margin >= 0 ? '+' : ''}${m.margin} dB over ${m.bg}`);
};
for (let i = 0; i < 3; i++) await measure(`laugh (hall) #${i + 1}`, () => window.__hosl.forceHaunt('ladyLaugh', true));
await measure('whisper (hall)', () => window.__hosl.forceHaunt('whisper', true));
await measure('knocks (hall)', () => window.__hosl.forceHaunt('knocks', true));
await tp([0, 1.65, -13], 0);
await wait(3000);
for (let i = 0; i < 2; i++) await measure(`laugh (corridor) #${i + 1}`, () => window.__hosl.forceHaunt('ladyLaugh', true));
await measure('hum (corridor)', () => window.__hosl.forceHaunt('ladyHum', true));
await tp([0.4, 1.65, -22.5], -Math.PI / 2 - 0.4);
await wait(3000);
await measure('sigh (mirrors)', () => window.__hosl.audio.ladySigh([0, 1.7, -24.9], 1));
await browser.close();
