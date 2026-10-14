import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(process.argv[2] ?? 'http://localhost:5173/');
await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 180000 });
const measure = () => page.evaluate(() => new Promise((res) => { const t0 = performance.now(); let n = 0; const f = () => { n++; if (n < 4) requestAnimationFrame(f); else res((performance.now() - t0) / 4); }; requestAnimationFrame(f); }));
console.log('title frame ms', await measure());
await page.evaluate(() => window.__hosl.nav.startIntro(true));
await page.waitForTimeout(3000);
console.log('hall frame ms', await measure());
await page.evaluate(() => { const s = window.__hosl.useGame.getState(); s.setDoor('mirror', true); s.teleportTo({ position: [0, 1.65, -21], yaw: 0, pitch: 0 }); });
await page.waitForTimeout(3000);
console.log('mirrors frame ms', await measure());
const info = await page.evaluate(() => { const c = document.querySelector('canvas'); const gl = c.getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(d.UNMASKED_RENDERER_WEBGL); });
console.log(info);
await browser.close();
