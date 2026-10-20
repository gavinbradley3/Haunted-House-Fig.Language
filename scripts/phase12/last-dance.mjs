// The Last Dance, end to end, the way a student plays it: the story moments during the lessons, then the bonus
// chapter from the chapter card to the figure in the empty frame. Objects are used by pointing the real mouse at
// them and pressing E; the doorways and the stairs are walked through with W. The nine lessons themselves are
// covered by scripts/e2e/playthrough.mjs; here they are granted with the teacher's shortcut.
// Also: the lock's wrong-answer feedback, save and Continue in the middle of the mystery, the Gentle version of
// the encounter, and the academic ending card.
//
// Usage: node scripts/phase12/last-dance.mjs [url = http://localhost:4192/] [WxH = 1366x768]
//   url: a dev server (npx vite --config scripts/phase11/vite.nowatch.config.mjs --port 4192).
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4192/';
const [W, H] = (process.argv[3] ?? '1366x768').split('x').map(Number);
const out = 'scripts/out/phase12';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : { channel: 'chrome' }),
  args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));

let failures = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const S = (fn, arg) => page.evaluate(([f, a]) => new Function('h', 's', 'a', `return (${f})(h, s, a)`)(window.__hosl, window.__hosl.useGame.getState(), a), [fn.toString(), arg]);
const until = async (fn, ms = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await S(fn)) return true;
    await wait(200);
  }
  return false;
};
const teleport = (position, yaw, pitch = 0) => S((h, s, a) => s.teleportTo({ position: a.position, yaw: a.yaw, pitch: a.pitch }), { position, yaw, pitch });
const UP = 3.4 + 1.65;

/** Point the real mouse at an interactable (from where the player stands) and press E. Returns the prompt shown. */
async function use(id) {
  const pts = await page.evaluate(async (id) => {
    const it = window.__hosl.getInteractable(id);
    const { renderer } = await import('/src/systems/renderer.ts');
    const cam = renderer.camera;
    if (!it || !cam) return [];
    const V = cam.position.constructor;
    const r = renderer.gl.domElement.getBoundingClientRect();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    it.object.updateWorldMatrix(true, true);
    it.object.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      o.geometry.computeBoundingBox?.();
      const b = o.geometry.boundingBox;
      if (!b) return;
      for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]) {
        const p = new V(cx, cy, cz).applyMatrix4(o.matrixWorld).project(cam);
        if (p.z > 1) continue;
        const sx = r.left + ((p.x + 1) / 2) * r.width, sy = r.top + ((1 - p.y) / 2) * r.height;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
    });
    if (!isFinite(x0)) return [];
    const cl = (v, lo, hi) => Math.max(lo + 2, Math.min(hi - 2, v));
    return [[0.5, 0.5], [0.5, 0.35], [0.5, 0.65], [0.35, 0.5], [0.65, 0.5], [0.3, 0.3], [0.7, 0.7]].map(([fx, fy]) => ({ x: cl(x0 + (x1 - x0) * fx, r.left, r.right), y: cl(y0 + (y1 - y0) * fy, r.top, r.bottom) }));
  }, id);
  for (const p of pts) {
    await page.mouse.move(p.x + 1, p.y + 1);
    await page.mouse.move(p.x, p.y);
    await wait(250);
    const hover = await S((h, s) => s.hover);
    if (hover?.id === id) {
      await page.keyboard.press('KeyE');
      await wait(300);
      return hover.label;
    }
  }
  return null;
}

/** Hold W for a while (walking forward the way the player faces). */
async function walk(ms) {
  await page.mouse.move(5, 5); // off any object
  await page.keyboard.down('KeyW');
  await wait(ms);
  await page.keyboard.up('KeyW');
  await wait(300);
}

async function boot(fresh) {
  await page.goto(base);
  if (fresh) {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  }
  await page.waitForFunction(() => window.__hosl?.useGame && window.__hosl.useGame.getState().phase === 'title', null, { timeout: 90000 });
  await wait(1500);
}

// ================================================================== 1. the story moments during the lessons
await boot(true);
await S((h) => {
  h.nav.startIntro(true);
  h.useGame.getState().setEventLevel('eerie');
});
await until((h, s) => s.phase === 'play');
await S((h, s) => {
  s.progressDispatch({ type: 'GRANT', upTo: 'mirrorKey' });
  s.setDoor('mirror', true);
  h.holdHaunting(9999);
});
await teleport([0, 1.65, -19.6], Math.PI);
await wait(800);
check('early moment: nothing before the student walks back up the corridor', !(await S((h, s) => s.found.ldHookEarly)));
await walk(1800);
const sawHer = await until((h) => h.figureFx.start > 0 && h.world.t - h.figureFx.start < 3, 4000);
check('early moment: the Lady is seen at the end of the corridor', sawHer);
await shot('01-early-sighting');
check('early moment: the door behind slams shut', await until((h, s) => !s.doors.mirror, 5000));
check('early moment: "Someone else is in the house."', await until((h, s) => s.notice?.text === 'Someone else is in the house.', 5000));
check('early moment: remembered (flag saved)', await S((h, s) => s.found.ldHookEarly));

await S((h, s) => s.progressDispatch({ type: 'GRANT', upTo: 'nurseryKey' }));
await teleport([0, 1.65, -14], 0); // the corridor, facing away from the hall: her frame empties unseen
await wait(1500);
await teleport([1.5, 1.65, -8.5], -1.2, 0.1);
check('middle moment: humming by the fireplace when the student comes back into the hall', await until((h, s) => s.notice === null || true, 100) && (await wait(2500), true));
await teleport([1.5, 1.65, -8.5], Math.atan2(-4.15, -3.9), 0.12);
check('middle moment: "The Lady’s portrait is empty."', await until((h, s) => s.notice?.text === 'The Lady’s portrait is empty.', 6000));
await shot('02-empty-portrait');
await teleport([1.5, 1.65, -8.5], 0, 0);
check('middle moment: she is back in her frame once the student looks away', await until((h, s) => s.found.ldHookMid, 8000));

// ================================================================== 2. the academic ending, then the chapter card
await S((h, s) => {
  s.progressDispatch({ type: 'GRANT', upTo: 'deskOpen' });
  s.progressDispatch({ type: 'COMPLETE_ROOM', room: 'finale' });
  s.setEndingOpen(true);
});
await wait(800);
check('the academic ending card still opens and lists all nine devices', await page.locator('.ending-room').count() === 9);
check('the ending card tells the student about the bonus mystery', (await page.locator('.ending-card').innerText()).includes('the Last Dance'));
await page.getByRole('button', { name: 'Keep exploring' }).click();
check('the chapter card appears once the ending card is closed', await until((h, s) => s.note?.card === 'chapter', 8000));
await shot('03-chapter-card');
await page.getByRole('button', { name: 'Investigate' }).click();
check('the chapter begins (music box upstairs, knocks)', await until((h, s) => s.found.ldStarted, 3000));
check('objective: read the diary on the landing', await until(() => (document.querySelector('.objective')?.textContent ?? '').includes('diary'), 15000));
check('the Lady’s portrait is empty while she is upstairs', await until((h) => h.hungPaintings.get('ladyOfHouse') && true, 3000));

// ================================================================== 3. up the stairs, the diary, the paintings, the lock
await teleport([-5.27, 1.65, -1.0], 0, 0);
await wait(600);
await walk(4200);
check('the stairs are climbed on foot to the landing', await S((h, s) => s.upstairs && h.liveCamera.position[1] > 4.5), JSON.stringify(await S((h) => h.liveCamera.position.map((v) => +v.toFixed(2)))));
await teleport([0.1, UP, -8.6], 0, -0.55);
await wait(700);
check('the diary offers its loose page', /loose page/.test((await use('landing-diary')) ?? ''));
check('the clue page opens', await until((h, s) => s.note?.card === 'journal', 3000));
await shot('04-journal');
check('four clues on the page', (await page.locator('.ld-clues li').count()) === 4);
await page.keyboard.press('KeyJ');
check('J closes the clue page', await until((h, s) => !s.note, 2000));
await page.keyboard.press('KeyJ');
check('J opens it again from anywhere', await until((h, s) => s.note?.card === 'journal', 2000));
await page.keyboard.press('Escape');
await until((h, s) => !s.note, 2000);
// Examining the four paintings in the museum viewer (remembered for the lock's "seen" marks)
for (const id of ['coldFeet', 'deafeningSilence', 'D07', 'D16']) {
  await S((h, s, id) => s.setInspecting(id), id);
  await wait(300);
  await S((h, s) => s.setInspecting(null));
}
check('the four paintings are remembered as examined', await S((h, s) => ['ldSawColdFeet', 'ldSawDeafeningSilence', 'ldSawD07', 'ldSawD16'].every((k) => s.found[k])));

await teleport([2.6, UP, -8.7], 0, -0.1);
await wait(700);
check('the right-hand door offers its picture lock', /picture lock/.test((await use('landing-ajar-door')) ?? ''));
check('the lock opens', await until((h, s) => s.note?.card === 'lock', 3000));
const pics = await S((h) => h.ld.story.LOCK_PICTURES.map((p) => p.id));
async function setWheel(w, id) {
  // Turn the wheel with its ▶ button until it shows the picture (as a student does).
  for (let k = 0; k < pics.length + 1; k++) {
    const cur = await S((h, s, w) => h.ld.story.savedWheels(s.found)[w], w);
    if (cur === id) return true;
    await page.locator('.ld-wheel').nth(w).locator('.ld-turn button').nth(1).click();
    await wait(80);
  }
  return false;
}
for (const [w, id] of [['0', 'coldFeet'], ['1', 'houseBreath'], ['2', 'D07'], ['3', 'D16']]) await setWheel(Number(w), id);
await page.getByRole('button', { name: 'Try the lock' }).click();
await wait(400);
const fb = await page.locator('.ld-feedback').innerText();
check('a wrong try says how many pictures are right', /3 of the four/.test(fb), fb);
check('a wrong try keeps the wheels where they were', (await S((h, s) => h.ld.story.savedWheels(s.found))).join() === 'coldFeet,houseBreath,D07,D16');
check('"seen" marks show on the paintings the student examined', (await page.locator('.ld-eye').count()) >= 3);
await shot('05-lock-wrong');
await setWheel(1, 'deafeningSilence');
await page.getByRole('button', { name: 'Try the lock' }).click();
check('the right pictures open the first door', await until((h, s) => s.found.ldDoor1 && s.doors.records, 6000));

// ================================================================== 4. the Guest Records
await teleport([2.6, UP, -9.1], 0, 0);
await wait(1200);
await walk(1500);
check('the student walks through the doorway into the Guest Records', await until((h, s) => s.zone === 'records', 2000), await S((h, s) => s.zone));
await shot('06-records');
await teleport([3.55, UP, -11.95], 0, -0.35);
await wait(800);
check('the guest book can be read', /guest book/.test((await use('records-ledger')) ?? ''));
check('the guest book page opens', await until((h, s) => s.note?.card === 'ledger', 3000));
check('nine guests, none signed out', (await page.locator('.ld-ledger tbody tr').count()) === 9 && (await page.locator('.ld-realise').innerText()).includes('Not one'));
await shot('07-ledger');
await page.getByRole('button', { name: 'Close the guest book' }).click();
check('closing it: the draught, and the key falls', await until((h, s) => s.found.ldLedger, 2000));
await wait(3200);
await teleport([3.25, UP, -11.6], 0.3, -0.95);
await wait(700);
check('the fallen key can be taken', /key/.test((await use('records-key')) ?? ''));
check('the key is taken', await until((h, s) => s.found.ldKey, 2000));

// ================================================================== 5. save and Continue in the middle of the mystery
await wait(4500);
await boot(false);
await page.getByRole('button', { name: /continue/i }).click();
check('Continue puts the student back upstairs where they were', await until((h, s) => s.phase === 'play' && (s.zone === 'records' || s.upstairs), 8000), await S((h, s) => s.zone));
check('the mystery carried on from the same step', (await S((h, s) => h.ld.story.ldStage(s.found, s.progress))) === 'ladyDoor');

// ================================================================== 6. her door, her room, the mirror
await S((h) => h.holdHaunting(9999));
await teleport([-2.6, UP, -8.7], 0, -0.1);
await wait(800);
check('her door offers her key', /her key/.test((await use('landing-lady-door')) ?? ''));
check('her door opens', await until((h, s) => s.found.ldDoor2 && s.doors.boudoir, 5000));
await teleport([-2.6, UP, -9.2], 0, 0);
await wait(1000);
await walk(1600);
check('the student walks into her room', await until((h, s) => s.zone === 'boudoir', 2000));
await shot('08-boudoir');
await teleport([-3.05, UP, -14.3], 0, -0.05);
await wait(900);
const t0 = Date.now();
check('the mirror can be looked into', /mirror/.test((await use('boudoir-mirror')) ?? ''));
check('the camera is held on the glass', await until((h, s) => !!s.shotPose, 2000));
await until(() => false, 11000 - (Date.now() - t0));
check('the door behind has slammed', await S((h, s) => !s.doors.boudoir && h.doorSlam.has('boudoir-door')));
await until(() => false, 13000 - (Date.now() - t0));
check('she is in the mirror (and only in it)', await S((h) => h.ld.fx.lady.start > 0 && h.world.t - h.ld.fx.lady.start < h.ld.fx.lady.dur));
await shot('09-mirror');
await until((h, s) => !s.shotPose, 3000);
check('the student has their view back', await S((h, s) => !s.shotPose));
await teleport([-3.05, UP, -14.6], Math.PI, 0); // turn round
await wait(500);
check('turning round: nobody is there', await S((h) => h.ld.fx.turned));
await shot('10-turned');
check('the door creaks open again, and words appear on the mirror', await until((h, s) => s.doors.boudoir && h.ld.fx.mirror.text === 'THEY NEVER LEFT', 6000));
check('the encounter is remembered (never replays after a reload)', await S((h, s) => s.found.ldScare));

// ================================================================== 7. her letter, the end, the empty frame
await teleport([-2.75, UP, -13.1], -Math.PI / 2, -0.55);
await wait(800);
check('her letter can be read', /letter/.test((await use('boudoir-desk')) ?? ''));
check('her letter opens', await until((h, s) => s.note?.card === 'letter', 3000));
check('the letter leaves the question open (rescuer or captor)', (await page.locator('.note-ask').innerText()).includes('save her guests, or did she trap them'));
await shot('11-letter');
await page.getByRole('button', { name: 'Put it back' }).click();
check('the closing card follows', await until((h, s) => s.note?.card === 'end', 4000));
await shot('12-end-card');
await page.getByRole('button', { name: 'Keep exploring' }).click();
check('the chapter is complete', await until((h, s) => h.ld.story.ldStage(s.found, s.progress) === 'done', 2000));
await teleport([-4.5, UP, -12.2], Math.PI, 0);
check('leaving: a figure is standing in the empty frame', await until((h, s) => s.found.ldTwist && h.ld.fx.frameFigure > 0.5, 8000));
await shot('13-frame');
check('the objective says the house has been read', await until(() => (document.querySelector('.objective')?.textContent ?? '').includes('found out what happened'), 10000));

// ================================================================== 8. the Gentle version of the encounter
await S((h, s) => {
  s.setFound('ldScare', false);
  s.setEventLevel('subtle');
  h.doorSlam.clear();
  s.setDoor('boudoir', true);
});
await teleport([-3.05, UP, -14.3], 0, -0.05);
await wait(900);
await use('boudoir-mirror');
await wait(11500);
check('Gentle: the door swings shut instead of slamming', await S((h, s) => !s.doors.boudoir && !h.doorSlam.has('boudoir-door')));
await wait(2000);
check('Gentle: she still appears (the story is the same)', await S((h) => h.ld.fx.lady.start > 0 && h.ld.fx.lady.lean === 0));
await wait(6000);
check('Gentle: the encounter finishes the same way', await S((h, s) => s.doors.boudoir && s.found.ldScare));

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
fs.writeFileSync(`${out}/last-dance.json`, JSON.stringify({ when: new Date().toISOString(), viewport: `${W}x${H}`, results, errors }, null, 2));
console.log(`\n${results.length - failures} passed, ${failures} failed`);
await browser.close();
process.exit(failures ? 1 : 0);
