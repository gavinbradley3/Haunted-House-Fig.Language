// A representative exploratory session with the haunting director on Normal, in real time:
// walking, standing and looking around, lingering, a lesson left open for a minute, the corridor,
// the Hall of Mirrors, the upper landing. Logs every event with what the student was doing,
// screenshots the visual ones as they happen, and measures each event's loudness on the final mix
// against the ambience in the seconds before it (so "it ran" is not mistaken for "it was noticeable").
// Usage: node scripts/phase10/haunt-session.mjs [devUrl] [minutes] [level]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5190/';
const minutes = Number(process.argv[3] ?? 7);
const levelName = process.argv[4] ?? 'eerie';
const out = `scripts/out/phase10/haunt-${levelName}`;
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
await page.evaluate((lvl) => {
  const s = window.__hosl.useGame.getState();
  s.setQuality('low');
  s.setEventLevel(lvl);
  s.setHouseCaptions('on'); // so captions can be checked too
}, levelName);
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await page.addStyleTag({ content: '.free-hint { display: none !important; }' });

// ---------------------------------------------------------------- background sampling (in the page)
await page.evaluate(() => {
  window.__session = { levels: [], seen: 0, events: [], captions: [], lessonEvents: 0 };
  setInterval(() => {
    const L = window.__hosl.level();
    const t = performance.now() / 1000;
    if (L !== null) window.__session.levels.push([t, L]);
    const log = window.__hosl.hauntState().log;
    const all = log.length ? log : [];
    const s = window.__hosl.useGame.getState();
    while (window.__session.seen < window.__hosl.hauntState().log.length + (window.__session.offset ?? 0)) break;
    for (const e of all) {
      const key = `${e.t}:${e.id}`;
      if (window.__session.events.some((x) => x.key === key)) continue;
      window.__session.events.push({ key, at: t, ...e, lesson: s.lessonActive, upstairs: s.upstairs });
    }
    const cap = document.querySelector('.house-caption')?.textContent;
    if (cap && window.__session.captions.at(-1)?.text !== cap) window.__session.captions.push({ t, text: cap });
  }, 100);
});

const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await wait(ms);
  await page.keyboard.up(key);
};
const look = async (dx, dy = 0) => {
  await page.mouse.move(683, 384);
  await page.mouse.down();
  await page.mouse.move(683 + dx, 384 + dy, { steps: 20 });
  await page.mouse.up();
};
const tp = (position, yaw, pitch = 0) => page.evaluate(([p, y, pi]) => window.__hosl.useGame.getState().teleportTo({ position: p, yaw: y, pitch: pi }), [position, yaw, pitch]);

/** Screenshot visual events as they happen (polled while the session runs). */
let shots = 0;
const shotWatcher = setInterval(async () => {
  try {
    const ev = await page.evaluate(() => window.__session.events.filter((e) => !e.shot && ['doorDrifts', 'figure', 'underDoor', 'crooked', 'lady', 'chairMoved', 'dim', 'flicker', 'gust', 'mirrorBreath'].includes(e.id)));
    for (const e of ev) {
      await page.evaluate((k) => (window.__session.events.find((x) => x.key === k).shot = true), e.key);
      await wait(e.id === 'figure' ? 350 : 900);
      await page.screenshot({ path: `${out}/event-${String(++shots).padStart(2, '0')}-${e.id}.png` });
    }
  } catch {
    /* page busy */
  }
}, 300);

// ---------------------------------------------------------------- the session (a loop of activities)
const t0 = Date.now();
const elapsed = () => (Date.now() - t0) / 60000;
const activities = [
  async () => { // wander the hall
    await tp([0, 1.65, -1.4], 0);
    await hold('KeyA', 1200); await hold('KeyW', 2500); await look(300); await hold('KeyW', 1500); await look(-500); await hold('KeyS', 1500);
  },
  async () => { // stand still, looking around slowly (the "was that behind me?" moment)
    for (let i = 0; i < 8; i++) { await look(i % 2 ? 160 : -140, i % 3 ? 10 : -10); await wait(1200); }
  },
  async () => { // down the corridor and into the Hall of Mirrors
    await tp([0, 1.65, -9.0], 0);
    await hold('KeyW', 4200);
    await page.evaluate(() => window.__hosl.useGame.getState().setDoor('mirror', true));
    await hold('KeyW', 3500); await look(400); await wait(4000); await look(-700); await wait(3000);
  },
  async () => { // linger in the mirrors room
    await tp([0, 1.65, -24], Math.PI / 2);
    for (let i = 0; i < 5; i++) { await hold(i % 2 ? 'KeyA' : 'KeyD', 900); await wait(2500); await look(i % 2 ? 250 : -250); }
  },
  async () => { // upstairs: the landing
    await tp([-3.2, 5.05, -8.7], -Math.PI / 2 + 0.6);
    await wait(4000); await hold('KeyW', 1500); await look(-300); await wait(5000); await look(500); await wait(4000);
  },
  async () => { // hall again, looking up at the landing from the floor
    await tp([1.5, 1.65, -2.5], 0, 0.35);
    await wait(6000); await look(200, -40); await wait(5000); await hold('KeyS', 1200);
  },
];

let i = 0;
let lessonDone = false;
while (elapsed() < minutes) {
  if (!lessonDone && elapsed() > minutes * 0.45) {
    // A lesson open for a minute: no events may happen, and none for a while after it closes.
    lessonDone = true;
    await page.evaluate(() => window.__hosl.director.openLesson('mirrors'));
    const before = await page.evaluate(() => window.__session.events.length);
    await wait(60000);
    const during = (await page.evaluate(() => window.__session.events.length)) - before;
    await page.evaluate(() => window.__hosl.director.closeLesson());
    await page.evaluate((n) => (window.__session.lessonEvents = n), during);
    continue;
  }
  await activities[i++ % activities.length]();
}
clearInterval(shotWatcher);
await wait(1500);

// ---------------------------------------------------------------- analysis
const s = await page.evaluate(() => window.__session);
const lv = s.levels;
const margin = (at) => {
  const bg = lv.filter(([t]) => t > at - 5 && t < at - 0.3).map(([, l]) => l).sort((a, b) => a - b);
  const pk = lv.filter(([t]) => t >= at - 0.2 && t < at + 4).map(([, l]) => l);
  if (!bg.length || !pk.length) return null;
  const median = bg[Math.floor(bg.length / 2)];
  return { bg: +median.toFixed(1), peak: +Math.max(...pk).toFixed(1), margin: +(Math.max(...pk) - median).toFixed(1) };
};
const events = s.events.map((e) => ({ t: e.t, id: e.id, zone: e.zone, upstairs: e.upstairs, still: e.still, moving: e.moving, roomTime: e.roomTime, ...(margin(e.at) ?? {}) }));
const gaps = events.slice(1).map((e, k) => +(e.t - events[k].t).toFixed(1));
const repeats = events.slice(1).filter((e, k) => e.id === events[k].id).length;
const summary = {
  level: levelName,
  minutes,
  events: events.length,
  perMinute: +(events.length / minutes).toFixed(2),
  gapSeconds: gaps.length ? { min: Math.min(...gaps), max: Math.max(...gaps), mean: +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1) } : null,
  backToBackRepeats: repeats,
  eventsDuringTheOpenLesson: s.lessonEvents,
  byId: Object.fromEntries([...new Set(events.map((e) => e.id))].map((id) => [id, events.filter((e) => e.id === id).length])),
  captions: s.captions.map((c) => c.text),
  errors,
};
fs.writeFileSync(`${out}/session.json`, JSON.stringify({ summary, events }, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log('events:');
for (const e of events) console.log(`  ${e.t.toFixed(0).padStart(4)}s ${e.id.padEnd(14)} ${e.zone}${e.upstairs ? '(up)' : ''} still ${e.still} moving ${e.moving}  ${e.margin != null ? `+${e.margin} dB over ${e.bg} dBFS` : ''}`);
await browser.close();
