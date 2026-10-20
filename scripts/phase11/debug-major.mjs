// Debug: why major events (painting, apparition) are not chosen. Stands at the landing view and prints the director's state.
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:4192/';
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
await p.goto(base);
await p.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await p.evaluate(() => { window.__hosl.useGame.getState().setQuality('low'); window.__hosl.useGame.getState().setEventLevel('eerie'); });
await p.getByLabel('Skip the arrival').check();
await p.click('.title-enter');
await p.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await p.evaluate(() => { window.__hosl.setHauntSpeed(10); window.__hosl.useGame.getState().teleportTo({ position: [1.5, 1.65, -2.0], yaw: 0.1, pitch: 0.3 }); });
for (let i = 0; i < 8; i++) {
  await p.mouse.move(683, 384); await p.mouse.down(); await p.mouse.move(690, 384, { steps: 3 }); await p.mouse.move(683, 384, { steps: 3 }); await p.mouse.up();
  await p.waitForTimeout(5000);
  const s = await p.evaluate(() => { const st = window.__hosl.hauntState(); return { t: Math.round(st.t), still: +st.still.toFixed(1), sinceLook: +st.sinceLook.toFixed(1), quiet: Math.round(st.quietUntil), clocks: Object.fromEntries(Object.entries(st.clocks).map(([k, v]) => [k, Math.round(v)])), lastMajor: Math.round(st.lastMajor), fu: st.followUps.length, alt: st.altered.map((a) => a.key), ev: window.__hosl.hauntEvents().filter((e) => e.tier !== 'minor').map((e) => `${e.id}:${e.eligibleNow ? 'E' : '-'}${e.cooldownLeft}`).join(' '), log: st.log.slice(-3).map((l) => l.id).join(',') }; });
  console.log(JSON.stringify(s));
}
await b.close();
