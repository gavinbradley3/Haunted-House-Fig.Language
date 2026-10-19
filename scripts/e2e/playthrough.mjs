// Full classroom playthrough on a fresh save, using the controls a class uses:
// point at things (real mouse) and press E, reveal/choose/check in the lesson panel, type the class's
// own sentence, tick the class self-check, complete, take each key, unlock each door with it, then the
// Lady's writing box, the final lesson and the ending. Every one of the 25 paintings is examined too.
//
// No teacher shortcuts: lessons are opened from their room objects, doors only open with their keys,
// and answers are chosen by clicking options (the test reads the answer key, as a class would work it out).
// Movement between standing spots uses the test hook's teleport (walking is covered by interact.mjs);
// the player is only ever moved into a room after its door has been unlocked and opened.
//
// Usage: node scripts/e2e/playthrough.mjs [url] [WxH]
//   url: the dev server (npm run dev). It imports /src modules directly, so it does not run against a built bundle.
//   Set PW_CHROMIUM to a Chromium executable to use it instead of installed Chrome.
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5180/';
const [W, H] = (process.argv[3] ?? '1600x900').split('x').map(Number);
const out = 'scripts/out/e2e';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : { channel: 'chrome' }),
  args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource.*favicon/.test(m.text()) && errors.push(m.text()));

let failures = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
const state = (fn, arg) => page.evaluate(([f, a]) => new Function('s', 'a', `return (${f})(s, a)`)(window.__hosl.useGame.getState(), a), [fn.toString(), arg]);
const waitFor = (fn, timeout = 60000) =>
  page.waitForFunction((f) => !!window.__hosl?.useGame && new Function('s', `return (${f})(s)`)(window.__hosl.useGame.getState()), fn.toString(), { timeout, polling: 250 });
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

// ------------------------------------------------------------------ pointing at things

/**
 * Stand in front of an interactable (in the given zone), point the real mouse at it until its prompt
 * appears, and return the prompt. Tries standing spots around it until one gives a clear view.
 */
async function pointAt(id, zone, { minDist = 1.2, maxDist = 2.6, labelMatch } = {}) {
  const spots = await page.evaluate(
    async ([id, zone, minDist, maxDist]) => {
      const it = window.__hosl.getInteractable(id);
      if (!it) return [];
      const col = await import('/src/world/collision.ts');
      const lay = await import('/src/world/layout.ts');
      it.object.updateWorldMatrix(true, true);
      // centre of the object's meshes
      let n = 0, cx = 0, cy = 0, cz = 0;
      it.object.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.computeBoundingBox?.();
        const b = o.geometry.boundingBox;
        if (!b) return;
        const e = o.matrixWorld.elements;
        const lx = (b.min.x + b.max.x) / 2, ly = (b.min.y + b.max.y) / 2, lz = (b.min.z + b.max.z) / 2;
        cx += e[0] * lx + e[4] * ly + e[8] * lz + e[12];
        cy += e[1] * lx + e[5] * ly + e[9] * lz + e[13];
        cz += e[2] * lx + e[6] * ly + e[10] * lz + e[14];
        n++;
      });
      if (!n) return [];
      cx /= n; cy /= n; cz /= n;
      const out = [];
      for (let d = minDist; d <= maxDist + 1e-6; d += 0.35)
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
          const [rx, rz] = col.resolveCircle(x, z);
          if (Math.hypot(rx - x, rz - z) > 1e-3 || lay.zoneAt(z, x) !== zone) continue;
          const dx = cx - x, dy = cy - 1.65, dz = cz - z;
          const l = Math.hypot(dx, dy, dz);
          out.push({ position: [x, 1.65, z], yaw: Math.atan2(-dx, -dz), pitch: Math.asin(dy / l) });
        }
      return out;
    },
    [id, zone, minDist, maxDist],
  );
  for (const pose of spots.slice(0, 40)) {
    await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), pose);
    await wait(700);
    // Points across the object's on-screen bounds: the centre of some objects (two dancers side by side)
    // is empty space, so try a small grid, centre first.
    const pts = await screenPoints(id);
    for (const sp of pts) {
      await page.mouse.move(sp.x + 1, sp.y + 1);
      await page.mouse.move(sp.x, sp.y);
      await wait(300);
      const label = await state((s) => s.hover?.label ?? null);
      const hoverId = await state((s) => s.hover?.id ?? null);
      if (hoverId === id && (!labelMatch || labelMatch.test(label))) return label;
    }
  }
  return null;
}

/** On-screen points over an interactable: its projected bounding box centre, then a 3x3 grid inside it. */
function screenPoints(id) {
  return page.evaluate(async (id) => {
    const it = window.__hosl.getInteractable(id);
    const { renderer } = await import('/src/systems/renderer.ts');
    const cam = renderer.camera;
    if (!it || !cam) return [];
    const V = cam.position.constructor;
    const r = renderer.gl.domElement.getBoundingClientRect();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    it.object.updateWorldMatrix(true, true);
    it.object.traverse((o) => {
      if (!o.isMesh) return;
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
    const pts = [[0.5, 0.5], [0.3, 0.5], [0.7, 0.5], [0.5, 0.3], [0.5, 0.7], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
    return pts.map(([fx, fy]) => ({ x: cl(x0 + (x1 - x0) * fx, r.left, r.right), y: cl(y0 + (y1 - y0) * fy, r.top, r.bottom) }));
  }, id);
}

/** Point at an object and press E, as a student does. Returns the prompt that was shown. */
async function use(id, zone, opts) {
  const label = await pointAt(id, zone, opts);
  if (label) await page.keyboard.press('KeyE');
  return label;
}

// ------------------------------------------------------------------ lessons

const foot = () => page.locator('.panel-foot .btn.primary');
async function clickFoot() {
  await foot().click();
  await wait(450);
}

/** Work through one room's lesson in the panel, exactly as the class does. */
async function doLesson(room) {
  const C = await page.evaluate((r) => window.__hosl.content[r], room);
  await waitFor((s) => s.lessonActive, 20000);
  await page.locator('.panel-foot').waitFor({ timeout: 20000 });
  // Discover: reveal both descriptions
  for (let i = 0; i < 2; i++) {
    const b = page.locator('.reveal-btn').first();
    if (await b.count()) await b.click();
    await wait(300);
  }
  await clickFoot();
  // Learn: read every card
  for (let i = 0; i < 20 && (await state((s) => s.lessons[s.room].stage)) === 'learn'; i++) await clickFoot();
  for (const stage of ['playA', 'playB']) {
    check(`${room}: reached ${stage}`, (await state((s) => s.lessons[s.room].stage)) === stage);
    const ch = C[stage];
    if (ch.build) {
      // find a phrase the rules accept, then press the tiles
      const pick = await page.evaluate((spec) => {
        const walk = (i, acc) => {
          if (i === spec.trays.length) return window.__hosl.evaluateBuild(spec, acc).ok ? acc : null;
          for (const t of spec.trays[i].tiles) {
            const r = walk(i + 1, [...acc, t.id]);
            if (r) return r;
          }
          return null;
        };
        return walk(0, []);
      }, ch.build);
      for (let t = 0; t < pick.length; t++) {
        const tile = ch.build.trays[t].tiles.find((x) => x.id === pick[t]);
        await page.locator('.tray').nth(t).locator('.tile', { hasText: tile.text }).first().click();
        await wait(150);
      }
      await page.locator('.panel-body .btn.primary', { hasText: /Check/ }).click();
    } else if (ch.items?.length) {
      for (let i = 0; i < ch.items.length; i++) {
        const it = ch.items[i];
        const right = it.options.find((o) => o.correct);
        await page.locator('.item-head').nth(i).click();
        await wait(250);
        const book = page.locator('.item.open button', { hasText: 'Open the book' });
        if (await book.count()) {
          await book.click();
          await wait(250);
        }
        await page.locator('.item.open .option', { hasText: right.text }).first().click();
        await page.locator('.item.open button', { hasText: 'Check my answer' }).click();
        await wait(350);
      }
    } else {
      const right = ch.options.find((o) => o.correct);
      await page.locator('.panel-body .option', { hasText: right.text }).first().click();
      await page.locator('.panel-body .btn.primary', { hasText: /Check/ }).first().click();
    }
    await wait(500);
    check(`${room}: ${stage} solved by the class`, await state((s, st) => s.lessons[s.room][st].solved && !s.lessons[s.room][st].revealedByTeacher, stage));
    await clickFoot();
  }
  // Prove: the class's sentence, the self-check, then Complete
  check(`${room}: reached prove`, (await state((s) => s.lessons[s.room].stage)) === 'prove');
  const complete = page.locator('.panel-foot .btn.primary', { hasText: 'Complete the challenge' });
  if (C.requireMastery) check(`${room}: Complete is disabled before the class writes and self-checks`, await complete.isDisabled());
  await page.locator('.entry input').fill(C.prove.model);
  await page.locator('.entry button[type=submit]').click();
  await wait(300);
  const boxes = page.locator('.criteria input[type=checkbox]');
  const nBoxes = await boxes.count();
  check(`${room}: self-check lists every criterion`, nBoxes === C.prove.criteria.length, `${nBoxes}`);
  for (let i = 0; i < nBoxes; i++) await boxes.nth(i).check();
  check(`${room}: Complete enabled after sentence + self-check`, await complete.isEnabled());
  await complete.click();
  await waitFor((s) => s.lessons[s.room].stage === 'complete', 10000).catch(() => {});
  check(`${room}: lesson complete`, await state((s, r) => s.progress.completed[r], room));
  await shot(`${room}-complete`);
}

/** After a lesson: "Go and take the key", then take it with E. */
async function takeKey(room, keyId) {
  await page.locator('.panel-foot .btn.primary', { hasText: 'Go and take the key' }).click();
  await waitFor((s) => !s.lessonActive, 10000);
  await wait(1800);
  const zone = await state((s) => s.zone);
  const label = await use(`key-${keyId}`, zone, { minDist: 0.9, maxDist: 2.2 });
  await wait(1500);
  check(`${room}: ${keyId} taken with E`, await state((s, k) => !!s.progress.keys[k], keyId), label ?? 'no prompt');
}

/** Unlock a door from the side the class is on, with the key it has, and wait for it to open. */
async function unlock(doorId, door, zone) {
  const label = await use(doorId, zone, { minDist: 1.0, maxDist: 2.4 });
  check(`${doorId}: prompt offers the key`, !!label && /Unlock|Open|use the .* Key/.test(label), label ?? 'no prompt');
  await page.waitForFunction((d) => window.__hosl.useGame.getState().doors[d], door, { timeout: 15000, polling: 250 }).catch(() => {});
  check(`${doorId}: opens with its key`, await state((s, d) => s.doors[d], door));
}

/** Enter a room through its open door (only after it has been unlocked). */
async function enter(room) {
  const pose = await page.evaluate(async (r) => {
    const { ROOM_PLACES } = await import('/src/lesson/director.tsx');
    return ROOM_PLACES[r].entry;
  }, room);
  await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), pose);
  await wait(1500);
}

// ------------------------------------------------------------------ paintings

/** Examine a painting with E: full image shown, label present, nothing cropped, Esc returns to the same view. */
async function examine(id, zone, expectTitle) {
  const label = await pointAt(`painting-${id}`, zone, { minDist: 1.2, maxDist: id.startsWith('D0') && ['D01', 'D02', 'D03', 'D04', 'D05'].includes(id) ? 9 : 3.2 });
  if (!label) return check(`painting ${id}: prompt appears when pointed at`, false, 'not reachable');
  const before = await page.evaluate(() => [...window.__hosl.liveCamera.position]);
  await page.keyboard.press('KeyE');
  await page.locator('.painting-viewer').waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('.painting-viewer .pv-img')];
    return imgs.length && imgs[imgs.length - 1].complete && imgs[imgs.length - 1].naturalWidth > 0;
  }, null, { timeout: 15000 }).catch(() => {});
  const v = await page.evaluate(() => {
    const el = document.querySelector('.painting-viewer');
    if (!el) return null;
    const imgs = [...el.querySelectorAll('.pv-img')];
    const img = imgs[imgs.length - 1];
    const r = img.getBoundingClientRect();
    const frame = el.querySelector('.pv-canvas').getBoundingClientRect();
    const label = el.querySelector('.pv-label').getBoundingClientRect();
    const overlap = !(label.right <= frame.left || label.left >= frame.right || label.bottom <= frame.top || label.top >= frame.bottom);
    return {
      title: el.querySelector('.pv-title')?.textContent ?? '',
      note: el.querySelector('.pv-note')?.textContent ?? '',
      natural: [img.naturalWidth, img.naturalHeight],
      shown: [r.width, r.height],
      inside: r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
      overlap,
      fill: Math.max(r.width / innerWidth, r.height / innerHeight),
    };
  });
  if (!v) return check(`painting ${id}: viewer opens`, false);
  const aspectErr = Math.abs(v.shown[0] / v.shown[1] / (v.natural[0] / v.natural[1]) - 1);
  check(
    `painting ${id}: whole painting shown, uncropped, label beside it`,
    v.title.length > 0 && (!expectTitle || v.title === expectTitle) && v.note.length > 20 && aspectErr < 0.01 && v.inside && !v.overlap,
    `${v.title} · ${v.natural.join('x')} shown ${v.shown.map(Math.round).join('x')} · fills ${(v.fill * 100).toFixed(0)}%`,
  );
  await shot(`painting-${id}`);
  // optional zoom, then back to the whole painting
  await page.locator('.pv-zbtn[aria-label="Zoom in"]').click();
  await wait(250);
  const zoomed = await page.evaluate(() => /scale\((?!1\))/.test(document.querySelector('.painting-viewer .pv-img:last-of-type')?.style.transform ?? ''));
  await page.locator('.pv-zbtn.fit').click();
  await wait(250);
  const fitted = await page.evaluate(() => /scale\(1\)/.test(document.querySelector('.painting-viewer .pv-img:last-of-type')?.style.transform ?? ''));
  check(`painting ${id}: zoom in and back to the whole painting`, zoomed && fitted);
  await page.keyboard.press('Escape');
  await wait(400);
  const after = await page.evaluate(() => [...window.__hosl.liveCamera.position]);
  const closed = await state((s) => s.inspecting === null);
  check(`painting ${id}: Esc closes and returns to the same place`, closed && Math.hypot(after[0] - before[0], after[2] - before[2]) < 0.05);
}

// ------------------------------------------------------------------ the playthrough

await page.goto(base);
await page.evaluate(() => {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('hosl.') && k !== 'hosl.quality') localStorage.removeItem(k);
  } catch {}
});
await page.reload();
await waitFor((s) => s.phase === 'title', 240000);
await page.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
check('fresh save: no rooms complete', await state((s) => Object.values(s.progress.completed).every((v) => !v)));
await page.click('text=Enter the House');
await waitFor((s) => s.phase === 'intro' && !!s.cinematic, 30000);
await wait(1500);
await page.keyboard.press('Space');
await waitFor((s) => s.phase === 'play' && !s.cinematic, 60000);
check('arrival: in the entrance hall', (await state((s) => s.zone)) === 'hall');

const P = await page.evaluate(async () => {
  const { PAINTINGS } = await import('/src/content/paintings.ts');
  const { DECOR_PAINTINGS } = await import('/src/content/decorPaintings.ts');
  return Object.fromEntries([...Object.values(PAINTINGS).map((p) => [p.id, p.title]), ...Object.values(DECOR_PAINTINGS).map((p) => [p.id, p.title])]);
});

// Entrance hall and corridor paintings (open from the start)
for (const [id, zone] of [['houseBreath', 'hall'], ['ladyOfHouse', 'hall'], ['D01', 'hall'], ['D02', 'hall'], ['D03', 'hall'], ['D04', 'hall'], ['D05', 'hall'], ['whisperingWalls', 'corridor'], ['coldFeet', 'corridor']])
  await examine(id, zone, P[id]);

// Room 1: Hall of Mirrors
await use('mirror-door', 'corridor', { labelMatch: /Hall of Mirrors/ });
await waitFor((s) => s.doors.mirror, 15000).catch(() => {});
check('mirror door opens', await state((s) => s.doors.mirror));
await enter('mirrors');
check('mirrors: lesson opened from the speaking mirror', !!(await use('speaking-mirror', 'mirrors', { labelMatch: /mirror/ })));
await doLesson('mirrors');
await takeKey('mirrors', 'mirrorKey');

// Room 2: Portrait Gallery (the caretaker's portrait opens the lesson from the painting viewer)
await unlock('gallery-door', 'gallery', 'corridor');
await enter('gallery');
for (const id of ['deafeningSilence', 'oldManShadow', 'nervousSitter', 'D06', 'D07', 'D08', 'D09']) await examine(id, 'gallery', id === 'oldManShadow' ? 'Title missing' : P[id]);
await examine('emptyFrame', 'gallery', P.emptyFrame);
const caretakerLabel = await use('painting-caretaker', 'gallery', { minDist: 1.6, maxDist: 3.4 });
await page.locator('.painting-viewer').waitFor({ timeout: 8000 }).catch(() => {});
check('gallery: caretaker viewer offers the lesson', (await page.locator('.painting-viewer button', { hasText: 'Begin the lesson here' }).count()) === 1, caretakerLabel ?? '');
await shot('painting-caretaker-before-lesson');
await page.locator('.painting-viewer button', { hasText: 'Begin the lesson here' }).click();
await doLesson('gallery');
check('gallery: old man title restored after the lesson', await page.evaluate(() => window.__hosl.useGame.getState().lessons.gallery.playA.solved));
await takeKey('gallery', 'galleryKey');
await examine('caretaker', 'gallery', P.caretaker);
await examine('oldManShadow', 'gallery', P.oldManShadow);

// Room 3: Giant's Dining Room
await unlock('dining-door', 'dining', 'corridor');
await enter('dining');
for (const id of ['D10', 'D11', 'D12', 'D13']) await examine(id, 'dining', P[id]);
check('dining: lesson opened from the giant’s place', !!(await use('dining-giant-place', 'dining')));
await doLesson('dining');
await takeKey('dining', 'diningKey');

// Room 4: Nursery (through the jib door in the Hall of Mirrors)
await enter('mirrors');
await unlock('jib-door', 'jib', 'mirrors');
await enter('nursery');
for (const id of ['D14', 'D15', 'D16']) await examine(id, 'nursery', P[id]);
check('nursery: lesson opened from the music box', !!(await use('nursery-music-box', 'nursery')));
await doLesson('nursery');
await takeKey('nursery', 'nurseryKey');

// Room 5: Chamber of Echoes
await unlock('echoes-door', 'echoes', 'nursery');
await enter('echoes');
check('echoes: lesson opened from the piano', !!(await use('echoes-piano', 'echoes')));
await doLesson('echoes');
await takeKey('echoes', 'echoesKey');

// Room 6: Whispering Press
await unlock('press-door', 'press', 'echoes');
await enter('press');
check('press: lesson opened from the press', !!(await use('press-machine', 'press')));
await doLesson('press');
await takeKey('press', 'pressKey');

// Room 7: Crooked Kitchen (from the hall)
await enter('finale');
await unlock('kitchen-door', 'kitchen', 'hall');
await enter('kitchen');
check('kitchen: lesson opened from the table', !!(await use('kitchen-table', 'kitchen')));
await doLesson('kitchen');
await takeKey('kitchen', 'kitchenKey');

// Room 8: Ballroom of Contradictions (from the dining room)
await enter('dining');
await unlock('ballroom-door', 'ballroom', 'dining');
await enter('ballroom');
check('ballroom: lesson opened from the dancers', !!(await use('ballroom-dancers', 'ballroom', { minDist: 1.6, maxDist: 3.2 })));
await doLesson('ballroom');
await takeKey('ballroom', 'ballroomKey');

// Room 9: Scholar's Study (from the hall)
await enter('finale');
await unlock('study-door', 'study', 'hall');
await enter('study');
check('study: lesson opened from the desk', !!(await use('study-desk', 'study')));
await doLesson('study');
await takeKey('study', 'studyKey');

// The final challenge: the Lady's writing box in the hall
await enter('finale');
const boxLabel = await use('writing-box', 'hall', { minDist: 0.9, maxDist: 2.2 });
check('finale: writing box offers the Scholar’s Key', !!boxLabel && /Unlock/.test(boxLabel), boxLabel ?? 'no prompt');
await waitFor((s) => s.lessonActive && s.room === 'finale', 30000).catch(() => {});
check('finale: the letter opens the final lesson', await state((s) => s.lessonActive && s.room === 'finale'));
await doLesson('finale');
await page.locator('.panel-foot .btn.primary', { hasText: 'Finish the night' }).click();
await waitFor((s) => s.endingOpen, 10000).catch(() => {});
check('ending: shown after the final lesson', await state((s) => s.endingOpen));
await shot('ending');
check('all nine rooms and the finale complete', await state((s) => Object.values(s.progress.completed).every(Boolean)), JSON.stringify(await state((s) => s.progress.completed)));
check('progress saved locally', await page.evaluate(() => !!localStorage.getItem('hosl.progress')));

const paintingChecks = results.filter((r) => r.name.startsWith('painting ') && r.name.includes('whole painting'));
check('all 25 paintings examined', new Set(paintingChecks.filter((r) => r.ok).map((r) => r.name.split(':')[0])).size === 25, `${new Set(paintingChecks.map((r) => r.name.split(':')[0])).size} examined`);
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
fs.writeFileSync(`${out}/results.json`, JSON.stringify({ viewport: [W, H], failures, results, errors }, null, 2));
console.log(`\n${results.length - failures} passed, ${failures} failed`);
await browser.close();
process.exit(failures ? 1 : 0);
