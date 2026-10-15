// Input-driven checks: real mouse clicks and key presses, with assertions on game state.
// Usage: node scripts/interact.mjs [url]   (needs `npm run preview` or `npm run dev` running)
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173/?testdt=0.5';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()));

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const state = (fn) => page.evaluate(`(${fn})(window.__hosl.useGame.getState())`);
const waitFor = (fn, timeout = 240000) => page.waitForFunction(`(${fn})(window.__hosl.useGame.getState())`, null, { timeout, polling: 500 });

await page.goto(base);
await page.evaluate(() => { try { localStorage.removeItem('hosl.progress'); } catch {} });
await page.reload();
await waitFor((s) => s.phase === 'title');
check('title screen shows', await page.isVisible('text=Enter the House'));

// Real click on "Enter the House" (no skip): the intro cinematic should start
await page.click('text=Enter the House');
await waitFor((s) => s.phase === 'intro' && !!s.cinematic, 30000);
check('Enter the House starts the arrival cinematic', true);
await page.waitForTimeout(3000);
await page.keyboard.press('Space');
await waitFor((s) => s.phase === 'play' && !s.cinematic, 60000);
check('Space skips the cinematic into play', true);
check('front door opened during arrival', await state((s) => s.doors.front));
check('player is in the entrance hall', (await state((s) => s.zone)) === 'hall');

// Walk forward with W: the camera should move toward the corridor (-z)
const z0 = await page.evaluate(() => window.__hosl.liveCamera.position[2]);
await page.keyboard.down('KeyW');
await page.waitForTimeout(8000);
await page.keyboard.up('KeyW');
const z1 = await page.evaluate(() => window.__hosl.liveCamera.position[2]);
check('W walks forward', z1 < z0 - 0.3, `z ${z0.toFixed(2)} -> ${z1.toFixed(2)}`);

// Teleport to face the mirror door, then click it with the mouse (pointer free)
await page.evaluate(() => window.__hosl.useGame.getState().teleportTo({ position: [0, 1.65, -16.9], yaw: 0, pitch: 0 }));
await page.waitForTimeout(4000);
await page.mouse.move(640, 380);
await page.waitForTimeout(4000);
const hover = await state((s) => s.hover?.label ?? null);
check('hovering the mirror door shows a prompt', !!hover && /Hall of Mirrors/.test(hover), hover ?? 'none');
await page.mouse.click(640, 380);
await waitFor((s) => s.doors.mirror, 30000).catch(() => {});
check('clicking the door opens it', await state((s) => s.doors.mirror));

// Walk through the open door with W
await page.keyboard.down('KeyW');
await waitFor((s) => s.zone === 'mirrors', 120000).catch(() => {});
await page.keyboard.up('KeyW');
check('walking through the open door reaches the Hall of Mirrors', (await state((s) => s.zone)) === 'mirrors');

// Teacher panel via keyboard; open lesson via its button
await page.keyboard.press('KeyT');
check('T opens the teacher panel', await page.isVisible('text=Teacher Controls'));
await page.click('text=Open the lesson');
await waitFor((s) => s.lessonActive && s.shot === 'curtains', 30000).catch(() => {});
check('teacher "Open the lesson" opens the lesson view', await state((s) => s.lessonActive));
await page.keyboard.press('KeyT');

// Click through Discover using the real buttons
await page.click('text=Reveal description A');
await page.click('text=Reveal description B');
check('Continue enabled after both descriptions', await page.isEnabled('text=Learn the word for it'));
await page.click('text=Learn the word for it');
check('Learn stage shows SIMILE', await page.isVisible('.term'));

// Teacher: jump to Challenge A, pick wrong then reveal
await page.keyboard.press('KeyT');
await page.waitForSelector('.teacher', { timeout: 20000 }).catch(async () => {
  await page.screenshot({ path: 'scripts/out/debug-teacher.png' });
  console.log('teacherOpen =', await state((s) => s.teacherOpen), 'active element =', await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
});
await page.click('.teacher >> text=Challenge A');
await page.keyboard.press('KeyT');
await page.click('text=I like old houses.');
await page.click('text=Check the class’s answer');
check('wrong answer shows explanation', await page.isVisible('.feedback.bad'));
await page.keyboard.press('KeyT');
await page.click('text=Reveal the answer');
await page.keyboard.press('KeyT');
check('reveal answer solves challenge A', await state((s) => s.lessons.mirrors.playA.solved && s.lessons.mirrors.playA.revealedByTeacher));

// Prove: type a student simile with the keyboard
await page.keyboard.press('KeyT');
await page.click('.teacher >> text=Prove');
await page.keyboard.press('KeyT');
await page.click('input[aria-label="Student simile"]');
await page.keyboard.type('The clock ticked like a tapping finger on glass.');
await page.keyboard.press('Enter');
check('typed simile is shown', await page.isVisible('text=tapping finger on glass'));
check('typing T in the input did not toggle the teacher panel', !(await page.isVisible('text=Teacher Controls')));
await page.click('text=Complete the challenge');
check('completing reaches the complete stage', (await state((s) => s.lessons.mirrors.stage)) === 'complete');

// Pause/mute keys
await page.keyboard.press('KeyP');
check('P pauses', await state((s) => s.paused));
await page.keyboard.press('KeyP');
await page.keyboard.press('KeyM');
const muted = await state((s) => s.muted);
await page.keyboard.press('KeyM');
check('M toggles mute', muted !== (await state((s) => s.muted)));

// Completion now leads to a real key: go to it, take it with E, then walk back
await page.click('text=Go and take the key');
await waitFor((s) => !s.lessonActive, 30000).catch(() => {});
await page.waitForTimeout(8000);
await page.evaluate(() => window.__hosl.getInteractable('key-mirrorKey')?.onUse());
await waitFor((s) => s.progress.keys.mirrorKey, 30000).catch(() => {});
check('the Mirror Key can be taken after completing the room', await state((s) => s.progress.keys.mirrorKey));
await page.keyboard.press('KeyT');
await page.click('.teacher >> text=Walk to the Hall');
await page.keyboard.press('KeyT');
await waitFor((s) => !s.cinematic && s.zone === 'hall', 240000).catch(() => {});
check('Walk to the Hall returns to the entrance hall', (await state((s) => s.zone)) === 'hall');

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(failures ? `${failures} check(s) failed` : 'All interaction checks passed');
process.exit(failures ? 1 : 0);
