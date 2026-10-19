// Phase 10 checks that need a browser: house captions when muted, the graphics-lost card, the automatic
// resolution guard on a slow computer (CPU throttled), recovering a damaged save, and the student build
// ignoring an old "High" graphics setting.
// Usage: node scripts/phase10/checks.mjs <devUrl> <studentUrl>
import { chromium } from 'playwright';

const dev = process.argv[2] ?? 'http://localhost:5190/';
const student = process.argv[3] ?? 'http://localhost:4176/';
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

async function enter(page, url, { fresh = true, hook = true } = {}) {
  await page.goto(url);
  if (fresh) {
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('hosl.')) localStorage.removeItem(k);
    });
    await page.reload();
  }
  await page.waitForSelector('.title-enter', { timeout: 180000 });
  await page.waitForTimeout(3000);
  if (hook) await page.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
  const skip = page.getByLabel('Skip the arrival');
  if (await skip.count()) await skip.check();
  await page.click('.title-enter');
  await page.waitForSelector('.location', { timeout: 60000 });
  await page.waitForTimeout(1500);
}

// ---------------------------------------------------------------- house captions follow the sound setting
{
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await enter(page, dev);
  await page.evaluate(() => {
    const s = window.__hosl.useGame.getState();
    s.setHouseCaptions('auto');
    window.__hosl.holdHaunting(1e6);
  });
  await page.evaluate(() => window.__hosl.forceHaunt('knocks'));
  await page.waitForTimeout(500);
  check('captions "when sound is off": none while the sound is on', (await page.locator('.house-caption').count()) === 0);
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__hosl.forceHaunt('creak'));
  await page.waitForTimeout(500);
  check('captions "when sound is off": shown once muted', (await page.locator('.house-caption').count()) === 1, await page.locator('.house-caption').innerText().catch(() => ''));

  // The graphics context is lost (as on a Chromebook under memory pressure).
  await page.evaluate(() => window.__hosl.gl().getContext().getExtension('WEBGL_lose_context').loseContext());
  await page.waitForTimeout(800);
  check('a lost graphics context shows the recovery card', /needs a moment/i.test(await page.locator('.recovery').innerText().catch(() => '')));
  await page.close();
}

// ---------------------------------------------------------------- automatic 3D resolution on a slow computer
{
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await enter(page, dev);
  const before = await page.evaluate(() => [window.__hosl.useGame.getState().renderScale, window.__hosl.gl().getPixelRatio()]);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 8 });
  await page.waitForTimeout(16000);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const after = await page.evaluate(() => [window.__hosl.useGame.getState().renderScale, window.__hosl.gl().getPixelRatio()]);
  check('a slow computer lowers the 3D resolution automatically (menus stay sharp: they are HTML)', after[0] < before[0], `scale ${before[0]} → ${after[0]}, pixel ratio ${before[1].toFixed(2)} → ${after[1].toFixed(2)}`);
  await page.close();
}

// ---------------------------------------------------------------- a damaged save, in the browser
{
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await enter(page, dev);
  await page.evaluate(() => window.__hosl.useGame.getState().progressDispatch({ type: 'GRANT', upTo: 'galleryKey' }));
  await page.waitForTimeout(500);
  // Leaving the page saves a good copy (as it should), so damage the save before the game's scripts run on the next load.
  await page.goto('about:blank');
  await page.context().addInitScript(() => {
    if (location.protocol.startsWith('http') && !sessionStorage.getItem('damaged')) {
      sessionStorage.setItem('damaged', '1');
      localStorage.setItem('hosl.save', '{"v":2,"progress":{"comp');
    }
  });
  await page.goto(dev);
  await page.waitForSelector('.title-enter', { timeout: 180000 });
  await page.waitForTimeout(3000);
  const warn = await page.locator('.title-warn').innerText().catch(() => '');
  check('a damaged save: the title says so and offers Continue from the backup', /damaged/i.test(warn) && /continue/i.test(await page.locator('.title-enter').innerText()), warn);
  check('the backup kept the progress', /2 of 9 rooms complete/.test(await page.locator('.title-progress').innerText()));
  check('the damaged copy was set aside, not lost', await page.evaluate(() => localStorage.getItem('hosl.save.damaged') === '{"v":2,"progress":{"comp'));
  await page.close();
}

// ---------------------------------------------------------------- student build ignores an old "High" setting
{
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(student);
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('hosl.')) localStorage.removeItem(k);
    localStorage.setItem('hosl.quality', '0'); // 'high', as an older version could have saved
    localStorage.setItem('hosl.autoQuality', '0');
  });
  await enter(page, student, { fresh: false, hook: false });
  const w = await page.evaluate(() => document.querySelector('canvas').width);
  check('student build: an old "High" setting is ignored (3D drawn at Low’s resolution)', w <= Math.round(1366 * 0.8) + 1, `canvas ${w} px wide for a 1366 px window`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check('student menu has no graphics choices', !/high|balanced|graphics/i.test(await page.locator('.menu').innerText()));
  await page.close();
}

console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
