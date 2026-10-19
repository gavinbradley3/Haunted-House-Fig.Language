// Student build, student controls only: no test hook, no teacher panel, real keyboard and mouse.
// Checks the title screen, the menu, walking, saving and "Continue" after a reload.
//
// Usage: node scripts/phase10/student-smoke.mjs [url] [WxH]
//   url: a server for the STUDENT build (npm run build, then vite preview --outDir dist).
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4176/';
const [W, H] = (process.argv[3] ?? '1366x768').split('x').map(Number);
const out = 'scripts/out/phase10/smoke';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : { channel: 'chrome' }),
  headless: process.env.HEADED ? false : true,
  args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({ viewport: { width: W, height: H } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));

let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const text = (sel) => page.locator(sel).first().innerText().catch(() => '');
/** The room name only (the location box also holds the next-step line). */
const room = async (pg = page) => (await pg.locator('.location').first().innerText().catch(() => '')).split(String.fromCharCode(10))[0];

await page.goto(base);
await page.waitForSelector('.title-enter', { timeout: 120000 });
await wait(3500); // title animations
await shot('01-title');
check('title offers "Enter the House" on a fresh profile', (await text('.title-enter')).match(/enter the house/i) !== null);
check('no test hook in the student build', await page.evaluate(() => !('__hosl' in window)));
check('title says progress saves on this Chromebook', /saves automatically on this Chromebook/.test(await text('.title-hint')));
check('title does not mention teacher controls', !/teacher/i.test(await text('.title-screen')));

await page.keyboard.press('KeyT');
await wait(300);
check('T does not open a teacher panel', (await page.locator('.teacher').count()) === 0);

// Enter, skipping the arrival.
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForSelector('.location', { timeout: 30000 });
await wait(1500);
check('arrives in the entrance hall', /entrance hall/i.test(await room()));
check('the next step is shown', /Hall of Mirrors/.test(await text('.objective')), await text('.objective'));
check('no teacher key button', (await page.locator('.teacher-key').count()) === 0);
check('menu button present', (await page.locator('.menu-key').count()) === 1);
await shot('02-hall');

// Menu: Esc (pointer is free at this point).
await page.keyboard.press('Escape');
await wait(400);
check('Esc opens the student menu', (await page.locator('.menu').count()) === 1);
await shot('03-menu');
const menuText = await text('.menu');
check('menu has volume, captions, look speed and "I’m stuck"', /volume/i.test(menuText) && /captions/i.test(menuText) && /look speed/i.test(menuText) && /stuck/i.test(menuText));
check('menu has no teacher controls', !/teacher|skip ahead|reveal/i.test(menuText));
await page.click('text=Back to the house');
await wait(300);
check('menu closes', (await page.locator('.menu').count()) === 0);

// Walk forward (W) into the corridor with the real keyboard.
await page.mouse.move(W / 2, H / 2);
// Around the centre table (it stands between the front door and the corridor), then on down the corridor.
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await wait(ms);
  await page.keyboard.up(key);
};
await hold('KeyA', 450);
await hold('KeyW', 2600);
await hold('KeyD', 300);
await hold('KeyW', 3400);
await wait(600);
const where = await room();
check('walking with W reaches the long corridor', /corridor/i.test(where), where);
await shot('04-corridor');

// Wait for the place to be saved (it saves every few seconds while walking), then reload.
await wait(5000);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hosl.save') ?? 'null'));
check('the game saved a versioned record', saved?.v === 2, saved ? `rev ${saved.rev}` : 'nothing saved');
check('the saved place is in the corridor', saved?.place && saved.place.z < -10.3, saved?.place ? `z ${saved.place.z.toFixed(2)}` : '');

await page.reload();
await page.waitForSelector('.title-enter', { timeout: 120000 });
await wait(3500);
await shot('05-title-continue');
check('after a reload the title offers "Continue"', /continue/i.test(await text('.title-enter')));
check('the title shows progress and the next step', /0 of 9 rooms complete/.test(await text('.title-progress')), await text('.title-progress'));
await page.click('.title-enter');
await page.waitForSelector('.location', { timeout: 30000 });
await wait(1500);
check('"Continue" returns to the corridor', /corridor/i.test(await room()), await room());
check('a welcome-back notice gives the next step', /Next:/.test(await text('.notice')), await text('.notice'));
await shot('06-continued');

// A second tab of the same game: the first tab must stop saving and say so.
const page2 = await context.newPage();
await page2.goto(base);
await page2.waitForSelector('.title-enter', { timeout: 120000 });
await wait(3000);
await page2.click('.title-enter');
await page2.waitForSelector('.location', { timeout: 30000 });
await page2.keyboard.down('KeyS');
await page2.waitForTimeout(2500);
await page2.keyboard.up('KeyS');
await page2.waitForTimeout(6000);
const revs = await Promise.all([page, page2].map((p) => p.evaluate(() => localStorage.getItem('hosl.save.rev'))));
console.log('  rev seen by each tab:', revs.join(' / '));
console.log('  recovery card in tab 1 / tab 2:', await page.locator('.recovery').count(), '/', await page2.locator('.recovery').count());
await page.bringToFront();
await wait(800);
check('the older tab says the game is open in another tab', (await page.locator('.recovery').count()) === 1, await text('.recovery h2'));
await shot('07-two-tabs');
await page2.close();

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASSED'}`);
await browser.close();
process.exit(failures ? 1 : 0);
