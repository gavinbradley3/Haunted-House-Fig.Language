// The Lady's landing, with real keyboard and mouse: climb the stairs, walk the landing, read the
// diary, try both doors, then reload and Continue. Reads state through the dev test hook to check.
// Usage: node scripts/phase10/upstairs.mjs [devUrl]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5190/';
const out = 'scripts/out/phase10/upstairs';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const wait = (ms) => page.waitForTimeout(ms);
const st = (fn) => page.evaluate(`(${fn})(window.__hosl.useGame.getState())`);
const cam = () => page.evaluate(() => window.__hosl.liveCamera.position.map((v) => +v.toFixed(2)));
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await wait(ms);
  await page.keyboard.up(key);
};
/** Turn the view with the real mouse (drag), so pointer lock is not needed. */
const turn = async (dx, dy = 0) => {
  await page.mouse.move(683, 384);
  await page.mouse.down();
  await page.mouse.move(683 + dx, 384 + dy, { steps: 12 });
  await page.mouse.up();
  await wait(200);
};

await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith('hosl.')) localStorage.removeItem(k);
  window.__hosl.useGame.getState().setQuality('low');
  window.__hosl.useGame.getState().setEventLevel('off');
});
await page.reload();
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => window.__hosl.useGame.getState().setEventLevel('off'));
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await wait(1500);

// To the foot of the stairs (left), then up.
await hold('KeyA', 2700);
console.log('  at the foot of the stairs:', await cam());
await hold('KeyW', 2000);
const mid = await cam();
check('climbing: the camera rises on the stairs', mid[1] > 2.4, `y ${mid[1]}`);
await page.screenshot({ path: `${out}/01-climbing.png` });
await hold('KeyW', 3200);
const top = await cam();
check('reaches the landing (eye height about 5.05 m)', Math.abs(top[1] - 5.05) < 0.15 && top[2] < -7.6, `${top}`);
check('the game knows the student is upstairs', await st((s) => s.upstairs));
check('the corner label says The Upper Landing', /upper landing/i.test(await page.locator('.location').innerText()));
check('the landing is remembered as found', await st((s) => !!s.found.landing));

// Face along the landing (east) and walk toward the console and the doors.
await page.evaluate(() => window.__hosl.useGame.getState().teleportTo({ position: [-3.5, 5.05, -8.7], yaw: -Math.PI / 2 + 0.25, pitch: -0.05 }));
await wait(800);
await page.addStyleTag({ content: '.free-hint { display: none !important; }' });
await page.screenshot({ path: `${out}/02a-landing-before-walk.png` });
await hold('KeyW', 1000);
await page.screenshot({ path: `${out}/02-landing.png` });
// The door left ajar shuts as you come close.
await hold('KeyW', 1800);
await wait(1800);
check('the door left ajar swung shut as the student came close', await st((s) => !!s.found.landingDoorShut));
await page.screenshot({ path: `${out}/03-door-shut.png` });

// Turn to face the back wall and the console with the diary.
const pos = await cam();
await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo({ position: [0.1, 5.05, -9.05], yaw: 0, pitch: -0.55 }), pos);
await wait(1200);
await page.screenshot({ path: `${out}/04-console.png` });
const diaryAt = await page.evaluate(() => window.__hosl.screenPos('landing-diary'));
if (diaryAt) {
  await page.mouse.move(diaryAt.x, diaryAt.y);
  await wait(400);
  await page.mouse.click(diaryAt.x, diaryAt.y);
  await wait(800);
}
check('clicking the diary opens the page', (await page.locator('.note-paper').count()) === 1);
await page.screenshot({ path: `${out}/05-diary.png` });
await page.keyboard.press('Escape');
await wait(400);
check('Esc puts the diary back', (await page.locator('.note-paper').count()) === 0);
check('the diary is remembered as found', await st((s) => !!s.found.diary));

// The Lady's door: locked.
await page.evaluate(() => window.__hosl.useGame.getState().teleportTo({ position: [-2.6, 5.05, -8.6], yaw: 0, pitch: -0.15 }));
await wait(1200);
const lady = await page.evaluate(() => window.__hosl.screenPos('landing-lady-door'));
await page.mouse.click(lady.x, lady.y);
await wait(600);
check('the Lady’s door is locked (a message, no way through)', /locked/i.test(await page.locator('.notice').innerText().catch(() => '')));
await page.screenshot({ path: `${out}/06-lady-door.png` });
// The shadow under her door.
await page.evaluate(() => window.__hosl.forceHaunt('underDoor'));
await wait(700);
await page.screenshot({ path: `${out}/07-under-door-shadow.png` });

// Collision: cannot walk off the landing through the balustrade.
await page.evaluate(() => window.__hosl.useGame.getState().teleportTo({ position: [2, 5.05, -8.6], yaw: Math.PI, pitch: 0 }));
await wait(600);
await hold('KeyW', 2500);
const rail = await cam();
check('the balustrade stops the student at the landing edge', rail[2] < -7.8 && rail[1] > 4.9, `${rail}`);

// Save and resume upstairs.
await wait(5000);
await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
await page.reload();
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await wait(2500);
await page.click('.title-enter');
await wait(2500);
const back = await cam();
check('Continue puts the student back on the landing', back[1] > 4.9 && (await st((s) => s.upstairs)), `${back}`);

// "I'm stuck" from upstairs goes to the hall floor.
await page.keyboard.press('Escape');
await wait(300);
await page.click('text=I’m stuck');
await page.click('text=Press again');
await wait(1500);
const hall = await cam();
check('"I’m stuck" brings the student down to the entrance hall', hall[1] < 2 && !(await st((s) => s.upstairs)), `${hall}`);

// Down the stairs on foot.
await page.evaluate(() => window.__hosl.useGame.getState().teleportTo({ position: [-5.3, 5.05, -8.6], yaw: Math.PI, pitch: 0 }));
await wait(800);
await hold('KeyW', 5600);
const down = await cam();
check('walking back down the stairs returns to the hall floor', down[1] < 1.8 && !(await st((s) => s.upstairs)), `${down}`);
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
