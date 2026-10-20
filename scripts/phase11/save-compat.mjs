// Students' saved games survive the update: a save made by the build students play now (classroom-release-v3)
// is opened by the new build at the same address, in the same browser profile, as a Chromebook will after
// the new version is published.
//  1. The dev server makes a save with real progress (the teacher's "grant" up to the gallery key), which
//     is then loaded into the CURRENT student build; it plays on and saves again (a genuine old-build save).
//  2. The NEW student build is served at the same address: the title must show the same progress and
//     "Continue", Continue must return to the same room, and nothing may be reported damaged.
// Usage: node scripts/phase11/save-compat.mjs <devUrl> <oldBuildDir> <newBuildDir>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [devUrl = 'http://localhost:4191/', oldDir, newDir = 'dist'] = process.argv.slice(2);
if (!oldDir) throw new Error('usage: node scripts/phase11/save-compat.mjs <devUrl> <oldBuildDir> <newBuildDir>');
const PORT = 4196;
const site = `http://localhost:${PORT}/`;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const serve = async (dir) => {
  if (await fetch(site).then(() => true, () => false)) throw new Error(`something is already serving ${site}; stop it first`);
  const want = fs.readFileSync(path.join(dir, 'index.html'), 'utf8').match(/assets\/index-[^"]+\.js/)[0];
  const p = spawn('npx', ['vite', 'preview', '--outDir', dir, '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'pipe' });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const html = await fetch(site).then((r) => r.text(), () => '');
    if (html) {
      // Prove it is this build that answers (not a server left over from an earlier run).
      if (!html.includes(want)) throw new Error(`${site} is not serving ${dir}`);
      console.log(`serving ${dir} (${want})`);
      return p;
    }
  }
  throw new Error('preview did not start');
};
const stop = (p) => new Promise((res) => {
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/T', '/F']).on('exit', () => setTimeout(res, 800));
  else (p.kill(), setTimeout(res, 800));
});

// ---------------------------------------------------------------- 1a. a save with real progress
const b0 = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist'] });
const dev = await b0.newPage({ viewport: { width: 1280, height: 720 } });
await dev.goto(devUrl);
await dev.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await dev.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith('hosl.')) localStorage.removeItem(k);
});
await dev.reload();
await dev.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await dev.getByLabel('Skip the arrival').check();
await dev.click('.title-enter');
await dev.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await dev.evaluate(() => window.__hosl.useGame.getState().progressDispatch({ type: 'GRANT', upTo: 'galleryKey' }));
await dev.evaluate(() => window.__hosl.useGame.getState().teleportTo({ position: [0, 1.65, -13], yaw: 0, pitch: 0 }));
await dev.waitForTimeout(6000);
const seed = await dev.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('hosl.')).map((k) => [k, localStorage.getItem(k)])));
await b0.close();
check('a progressed save was made', !!seed['hosl.save'], `${Object.keys(seed).length} keys`);

// ---------------------------------------------------------------- 1b. the current student build reads it and saves again
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hosl-compat-'));
let server = await serve(oldDir);
let ctx = await chromium.launchPersistentContext(profile, { channel: 'chrome', viewport: { width: 1280, height: 720 }, args: ['--ignore-gpu-blocklist'] });
let page = ctx.pages()[0] ?? (await ctx.newPage());
const errors = [];
const watch = (p) => p.on('pageerror', (e) => errors.push(e.message));
watch(page);
await page.goto(site);
await page.evaluate((s) => {
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
}, seed);
await page.reload();
await page.waitForSelector('.title-enter', { timeout: 180000 });
await page.waitForTimeout(3500);
const oldTitle = await page.locator('.title-progress').innerText().catch(() => '');
check('current build: title shows the progress', /rooms? complete/.test(oldTitle), oldTitle.replace(/\s+/g, ' '));
await page.click('.title-enter');
await page.waitForSelector('.location', { timeout: 30000 });
await page.waitForTimeout(1500);
const oldRoom = (await page.locator('.location').first().innerText()).split('\n')[0];
// Walk a little so the current build writes the save itself.
await page.mouse.move(640, 360);
await page.keyboard.down('KeyW');
await page.waitForTimeout(900);
await page.keyboard.up('KeyW');
await page.waitForTimeout(6000);
const oldSave = await page.evaluate(() => localStorage.getItem('hosl.save'));
check('current build: continues and saves', !!oldSave && JSON.parse(oldSave).v === 2, oldRoom);
const oldKeys = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('hosl.')).map((k) => [k, localStorage.getItem(k)])));
await ctx.close();
await stop(server);

// ---------------------------------------------------------------- 2. the new build, same address, same profile
// With a published site instead of a folder: copy the old build's saved data into that site's storage
// (a different address, so the profile cannot carry it over by itself), then run the same checks there.
const live = /^https?:/.test(newDir);
server = live ? null : await serve(newDir);
ctx = await chromium.launchPersistentContext(profile, { channel: 'chrome', viewport: { width: 1280, height: 720 }, args: ['--ignore-gpu-blocklist'] });
page = ctx.pages()[0] ?? (await ctx.newPage());
watch(page);
await page.goto(live ? newDir : site);
if (live) {
  console.log(`published site ${newDir}`);
  await page.evaluate((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, oldKeys);
  await page.reload();
}
await page.waitForSelector('.title-enter', { timeout: 180000 });
await page.waitForTimeout(3500);
const newTitle = await page.locator('.title-progress').innerText().catch(() => '');
check('new build: the same progress on the title', newTitle === oldTitle, newTitle.replace(/\s+/g, ' '));
check('new build: offers "Continue"', /continue/i.test(await page.locator('.title-enter').innerText()));
await page.click('.title-enter');
await page.waitForSelector('.location', { timeout: 30000 });
await page.waitForTimeout(1500);
const newRoom = (await page.locator('.location').first().innerText()).split('\n')[0];
check('new build: Continue returns to the same room', newRoom === oldRoom, newRoom);
const after = await page.evaluate(() => ({ damaged: localStorage.getItem('hosl.save.damaged'), save: JSON.parse(localStorage.getItem('hosl.save') ?? 'null') }));
check('new build: nothing reported damaged', after.damaged === null);
check('new build: progress unchanged', JSON.stringify(after.save?.progress) === JSON.stringify(JSON.parse(oldSave).progress));
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await ctx.close();
if (server) await stop(server);
fs.rmSync(profile, { recursive: true, force: true });
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
