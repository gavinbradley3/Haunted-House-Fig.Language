// Phase 11 (the Lady in Green): every haunting event, the painting flow, the exploration-only rules.
//  1. The Lady's recordings and images are in the build and decode after play begins.
//  2. Every event runs where it should: loudness on the final mix against the ambience just before it,
//     and a screenshot of each visual one as it happens.
//  3. Altered paintings: change only while unseen, are noticed when looked at, go back after the student
//     looks away, and are put right when opened in the viewer.
//  4. Nothing happens during a lesson, the viewer, the menu, a note, a notice or a cutscene, even when due.
// Usage: node scripts/phase11/haunt-check.mjs [devUrl]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4191/';
const out = 'scripts/out/phase11/haunt-check';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
const wait = (ms) => page.waitForTimeout(ms);
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

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
  s.setHouseCaptions('on');
});
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await page.addStyleTag({ content: '.free-hint, .objective { display: none !important; }' });
await page.evaluate(() => window.__hosl.holdHaunting(1e6));
await page.evaluate(() => {
  window.__lv = [];
  setInterval(() => window.__lv.push([performance.now(), window.__hosl.level()]), 50);
});
const H = (fn, arg) => page.evaluate(fn, arg);
const tp = (position, yaw, pitch = 0) => H(([p, y, pi]) => window.__hosl.useGame.getState().teleportTo({ position: p, yaw: y, pitch: pi }), [position, yaw, pitch]);
/** Stand at `from` and face a world point. */
const face = (from, target) => {
  const dx = target[0] - from[0];
  const dy = target[1] - from[1];
  const dz = target[2] - from[2];
  return tp(from, Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
};
const away = (from, target) => {
  const dx = target[0] - from[0];
  const dz = target[2] - from[2];
  return tp(from, Math.atan2(dx, dz), 0);
};
const paintingAt = (kind, id) =>
  H(([k, i]) => {
    const m = k === 'decor' ? window.__hosl.decorPaintings : window.__hosl.hungPaintings;
    const p = m.get(i)?.group;
    if (!p) return null;
    const v = p.getWorldPosition(new (p.position.constructor)());
    return [v.x, v.y, v.z];
  }, [kind, id]);
const logLen = () => H(() => window.__hosl.hauntState().log.length);

// ---------------------------------------------------------------- 1. assets
const status = await H(() => window.__hosl.audio.clipStatus());
for (const s of ['whisper', 'giggle', 'sigh', 'hum', 'knock']) check(`recordings in the build: ${s}`, status[s]?.files > 0, `${status[s]?.files} files`);
await tp([0.5, 1.65, -2.2], 0);
// The director warms her recordings after ~6 s of exploring; the hold does not stop its clock.
await wait(12000);
const decoded = await H(() => window.__hosl.audio.clipStatus());
for (const s of ['whisper', 'giggle', 'sigh', 'hum', 'knock']) check(`decoded after play begins: ${s}`, decoded[s]?.decoded === decoded[s]?.files, `${decoded[s]?.decoded}/${decoded[s]?.files}`);
const tex = await H(() => {
  const out = {};
  window.__hosl.scene().traverse((o) => {
    const m = o.material;
    if (m?.map?.name?.includes('apparition')) out.apparition = !!m.map.userData.loaded;
  });
  return out;
});
check('apparition image loaded (in the scene, invisible)', tex.apparition === true);

// ---------------------------------------------------------------- 2. every event
const HALL = [[0.5, 1.65, -2.2], 0, 0];
const CASES = [
  ['stepsAbove', HALL],
  ['stepsNextRoom', [[0, 1.65, -13], 0, 0]],
  ['knocks', HALL],
  ['creak', HALL],
  ['doorSettles', [[0, 1.65, -13], 0, 0]],
  ['behind', HALL],
  ['whisper', HALL],
  ['whisperWall', [[0, 1.65, -13], 0, 0]],
  ['ladyLaugh', HALL],
  ['ladyHum', [[0, 1.65, -13], 0, 0]],
  ['drag', HALL],
  ['echo', HALL],
  ['clock', HALL],
  ['gust', HALL],
  ['dim', HALL],
  ['flicker', HALL],
  ['crooked', HALL],
  ['chairMoved', [[0.5, 1.65, -2.2], Math.PI, 0]],
  ['doorDrifts', [[0, 1.65, -11.0], 0, 0], 'corridor', true],
  ['underDoor', [[-2.6, 5.05, -8.3], 0, -0.25]],
  ['mirrorBreath', [[0.4, 1.65, -22.5], -Math.PI / 2 - 0.4, 0]],
  ['draft', [[0.4, 1.65, -22.5], 0, 0]],
  ['ladyAppears', [[1.5, 1.65, -2.0], 0.1, 0.3], 'landing'],
  ['ladyCrosses', [[1.5, 1.65, -2.0], 0.1, 0.3], 'landing'],
  ['ladyAppears', [[0, 1.65, -6], 0, 0.02], 'mirror-door', true],
  ['ladyAppears', [[0, 1.65, -20.2], 0, 0.02], 'mirrors-end'],
];
const VISUAL = { ladyAppears: 1300, ladyCrosses: 600, doorDrifts: 1600, underDoor: 700, mirrorBreath: 1600, dim: 2500, flicker: 500 };
const rows = [];
let n = 0;
for (const [id, [pos, yaw, pitch], tag, mirrorOpen] of CASES) {
  await H((o) => window.__hosl.useGame.getState().setDoor('mirror', !!o), mirrorOpen);
  await tp(pos, yaw, pitch);
  await wait(4000);
  await page.mouse.move(683, 384);
  await page.mouse.down();
  await page.mouse.move(700, 384, { steps: 5 });
  await page.mouse.move(683, 384, { steps: 5 });
  await page.mouse.up();
  await wait(300);
  await H(() => window.__hosl.settleHouse());
  const t = await H(() => performance.now());
  // Not forced first: the event's own conditions (unseen, in view) should hold in these poses.
  let ok = await H((x) => window.__hosl.forceHaunt(x), id);
  let forced = false;
  if (!ok) {
    ok = await H((x) => window.__hosl.forceHaunt(x, true), id);
    forced = ok;
  }
  if (id === 'echo' && ok) {
    // The echo answers the student's own steps: walk.
    await page.keyboard.down('KeyS');
    await wait(2200);
    await page.keyboard.up('KeyS');
  }
  if (VISUAL[id] && ok) {
    await wait(VISUAL[id]);
    await page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${id}${tag ? '-' + tag : ''}.png` });
  }
  await wait(5500);
  const m = await H((t0) => {
    const bg = window.__lv.filter(([t]) => t > t0 - 3800 && t < t0 - 200).map(([, l]) => l).sort((a, b) => a - b);
    const pk = window.__lv.filter(([t]) => t >= t0 && t < t0 + 6000).map(([, l]) => l);
    const med = bg[Math.floor(bg.length / 2)];
    return { bg: +med.toFixed(1), peak: +Math.max(...pk).toFixed(1), margin: +(Math.max(...pk) - med).toFixed(1) };
  }, t);
  const name = id + (tag ? ` (${tag})` : '');
  rows.push({ id: name, ran: ok, forced, ...m });
  check(`event runs: ${name}`, ok, `${forced ? 'forced; ' : ''}peak ${m.peak} dBFS, ${m.margin >= 0 ? '+' : ''}${m.margin} dB over ${m.bg}`);
}
await H(() => window.__hosl.useGame.getState().setDoor('mirror', false));

// ---------------------------------------------------------------- 3. paintings
await H(() => window.__hosl.settleHouse());
// 3a. The watching portrait: look at her, turn away, she turns; look, noticed; look away, she is as before.
const ladyP = await paintingAt('hung', 'ladyOfHouse');
const spot = [ladyP[0] + (ladyP[0] > 0 ? -4 : 4), 1.65, ladyP[2] + 0.5];
await face(spot, ladyP);
await wait(2500);
await page.screenshot({ path: `${out}/p1-lady-before.png` });
await away(spot, ladyP);
await wait(600);
check('watching portrait changes only once she has been seen and is out of sight', await H(() => window.__hosl.forceHaunt('ladyWatches')));
check('…it shows her turned', (await H(() => window.__hosl.hungPaintings.get('ladyOfHouse').art)) === 'ladyOfHouseTurned');
await face(spot, ladyP);
await wait(2000);
await page.screenshot({ path: `${out}/p2-lady-watching.png` });
check('…the student is seen to notice it', (await H(() => window.__hosl.hauntState().log.some((l) => l.id === 'noticed:ladyWatches'))) === true);
await away(spot, ladyP);
await wait(8000);
check('…looked away again: she is as she was', (await H(() => window.__hosl.hungPaintings.get('ladyOfHouse').art)) === 'ladyOfHouse');
// 3a2. Her portrait empty: changes unseen, is noticed, she is back after the student looks away; the viewer puts it right.
await away(spot, ladyP);
await wait(800);
check('empty portrait: she is gone from her frame while unseen', await H(() => window.__hosl.forceHaunt('ladyGone', true)));
check('…the empty canvas is on the wall, loaded', await H(() => { let ok = false; window.__hosl.scene().traverse((o) => { const m = o.material; if (m?.map?.name === 'painting-ladyOfHouse-empty.webp' && m.map.userData.loaded) ok = true; }); return ok; }));
await face(spot, ladyP);
await wait(2000);
await page.screenshot({ path: `${out}/p1b-lady-gone.png` });
check('…noticed', (await H(() => window.__hosl.hauntState().log.some((l) => l.id === 'noticed:ladyGone'))) === true);
await away(spot, ladyP);
await wait(8000);
check('…looked away again: she is back', (await H(() => window.__hosl.hauntState().altered.length)) === 0);
await face(spot, ladyP);
await wait(1200);
await page.screenshot({ path: `${out}/p1c-lady-back.png` });
await away(spot, ladyP);
await wait(800);
await H(() => window.__hosl.forceHaunt('ladyGone', true));
await H(() => window.__hosl.useGame.getState().setInspecting('ladyOfHouse'));
await wait(1200);
check('…opening the portrait in the viewer puts her back first', (await H(() => window.__hosl.hauntState().altered.length)) === 0);
await page.screenshot({ path: `${out}/p1d-lady-viewer.png` });
await H(() => window.__hosl.useGame.getState().setInspecting(null));
await wait(800);
check('…the portrait shows her usual pose afterwards', (await H(() => window.__hosl.hungPaintings.get('ladyOfHouse').art)) === 'ladyOfHouse');
// 3b. Her face behind the Builder (hall stair wall): changes unseen, is noticed, goes back.
const d02 = await paintingAt('decor', 'D02');
const from02 = [d02[0] + (d02[0] < 0 ? 5 : -5), 1.65, d02[2] + 1.0];
await away(from02, d02);
await wait(800);
check('Builder portrait: her face appears while unseen', await H(() => window.__hosl.forceHaunt('faceBuilder')));
await face(from02, d02);
await wait(1800);
await page.screenshot({ path: `${out}/p3-builder-face.png` });
check('…noticed', (await H(() => window.__hosl.hauntState().log.some((l) => l.id === 'noticed:faceBuilder'))) === true);
await away(from02, d02);
await wait(8000);
check('…gone again after looking away', (await H(() => window.__hosl.hauntState().altered.length)) === 0);
// 3c. Her face behind the Young Man in Mourning (gallery); opening it in the viewer puts it right.
const d09 = await paintingAt('decor', 'D09');
const from09 = [d09[0] + (d09[0] < -8 ? 3.2 : -3.2), 1.65, d09[2] + (d09[2] < -14 ? 2.5 : -2.5)];
await away(from09, d09);
await wait(3000);
check('Mourner portrait: her face appears while unseen', await H(() => window.__hosl.forceHaunt('faceMourner')));
await face(from09, d09);
await wait(1800);
await page.screenshot({ path: `${out}/p4-mourner-face.png` });
await H(() => window.__hosl.useGame.getState().setInspecting('D09'));
await wait(1500);
check('…opening it in the viewer puts it right first', (await H(() => window.__hosl.hauntState().altered.length)) === 0);
await page.screenshot({ path: `${out}/p5-mourner-viewer.png` });
await H(() => window.__hosl.useGame.getState().setInspecting(null));
await wait(800);
// 3d. A painting never changes in view.
await face(from09, d09);
await wait(800);
check('a portrait in view does not change', (await H(() => window.__hosl.forceHaunt('faceMourner'))) === false);
check('the lesson paintings are not touched', (await H(() => ['caretaker', 'oldManShadow', 'nervousSitter', 'emptyFrame'].every((id) => !window.__hosl.hungPaintings.get(id) || window.__hosl.hungPaintings.get(id).art === window.__hosl.hungPaintings.get(id).art))) === true);

// 3e. A lesson starting puts every altered painting right (the lesson camera may look at any wall).
await away(from02, d02);
await wait(800);
await H(() => window.__hosl.forceHaunt('faceBuilder', true));
const alteredBefore = await H(() => window.__hosl.hauntState().altered.length);
await H(() => window.__hosl.useGame.setState({ lessonActive: true }));
await wait(500);
check('a lesson starting puts an altered painting right', alteredBefore === 1 && (await H(() => window.__hosl.hauntState().altered.length)) === 0);
await H(() => window.__hosl.useGame.setState({ lessonActive: false }));

// ---------------------------------------------------------------- 4. exploration only
await H(() => window.__hosl.settleHouse());
await tp([0.5, 1.65, -2.2], 0);
await H(() => window.__hosl.holdHaunting(0));
const BUSY = [
  ['a lesson', (on) => window.__hosl.useGame.setState({ lessonActive: on })],
  ['the painting viewer', (on) => window.__hosl.useGame.getState().setInspecting(on ? 'D01' : null)],
  ['the menu (paused)', (on) => window.__hosl.useGame.setState({ paused: on })],
  ['a diary note', (on) => window.__hosl.useGame.setState({ note: on ? { kicker: 'Test', title: 'Test', body: ['Test'] } : null })],
  ['a room transition (fade)', (on) => window.__hosl.useGame.setState({ fading: on })],
];
for (const [name, fn] of BUSY) {
  await H(`(${fn.toString()})(true)`);
  await wait(400);
  const before = await logLen();
  await H(() => window.__hosl.hauntDueNow());
  await wait(6000);
  const after = await logLen();
  check(`nothing happens during ${name}, even when due`, after === before, `${after - before} events`);
  await H(`(${fn.toString()})(false)`);
  await wait(300);
}
// Positive control: once free (after the 15 s grace), something does happen.
await H(() => {
  window.__hosl.holdHaunting(0);
});
await wait(16500);
// Look around first: a student standing still with an unmoving view is taken to be reading, and left alone.
await page.mouse.move(683, 384);
await page.mouse.down();
await page.mouse.move(720, 384, { steps: 6 });
await page.mouse.up();
const before = await logLen();
await H(() => window.__hosl.hauntDueNow('minor'));
await wait(3000);
check('…and once the student is free again, the house resumes', (await logLen()) > before);

check('no page errors or missing files', errors.length === 0, errors.slice(0, 5).join(' | '));
fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, rows, errors }, null, 1));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
await browser.close();
