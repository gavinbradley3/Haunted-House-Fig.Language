// A long simulated exploration with the haunting director's clock running fast (default x8: 6 real
// minutes = 48 minutes of exploring). A scripted student wanders the hall, corridor, Hall of Mirrors,
// gallery and upstairs landing, walking, looking around and standing still, and now and then opens a
// lesson. Afterwards: how often each tier happened (in exploring time), the gaps, whether any event
// fell inside a lesson, whether major events overlapped, how far apart her voice was.
// Usage: node scripts/phase11/haunt-long.mjs [devUrl] [realMinutes] [speed]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4191/';
const minutes = Number(process.argv[3] ?? 6);
const speed = Number(process.argv[4] ?? 8);
const out = 'scripts/out/phase11/haunt-long';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith('hosl.')) localStorage.removeItem(k);
});
await page.reload();
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => {
  const s = window.__hosl.useGame.getState();
  s.setQuality('low');
  s.setEventLevel('eerie');
});
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await page.evaluate((k) => {
  window.__hosl.setHauntSpeed(k);
  window.__hosl.useGame.getState().setDoor('mirror', true);
}, speed);

const tp = (p, yaw, pitch = 0) => page.evaluate(([p, y, pi]) => window.__hosl.useGame.getState().teleportTo({ position: p, yaw: y, pitch: pi }), [p, yaw, pitch]);
// Places a student goes, facing somewhere (including views of the landing, the mirror door, the far window).
const STOPS = [
  [[0.5, 1.65, -2.2], 0, 0.3],
  [[2.5, 1.65, -3.5], Math.PI / 2, 0],
  [[-3, 1.65, -6], -Math.PI / 2, 0.1],
  [[0, 1.65, -6], 0, 0.02],
  [[0, 1.65, -13], 0, 0],
  [[0, 1.65, -11], Math.PI, 0],
  [[0, 1.65, -20.2], 0, 0],
  [[0.4, 1.65, -24], -Math.PI / 2, 0],
  [[-6, 1.65, -14], Math.PI / 2, 0],
  [[-10, 1.65, -12], -Math.PI / 2, 0],
  [[-2.6, 5.05, -8.3], 0, -0.25],
  [[1.5, 1.65, -2.0], 0.1, 0.3],
  [[0.2, 1.65, -21.5], Math.PI, 0],
  [[-3.0, 1.65, -13.4], Math.PI / 2, 0],
  [[2.4, 1.65, -15.4], -Math.PI / 2, 0],
  [[-8.5, 1.65, -23], Math.PI / 2, 0],
];
const busy = [];
await page.evaluate(() => { window.__samples = []; setInterval(() => { const st = window.__hosl.hauntState(); window.__samples.push({ ct: Math.round(st.t), zone: window.__hosl.useGame.getState().zone, clocks: Object.fromEntries(Object.entries(st.clocks).map(([k, v]) => [k, Math.round(v)])), lastMajor: Math.round(st.lastMajor), fu: st.followUps.map((x) => x.id + '@' + x.at), alt: st.altered.map((a) => a.key), still: Math.round(st.still), sinceLook: Math.round(st.sinceLook), quiet: Math.round(st.quietUntil) }); }, 2000); });
const t0 = Date.now();
let i = 0;
while (Date.now() - t0 < minutes * 60000) {
  const [p, yaw, pitch] = STOPS[Math.floor(Math.random() * STOPS.length)];
  await tp(p, yaw, pitch);
  const dwell = 12000 + Math.random() * 16000;
  const end = Date.now() + dwell;
  while (Date.now() < end) {
    const r = Math.random();
    if (r < 0.35) {
      const k = Math.random() < 0.5 ? 'KeyW' : 'KeyS';
      await page.keyboard.down(k);
      await wait(600 + Math.random() * 900);
      await page.keyboard.up(k);
    } else {
      // Look around: turn the view a little where the student stands (not a mouse drag: a click would open
      // whatever painting or lesson object is under the crosshair, and the run would stall there).
      await page.evaluate(([y, pi]) => {
        const c = window.__hosl.liveCamera;
        const pos = Array.isArray(c?.position) ? [...c.position] : null;
        if (pos) window.__hosl.useGame.getState().teleportTo({ position: pos, yaw: y, pitch: pi });
      }, [yaw + (Math.random() - 0.5) * 0.9, pitch + (Math.random() - 0.5) * 0.2]);
      await wait(700 + Math.random() * 900);
    }
  }
  await page.evaluate(() => {
    const g = window.__hosl.useGame.getState();
    if (g.inspecting) g.setInspecting(null);
    if (g.note) window.__hosl.useGame.setState({ note: null });
  });
  // Every fourth stop, the menu is open for 20 s (no events may happen meanwhile). (Setting lessonActive directly
  // here froze the player for the rest of the run; lessons themselves are checked in haunt-check.mjs.)
  if (++i % 4 === 0) {
    const a = await page.evaluate(() => {
      window.__hosl.useGame.setState({ paused: true });
      return window.__hosl.world.t;
    });
    await wait(20000);
    const b = await page.evaluate(() => {
      window.__hosl.useGame.setState({ paused: false });
      return window.__hosl.world.t;
    });
    busy.push([a, b]);
  }
}
const all = await page.evaluate(() => window.__hosl.hauntLog);
const samples = await page.evaluate(() => window.__samples);
fs.writeFileSync(`${out}/samples.json`, JSON.stringify(samples));
fs.writeFileSync(`${out}/log.json`, JSON.stringify({ all, busy, errors }, null, 1));
await browser.close();

// ---------------------------------------------------------------- analysis
const events = all.filter((e) => ['minor', 'painting', 'apparition'].includes(e.tier));
const byTier = (t) => events.filter((e) => e.tier === t);
const gaps = (list) => list.slice(1).map((e, k) => +(e.ct - list[k].ct).toFixed(1));
const stats = (g) => (g.length ? { n: g.length, min: Math.min(...g), median: [...g].sort((a, b) => a - b)[g.length >> 1], max: Math.max(...g) } : { n: 0 });
const simMin = (events.at(-1)?.ct ?? 0) / 60;
console.log(`exploring time simulated: ${simMin.toFixed(1)} min (x${speed}), events: ${events.length}`);
for (const t of ['minor', 'painting', 'apparition']) console.log(`${t.padEnd(11)} ${byTier(t).length} events; gaps (exploring s) ${JSON.stringify(stats(gaps(byTier(t))))}`);
const majors = events.filter((e) => e.tier !== 'minor');
console.log(`closest two major events: ${Math.min(...gaps(majors), Infinity)} s`);
const voice = all.filter((e) => /whisper|ladyLaugh|ladyHum|laugh:|mirrorBreath/.test(e.id));
console.log(`her voice: ${voice.length} times; closest two: ${Math.min(...gaps(voice), Infinity)} s`);
const inLesson = all.filter((e) => busy.some(([a, b]) => e.t > a + 0.2 && e.t < b));
console.log(`events while the menu was open: ${inLesson.length}`);
const firstApp = events.find((e) => e.tier === 'apparition');
console.log(`first apparition at ${firstApp ? (firstApp.ct / 60).toFixed(1) + ' min of exploring' : '-'}; apparitions at (min): ${byTier('apparition').map((e) => (e.ct / 60).toFixed(1)).join(', ')}`);
const counts = {};
for (const e of all) counts[e.id] = (counts[e.id] ?? 0) + 1;
console.log('by id:', JSON.stringify(counts));
let repeats = 0;
for (let k = 1; k < events.length; k++) if (events[k].id === events[k - 1].id) repeats++;
console.log(`same event twice running: ${repeats}`);
console.log(`page errors: ${errors.length}`);
