// Screenshots of the lesson panel, menu and painting viewer at typical Chromebook screen sizes,
// to judge readability. Uses the dev server's test hook only to jump between lesson stages.
// Usage: node scripts/phase10/panel-shots.mjs [devUrl] [sizes] [tag]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5190/';
const sizes = (process.argv[3] ?? '1366x768,1280x720,1536x864').split(',');
const tag = process.argv[4] ?? 'after';
const out = 'scripts/out/phase10/panels';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED, args: ['--ignore-gpu-blocklist'] });

for (const size of sizes) {
  const [W, H] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(base);
  await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
  await page.evaluate(() => {
    const s = window.__hosl.useGame.getState();
    if (s.quality !== 'low') s.setQuality('low');
  });
  await page.getByLabel('Skip the arrival').check();
  await page.click('.title-enter');
  await page.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
  const go = async (fn, wait = 1600) => {
    await page.evaluate(fn);
    await page.waitForTimeout(wait);
  };
  await go(() => window.__hosl.director.openLesson('mirrors'), 2500);
  await go(() => {
    const s = window.__hosl.useGame.getState();
    s.dispatch({ type: 'REVEAL_DESCRIPTION', which: 'A' });
    s.dispatch({ type: 'REVEAL_DESCRIPTION', which: 'B' });
    s.dispatch({ type: 'SHOW_DISCOVER_QUESTIONS' });
  });
  await page.screenshot({ path: `${out}/${tag}-${size}-1-discover.png` });
  await go(() => window.__hosl.useGame.getState().gotoStage('learn'));
  await page.screenshot({ path: `${out}/${tag}-${size}-2-learn.png` });
  await go(() => window.__hosl.useGame.getState().gotoStage('playA'));
  await go(() => {
    const s = window.__hosl.useGame.getState();
    s.dispatch({ type: 'SELECT_OPTION', challenge: 'playA', optionId: s.lessons.mirrors.playA.selected ?? window.__hosl.content.mirrors.playA.options.find((o) => !o.correct).id });
    s.dispatch({ type: 'CHECK_ANSWER', challenge: 'playA' });
  });
  await page.screenshot({ path: `${out}/${tag}-${size}-3-challenge.png` });
  await go(() => window.__hosl.useGame.getState().gotoStage('prove'));
  await go(() => {
    const s = window.__hosl.useGame.getState();
    s.dispatch({ type: 'SET_DRAFT', text: 'The room was as quiet as a held breath.' });
    s.dispatch({ type: 'SUBMIT_RESPONSE' });
  });
  await page.screenshot({ path: `${out}/${tag}-${size}-4-prove.png` });
  await page.evaluate(() => document.querySelector('.panel-body')?.scrollTo(0, 99999));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${tag}-${size}-5-prove-bottom.png` });
  // Later room with a multi-part challenge (the Nursery).
  await go(() => window.__hosl.useGame.getState().progressDispatch({ type: 'GRANT', upTo: 'nurseryOpen' }), 300);
  await go(() => window.__hosl.director.openLesson('nursery'), 2500);
  await go(() => window.__hosl.useGame.getState().gotoStage('playA'));
  await page.screenshot({ path: `${out}/${tag}-${size}-6-items.png` });
  await go(() => window.__hosl.director.closeLesson(), 600);
  await go(() => window.__hosl.useGame.getState().setHelpOpen(true), 500);
  await page.screenshot({ path: `${out}/${tag}-${size}-7-menu.png` });
  await page.close();
  console.log('done', size);
}
await browser.close();
