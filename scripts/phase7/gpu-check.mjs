import { chromium } from 'playwright';
for (const headless of [true, false]) {
  const b = await chromium.launch({ channel: 'chrome', headless, args: ['--ignore-gpu-blocklist', '--enable-gpu'] });
  const p = await b.newPage();
  await p.goto('about:blank');
  const r = await p.evaluate(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(d.UNMASKED_RENDERER_WEBGL); });
  console.log('headless', headless, r);
  await b.close();
}
