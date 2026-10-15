// Counts compiled shader programs as the player moves between rooms. A rise
// after the title screen means a mid-game shader compile (a visible stutter).
// Usage: node scripts/compile-probe.mjs [url]   (needs `npm run preview` running)
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173/?testdt=0.5';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => {
  window.__created = 0;
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const orig = C.prototype.createProgram;
    C.prototype.createProgram = function () {
      window.__created++;
      return orig.call(this);
    };
  }
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const act = (fn) => page.evaluate(fn);
const programs = () => act(() => `${window.__hosl.programs()} live / ${window.__created} created`);
const pose = (p) => page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), p);

await page.goto(base);
await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 300000 });
await page.waitForTimeout(25000);
const title = await programs();
await act(() => {
  localStorage.removeItem('hosl.progress');
  window.__hosl.nav.startIntro(true);
});
await page.waitForTimeout(8000);
const rows = [['title screen', title], ['entrance hall', await programs()]];
const stops = [
  ['hall, facing the stairs', { position: [-2, 1.65, -4], yaw: 0.6, pitch: 0 }],
  ['corridor', { position: [0, 1.65, -14], yaw: 0, pitch: 0 }],
  ['hall of mirrors', { position: [0, 1.65, -26], yaw: 0, pitch: 0 }],
];
for (const [name, p] of stops) {
  await pose(p);
  await page.waitForTimeout(8000);
  rows.push([name, await programs()]);
}
await act(() => window.__hosl.useGame.getState().progressDispatch({ type: 'GRANT', upTo: 'galleryOpen' }));
await act(() => window.__hosl.nav.jumpToGallery());
await page.waitForTimeout(10000);
rows.push(['portrait gallery', await programs()]);
await pose({ position: [-8, 1.65, -14], yaw: -Math.PI / 2, pitch: 0 });
await page.waitForTimeout(8000);
rows.push(['gallery, facing the caretaker', await programs()]);
for (const [n, c] of rows) console.log(`${c.padStart(22)}  ${n}`);
const made = (r) => +r.split('/ ')[1].split(' ')[0];
console.log(`programs created after the title screen: ${made(rows[rows.length - 1][1]) - made(title)}`);
if (errors.length) console.log('page errors:', errors);
await browser.close();
