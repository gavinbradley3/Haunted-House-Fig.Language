// Automated browser walkthrough: launches the game, plays through it via the
// test hook and saves screenshots to scripts/out/. Usage: node scripts/shots.mjs [baseUrl] [only]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173/?testdt=0.5';
const only = process.argv[3];
fs.mkdirSync('scripts/out', { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => {
  await page.screenshot({ path: `scripts/out/${name}.png`, timeout: 240000 });
  console.log('shot', name);
};
const run = (fn, arg) => page.evaluate(fn, arg);

await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 180000 });
await wait(9000 * 3);
if (!only || only === 'title') await shot('01-title');

// Skip intro straight into the hall
await run(() => window.__hosl.nav.startIntro(true));
await wait(4000 * 3);
const pose = (p) => run((p) => window.__hosl.useGame.getState().teleportTo(p), p);

const hallShots = [
  ['02-hall-start', { position: [0, 1.65, -1.2], yaw: 0, pitch: 0.05 }],
  ['03-hall-stairs', { position: [3.2, 1.65, -1.6], yaw: 0.85, pitch: 0.12 }],
  ['04-hall-fireplace', { position: [-1.5, 1.65, -3.4], yaw: -1.35, pitch: 0.02 }],
  ['05-hall-front', { position: [0.5, 1.65, -8.4], yaw: Math.PI, pitch: 0.12 }],
  ['06-corridor', { position: [0, 1.65, -10.8], yaw: 0, pitch: 0 }],
];
for (const [name, p] of hallShots) {
  if (only && !name.includes(only)) continue;
  await pose(p);
  await wait(3500 * 3);
  await shot(name);
}
// Enter the mirror room
await run(() => window.__hosl.useGame.getState().setDoor('mirror', true));
const mirrorShots = [
  ['07-mirror-door', { position: [0, 1.65, -16.2], yaw: 0, pitch: 0 }],
  ['08-mirrors-entry', { position: [0, 1.65, -20.0], yaw: 0, pitch: 0.04 }],
  ['09-mirrors-back', { position: [0.5, 1.65, -29.5], yaw: Math.PI, pitch: 0.04 }],
];
for (const [name, p] of mirrorShots) {
  if (only && !name.includes(only)) continue;
  await pose(p);
  await wait(4500 * 3);
  await shot(name);
}
if (!only || only === 'lesson') {
  await pose({ position: [0, 1.65, -22], yaw: -1.2, pitch: 0 });
  await wait(1500 * 3);
  await run(() => window.__hosl.director.openLesson());
  await wait(3500 * 3);
  await shot('10-lesson-discover');
  const d = (a) => run((a) => window.__hosl.useGame.getState().dispatch(a), a);
  await d({ type: 'REVEAL_DESCRIPTION', which: 'A' });
  await wait(1500 * 3);
  await d({ type: 'REVEAL_DESCRIPTION', which: 'B' });
  await d({ type: 'SHOW_DISCOVER_QUESTIONS' });
  await wait(3000 * 3);
  await shot('11-discover-B');
  await d({ type: 'NEXT' });
  await wait(4000 * 3);
  await shot('12-learn-term');
  await d({ type: 'NEXT' });
  await d({ type: 'NEXT' });
  await wait(5000 * 3);
  await shot('13-learn-annotate');
  await d({ type: 'NEXT' });
  await d({ type: 'NEXT' });
  await wait(3000 * 3);
  await shot('14-learn-nonexample');
  await d({ type: 'NEXT' });
  await wait(3500 * 3);
  await d({ type: 'SELECT_OPTION', challenge: 'playA', optionId: 'a' });
  await d({ type: 'CHECK_ANSWER', challenge: 'playA' });
  await wait(1500 * 3);
  await shot('15-playA-wrong');
  await d({ type: 'SELECT_OPTION', challenge: 'playA', optionId: 'c' });
  await d({ type: 'CHECK_ANSWER', challenge: 'playA' });
  await wait(4500 * 3);
  await shot('16-playA-right');
  await d({ type: 'NEXT' });
  await wait(2500 * 3);
  await d({ type: 'SELECT_OPTION', challenge: 'playB', optionId: 'c' });
  await wait(4000 * 3);
  await shot('17-playB-breathe');
  await d({ type: 'CHECK_ANSWER', challenge: 'playB' });
  await wait(1500 * 3);
  await shot('18-playB-solved');
  await d({ type: 'NEXT' });
  await wait(2500 * 3);
  await d({ type: 'SET_DRAFT', text: 'The old clock ticked like a heartbeat hiding in the walls.' });
  await d({ type: 'SUBMIT_RESPONSE' });
  await d({ type: 'TOGGLE_CRITERION', index: 0 });
  await d({ type: 'TOGGLE_CRITERION', index: 1 });
  await wait(3500 * 3);
  await shot('19-prove');
  await d({ type: 'REVEAL_MODEL' });
  await wait(2500 * 3);
  await shot('20-prove-model');
  await d({ type: 'COMPLETE' });
  await wait(9000 * 3);
  await shot('21-complete');
}
fs.writeFileSync('scripts/out/console.log', logs.join('\n'));
console.log(logs.filter((l) => /error|warn/i.test(l)).slice(0, 30).join('\n'));
await browser.close();
