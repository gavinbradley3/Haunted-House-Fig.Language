// Every haunting event once, in a situation where it can happen: its loudness on the final mix
// against the ambience just before it, and a screenshot of the visual ones as they happen.
// Usage: node scripts/phase10/haunt-gallery.mjs [devUrl]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5190/';
const out = 'scripts/out/phase10/haunt-gallery';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const wait = (ms) => page.waitForTimeout(ms);
await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => {
  const s = window.__hosl.useGame.getState();
  s.setQuality('low');
  s.setEventLevel('eerie');
});
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await page.addStyleTag({ content: '.free-hint, .objective { display: none !important; }' });
// Only the events this script triggers (the director keeps watching what the student does).
await page.evaluate(() => window.__hosl.holdHaunting(1e6));
await page.evaluate(() => {
  window.__lv = [];
  setInterval(() => window.__lv.push([performance.now(), window.__hosl.level()]), 50);
});
const tp = (position, yaw, pitch = 0) => page.evaluate(([p, y, pi]) => window.__hosl.useGame.getState().teleportTo({ position: p, yaw: y, pitch: pi }), [position, yaw, pitch]);

const HALL = [[0.5, 1.65, -2.2], 0, 0];
const CASES = [
  ['stepsAbove', HALL],
  ['stepsNextRoom', [[0, 1.65, -13], 0, 0]],
  ['knocks', HALL],
  ['creak', HALL],
  ['doorSettles', [[0, 1.65, -13], 0, 0]],
  ['behind', HALL],
  ['whisper', HALL],
  ['drag', HALL],
  ['clock', HALL],
  ['gust', HALL],
  ['dim', HALL],
  ['figure', [[1.5, 1.65, -2.0], 0.15, 0.32], 'landing'],
  ['figure', [[0, 1.65, -6], 0, 0.02], 'corridor', true],
  ['doorDrifts', [[0, 1.65, -11.0], 0, 0], 'corridor', true],
  ['underDoor', [[-2.6, 5.05, -8.3], 0, -0.25]],
  ['mirrorBreath', [[0.4, 1.65, -22.5], -Math.PI / 2 - 0.4, 0]],
  ['lady', [[0, 1.65, -2], Math.PI, 0]],
];
const rows = [];
let n = 0;
for (const [id, [pos, yaw, pitch], tag, mirrorOpen] of CASES) {
  await page.evaluate((o) => window.__hosl.useGame.getState().setDoor('mirror', !!o), mirrorOpen);
  await tp(pos, yaw, pitch);
  await wait(4500);
  // Look around a little, as a student standing still does ("behind you" waits for that).
  await page.mouse.move(683, 384);
  await page.mouse.down();
  await page.mouse.move(700, 384, { steps: 5 });
  await page.mouse.move(683, 384, { steps: 5 });
  await page.mouse.up();
  await wait(300);
  const t = await page.evaluate(() => performance.now());
  const ok = await page.evaluate((x) => window.__hosl.forceHaunt(x), id);
  const visual = ['figure', 'doorDrifts', 'underDoor', 'mirrorBreath', 'lady', 'dim'].includes(id);
  if (visual && ok) {
    await wait(id === 'figure' ? 380 : id === 'dim' ? 2500 : id === 'underDoor' ? 700 : 1600);
    await page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${id}${tag ? '-' + tag : ''}.png` });
  }
  await wait(5000);
  const m = await page.evaluate((t0) => {
    const bg = window.__lv.filter(([t]) => t > t0 - 4000 && t < t0 - 200).map(([, l]) => l).sort((a, b) => a - b);
    const pk = window.__lv.filter(([t]) => t >= t0 && t < t0 + 5000).map(([, l]) => l);
    const med = bg[Math.floor(bg.length / 2)];
    return { bg: +med.toFixed(1), peak: +Math.max(...pk).toFixed(1), margin: +(Math.max(...pk) - med).toFixed(1) };
  }, t);
  rows.push({ id: id + (tag ? ` (${tag})` : ''), happened: ok, ...m });
  console.log(`${(id + (tag ? ` (${tag})` : '')).padEnd(22)} ${ok ? 'ran ' : 'NOT '} peak ${m.peak} dBFS, ${m.margin >= 0 ? '+' : ''}${m.margin} dB over ${m.bg}`);
}
// The echoing footsteps need the student to be walking.
await tp([-1.5, 1.65, -1.6], 0, 0);
await wait(3000);
await page.keyboard.down('KeyW');
await wait(4200);
const echo = await page.evaluate(() => window.__hosl.forceHaunt('echo'));
await wait(2200);
await page.keyboard.up('KeyW');
await wait(2000);
console.log(`echo                   ${echo ? 'ran' : 'NOT'} (armed while walking; answered steps and a last step after stopping)`);
fs.writeFileSync(`${out}/levels.json`, JSON.stringify(rows, null, 2));
await browser.close();
