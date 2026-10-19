// One close-up from a given pose on Low (dev server): node scripts/phase10/closeup.mjs <out.png> x y z yaw pitch [grant]
import { chromium } from 'playwright';
const [outFile, x, y, z, yaw, pitch, grant = 'deskOpen'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
await p.goto(process.env.URL ?? 'http://localhost:5190/');
await p.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await p.evaluate((g) => { const s = window.__hosl.useGame.getState(); s.setQuality('low'); s.setEventLevel('off'); s.progressDispatch({ type: 'GRANT', upTo: g }); }, grant);
await p.getByLabel('Skip the arrival').check();
await p.click('.title-enter');
await p.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await p.addStyleTag({ content: '.free-hint, .location, .corner-buttons, .notice, .keyring { display: none !important; }' });
await p.evaluate((a) => { const s = window.__hosl.useGame.getState(); for (const d of ['mirror','gallery','dining','jib','echoes','press','kitchen','ballroom','study']) s.setDoor(d, true); s.teleportTo({ position: [a[0], a[1], a[2]], yaw: a[3], pitch: a[4] }); }, [x, y, z, yaw, pitch].map(Number));
await p.waitForTimeout(3000);
await p.screenshot({ path: outFile });
await b.close();
