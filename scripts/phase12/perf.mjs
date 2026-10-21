// Low-quality frame rate in the Last Dance's places, against places already in the released game, in a production
// (test) bundle on this computer's GPU (Intel UHD 630, as the school machines). Vsync off, the automatic resolution
// guard off (?testdt), so every place is measured the same way. Also: shader programs compiled after the title
// screen (a mid-game compile is a stutter).
// Usage: node scripts/phase12/perf.mjs <url of a dist-test preview> [WxH = 1366x768] [seconds = 6]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4193/';
const [W, H] = (process.argv[3] ?? '1366x768').split('x').map(Number);
const secs = Number(process.argv[4] ?? 6);
fs.mkdirSync('scripts/out/phase12', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`${base}?testdt`);
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await page.evaluate(() => {
  const s = window.__hosl.useGame.getState();
  s.setQuality('low');
  s.setEventLevel('off');
});
await page.waitForTimeout(4000);
const programsAtTitle = await page.evaluate(() => window.__hosl.programs());
await page.evaluate(() => {
  const h = window.__hosl;
  h.nav.startIntro(true);
  const s = h.useGame.getState();
  s.progressDispatch({ type: 'GRANT', upTo: 'deskOpen' });
  s.progressDispatch({ type: 'COMPLETE_ROOM', room: 'finale' });
  for (const f of ['ldStarted', 'ldJournal', 'ldDoor1', 'ldLedger', 'ldKey', 'ldDoor2', 'ldInRoom']) s.markFound(f);
  s.setDoor('records', true);
  s.setDoor('boudoir', true);
  s.setDoor('gallery', true);
});
await page.waitForTimeout(2500);
await page.evaluate(() => window.__hosl.useGame.getState().setNote(null));

async function measure(name, pose, during) {
  await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), pose);
  await page.waitForTimeout(1500);
  if (during) await page.evaluate(during);
  const r = await page.evaluate(async (secs) => {
    const gl = window.__hosl.gl();
    const times = [];
    let calls = 0;
    let tris = 0;
    let n = 0;
    await new Promise((res) => {
      let last = performance.now();
      const t0 = last;
      const tick = (t) => {
        times.push(t - last);
        last = t;
        calls += gl.info.render.calls;
        tris += gl.info.render.triangles;
        n++;
        if (t - t0 < secs * 1000) requestAnimationFrame(tick);
        else res();
      };
      requestAnimationFrame(tick);
    });
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return { fps: +(1000 / avg).toFixed(1), p95ms: +times[Math.floor(times.length * 0.95)].toFixed(1), calls: Math.round(calls / n), tris: Math.round(tris / n) };
  }, secs);
  console.log(`${name.padEnd(34)} ${String(r.fps).padStart(6)} fps   p95 ${String(r.p95ms).padStart(5)} ms   ${r.calls} calls   ${r.tris} tris`);
  return { name, ...r };
}

const UP = 3.4 + 1.65;
const rows = [];
rows.push(await measure('hall (released game)', { position: [0, 1.65, -1.4], yaw: 0, pitch: 0 }));
rows.push(await measure('portrait gallery (released game)', { position: [-2.6, 1.65, -13.2], yaw: Math.PI / 2, pitch: 0 }));
rows.push(await measure('upper landing, both doors open', { position: [0, UP, -8.2], yaw: 0, pitch: -0.05 }));
rows.push(await measure('Guest Records', { position: [2.6, UP, -10.8], yaw: -0.3, pitch: -0.1 }));
rows.push(await measure('Lady’s room (mirror in view)', { position: [-2.6, UP, -11.0], yaw: 0.05, pitch: -0.05 }));
rows.push(
  await measure('Lady’s mirror, encounter (sharp reflection)', { position: [-3.05, UP, -14.3], yaw: 0, pitch: 0 }, () => {
    const h = window.__hosl;
    h.useGame.getState().setFound('ldScare', false);
    h.ld.actions.lookInMirror();
  }),
);
const programsAfter = await page.evaluate(() => window.__hosl.programs());
console.log(`shader programs: ${programsAtTitle} at the title, ${programsAfter} after the tour`);
fs.writeFileSync('scripts/out/phase12/perf.json', JSON.stringify({ when: new Date().toISOString(), viewport: `${W}x${H}`, rows, programsAtTitle, programsAfter }, null, 2));
await browser.close();
