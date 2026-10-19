// Teacher recovery on a student's Chromebook profile: the student build at the site root, the teacher
// edition in a sub-folder of the same site (same origin, so it reads and writes the same save).
// Student input only in the student build; the teacher uses the teacher panel. No test hook anywhere.
// Usage: node scripts/phase10/teacher-recovery.mjs <siteUrl> <teacherPath>
import { chromium } from 'playwright';
import fs from 'node:fs';

const site = process.argv[2] ?? 'http://localhost:4182/';
const teacherPath = process.argv[3] ?? 'staff/';
const out = 'scripts/out/phase10/teacher';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const wait = (ms) => page.waitForTimeout(ms);
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('hosl.save') ?? 'null'));
const toTitle = async (url) => {
  await page.goto(url);
  await page.waitForSelector('.title-enter', { timeout: 180000 });
  await wait(3200);
};

// 1. The student starts a game (student build) and walks a little, so there is a save.
await toTitle(site);
check('student build: no test hook', await page.evaluate(() => !('__hosl' in window)));
await page.getByLabel('Skip the arrival').check();
await page.click('.title-enter');
await page.waitForSelector('.location');
await page.keyboard.down('KeyA');
await wait(1200);
await page.keyboard.up('KeyA');
await wait(5500);
const s1 = await save();
check('the student has a save', !!s1?.place, s1 ? `rev ${s1.rev}` : '');

// 2. The teacher opens the teacher edition on the same Chromebook profile.
await toTitle(site + teacherPath);
check('teacher edition: offers Continue (it reads the student’s save)', /continue/i.test(await page.locator('.title-enter').innerText()));
check('teacher edition: title mentions the teacher controls', /teacher/i.test(await page.locator('.title-hint').innerText()));
await page.click('.title-enter');
await page.waitForSelector('.location');
await wait(1200);
await page.keyboard.press('KeyT');
await wait(500);
check('teacher edition: T opens the teacher panel', (await page.locator('.teacher').count()) === 1);
await page.screenshot({ path: `${out}/01-teacher-panel.png` });
check('teacher panel shows the save status', /saved automatically/i.test(await page.locator('.teacher').innerText()));
// Skip a stuck student ahead: up to the Gallery Key.
await page.locator('.grant select').selectOption('galleryKey');
await page.click('.grant button');
await wait(800);
const s2 = await save();
check('skipping ahead is saved to the student’s game', s2?.progress?.keys?.galleryKey === true && s2.progress.completed.gallery === true);
await page.keyboard.press('KeyT');

// 3. Back in the student build: the change is there; still no teacher panel.
await toTitle(site);
check('student build sees the teacher’s change', /2 of 9 rooms complete/.test(await page.locator('.title-progress').innerText()), await page.locator('.title-progress').innerText());
await page.click('.title-enter');
await page.waitForSelector('.location');
await page.keyboard.press('KeyT');
await wait(400);
check('student build: still no teacher panel', (await page.locator('.teacher').count()) === 0);

// 4. Reset (two presses), then undo the reset, from the teacher edition.
await toTitle(site + teacherPath);
await page.click('.title-enter');
await page.waitForSelector('.location');
await wait(800);
await page.keyboard.press('KeyT');
await wait(400);
await page.click('text=Reset all progress');
await page.click('text=Press again: lock everything');
await wait(1200);
const s3 = await save();
check('teacher reset clears the student’s progress', s3 && !Object.values(s3.progress.completed).some(Boolean));
await page.click('text=Undo the last reset');
await page.click('text=Press again: bring it back');
await wait(1200);
const s4 = await save();
check('undo brings the game back', s4?.progress?.completed?.gallery === true);
await page.screenshot({ path: `${out}/02-after-undo.png` });
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
