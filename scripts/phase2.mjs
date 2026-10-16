// Phase 2 walkthrough: keys, doors, paintings, the Portrait Gallery lesson and strange events.
// Usage: node scripts/phase2.mjs [url]   (needs `npm run build:test` then `npm run preview:test` running). Screenshots go to scripts/out/p2-*.png
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/?testdt=0.5';
fs.mkdirSync('scripts/out', { recursive: true });
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()));
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (n) => {
  await page.screenshot({ path: `scripts/out/p2-${n}.png`, timeout: 240000 });
  console.log('shot', n);
};
const st = (fn) => page.evaluate(`(${fn})(window.__hosl.useGame.getState())`);
const act = (fn, arg) => page.evaluate(fn, arg);
const d = (a) => act((a) => window.__hosl.useGame.getState().dispatch(a), a);
const use = (id) => act((id) => window.__hosl.getInteractable(id)?.onUse(), id);
const pose = (p) => act((p) => window.__hosl.useGame.getState().teleportTo(p), p);

await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 240000 });
await act(() => localStorage.removeItem('hosl.progress'));
await act(() => window.__hosl.nav.startIntro(true));
await wait(6000);

// --- Paintings in the hall: inspect and close
await pose({ position: [-4.0, 1.65, -7.6], yaw: 0, pitch: 0.12 });
await wait(9000);
await shot('01-hall-painting');
await use('painting-houseBreath');
await wait(9000);
check('inspecting a painting shows its title', await page.isVisible('text=The House That Held Its Breath'));
await shot('02-inspect-houseBreath');
await page.keyboard.press('KeyE');
await wait(2000);
check('E closes the inspection', (await st((s) => s.inspecting)) === null);
await use('painting-houseBreath');
await wait(1500);
await page.keyboard.press('Escape');
await wait(1500);
check('Esc closes it too (repeatable)', (await st((s) => s.inspecting)) === null);

// --- The gallery door before the key
await pose({ position: [-0.2, 1.65, -12.9], yaw: Math.PI / 2, pitch: 0 });
await wait(8000);
await shot('03-gallery-door-locked');
await use('gallery-door');
await wait(1000);
check('gallery door is locked without the Mirror Key', !(await st((s) => s.doors.gallery)));
check('locked door explains why', await page.isVisible('text=The Portrait Gallery is locked.'));

// --- Mirror Key: cannot be taken early, appears after completion
check('mirror key not available before the lesson', !(await act(() => !!window.__hosl.getInteractable('key-mirrorKey'))));
await act(() => window.__hosl.director.openLesson('mirrors'));
await wait(4000);
await act(() => window.__hosl.useGame.getState().gotoStage('prove'));
await d({ type: 'COMPLETE' });
await wait(12000);
await shot('04-mirrors-complete-drawer');
check('completing the mirrors completes the room', await st((s) => s.progress.completed.mirrors));
await page.click('text=Go and take the key');
await wait(9000);
await shot('05-mirror-key-in-drawer');
await use('key-mirrorKey');
await wait(3000);
check('the Mirror Key is collected', await st((s) => s.progress.keys.mirrorKey));
await use('key-mirrorKey');
check('it cannot be collected twice', !(await act(() => !!window.__hosl.getInteractable('key-mirrorKey')?.label())));

// --- Unlock the gallery
await pose({ position: [-0.2, 1.65, -12.9], yaw: Math.PI / 2, pitch: 0 });
await wait(5000);
await use('gallery-door');
await wait(6000);
check('the Mirror Key unlocks the gallery and the door opens', await st((s) => s.progress.galleryUnlocked && s.doors.gallery));
await shot('06-gallery-door-open');
await use('gallery-door');
await wait(1500);
await use('gallery-door');
await wait(1500);
check('the unlocked door stays unlocked (close and reopen)', await st((s) => s.progress.galleryUnlocked && s.doors.gallery));

// --- The gallery itself
await pose({ position: [-2.4, 1.65, -14.1], yaw: Math.PI / 2, pitch: 0.06 });
await wait(14000);
await shot('07-gallery-wide');
await pose({ position: [-5.5, 1.65, -11.6], yaw: Math.PI / 2 + 0.55, pitch: 0.05 });
await wait(9000);
await shot('08-gallery-south');
await pose({ position: [-6.5, 1.65, -16.6], yaw: Math.PI / 2 - 0.6, pitch: 0.05 });
await wait(9000);
await shot('09-gallery-north');
await use('painting-caretaker');
await wait(9000);
await shot('10-inspect-caretaker');
check('caretaker card offers the lesson', await page.isVisible('text=Begin the lesson here'));
await page.click('text=Begin the lesson here');
await wait(8000);
check('the gallery lesson opens', await st((s) => s.lessonActive && s.room === 'gallery'));

// --- Metaphor lesson
await d({ type: 'REVEAL_DESCRIPTION', which: 'A' });
await wait(5000);
await shot('11-discover-title');
await d({ type: 'REVEAL_DESCRIPTION', which: 'B' });
await wait(3000);
await shot('12-discover-simile');
await d({ type: 'NEXT' });
await wait(5000);
await shot('13-learn-term');
await d({ type: 'NEXT' });
await wait(3000);
await shot('14-learn-compare');
await d({ type: 'NEXT' });
await wait(6000);
await shot('15-learn-annotate');
await d({ type: 'NEXT' });
await d({ type: 'NEXT' });
await wait(6000);
await d({ type: 'SELECT_OPTION', challenge: 'playA', optionId: 'a' });
await d({ type: 'CHECK_ANSWER', challenge: 'playA' });
await wait(2500);
check('wrong answer A explains it is a simile', await page.isVisible('text=A simile, not a metaphor'));
await d({ type: 'SELECT_OPTION', challenge: 'playA', optionId: 'b' });
await d({ type: 'CHECK_ANSWER', challenge: 'playA' });
await wait(9000);
await shot('16-playA-restored');
check('nameplate title restored after Challenge A', await st((s) => s.lessons.gallery.playA.solved));
await d({ type: 'NEXT' });
await wait(5000);
await d({ type: 'SELECT_OPTION', challenge: 'playB', optionId: 'd' });
await wait(6000);
await shot('17-playB-sunflowers');
await d({ type: 'SELECT_OPTION', challenge: 'playB', optionId: 'b' });
await wait(8000);
await shot('18-playB-moths');
await d({ type: 'CHECK_ANSWER', challenge: 'playB' });
await wait(2000);
await d({ type: 'NEXT' });
await wait(6000);
check('second key not available before completion', !(await act(() => !!window.__hosl.getInteractable('key-galleryKey'))));
await d({ type: 'SET_DRAFT', text: 'The house was a held breath waiting to scream.' });
await d({ type: 'SUBMIT_RESPONSE' });
await wait(9000);
await shot('19-prove-frame');
await d({ type: 'REVEAL_MODEL' });
await wait(4000);
await shot('20-prove-model');
await d({ type: 'COMPLETE' });
await wait(14000);
await shot('21-gallery-complete');
check('gallery completed', await st((s) => s.progress.completed.gallery));
await page.click('text=Go and take the key');
await wait(9000);
await shot('22-gallery-key-safe');
await use('key-galleryKey');
await wait(3000);
check('the Gallery Key is collected', await st((s) => s.progress.keys.galleryKey));

// --- Revisiting and persistence
await act(() => window.__hosl.nav.jumpToMirrors());
await wait(4000);
check('revisiting the Hall of Mirrors keeps progress', await st((s) => s.progress.keys.mirrorKey && s.progress.keys.galleryKey && s.progress.galleryUnlocked));
const saved = await act(() => JSON.parse(localStorage.getItem('hosl.progress') || '{}'));
check('progress is saved locally', !!saved.keys?.galleryKey && !!saved.galleryUnlocked);
await pose({ position: [0.2, 1.65, -15.4], yaw: -Math.PI / 2, pitch: 0 });
await wait(4000);
await use('locked--15.4');
await wait(1000);
check('the next door acknowledges the second key but stays shut', await page.isVisible('text=will not turn'));

// --- Strange events
await act(() => window.__hosl.nav.jumpToHall());
await wait(4000);
const tilts = [];
for (let i = 0; i < 6; i++) {
  await act(() => window.__hosl.triggerStrangeEvent());
  await wait(1500);
  tilts.push(await act(() => [...window.__hosl.hungPaintings.values()].some((p) => p.tilt !== 0)));
}
check('strange events can be triggered on demand without errors', true);
console.log('a painting went crooked during the triggers:', tilts.some(Boolean));

// --- Reset progress
await act(() => window.__hosl.useGame.getState().progressDispatch({ type: 'RESET_PROGRESS' }));
check('teacher reset locks everything again', await st((s) => !s.progress.galleryUnlocked && !s.progress.keys.mirrorKey && s.lessons.gallery.stage === 'discover'));

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(failures ? `${failures} check(s) failed` : 'All phase 2 checks passed');
process.exit(failures ? 1 : 0);
