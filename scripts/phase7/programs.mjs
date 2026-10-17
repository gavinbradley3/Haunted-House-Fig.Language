// Phase 7: which shader programs do the pilots add? Diffs three.js program cache keys between
// preview/hall.html?pilot=0 and ?pilot=1 after the same walk through the entrance hall.
import { chromium } from 'playwright';

async function programs(pilot) {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:5180/preview/hall.html?pilot=${pilot}`);
  await page.waitForFunction(() => window.__hosl?.useGame.getState().phase === 'title', null, { timeout: 240000 });
  await page.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.__hosl.nav.startIntro(true));
  await page.waitForFunction(() => !window.__pilot || window.__pilot.pilot === false || window.__pilot.ready, null, { timeout: 120000 });
  for (const p of [
    { position: [0, 1.65, -1.2], yaw: 0, pitch: 0 },
    { position: [-3.0, 1.65, -7.3], yaw: 0, pitch: -0.12 },
    { position: [3.4, 1.65, -8.6], yaw: -Math.PI / 2, pitch: 0 },
  ]) {
    await page.evaluate((p) => window.__hosl.useGame.getState().teleportTo(p), p);
    await page.waitForTimeout(1500);
  }
  const list = await page.evaluate(() =>
    window.__hosl.gl().info.programs.map((p) => {
      const k = p.cacheKey;
      // summarise the parts of the key that distinguish variants
      const flags = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'vertexColors', 'envMap', 'shadowMapEnabled', 'toneMapping', 'outputColorSpace', 'numPointLights', 'numSpotLights']
        .map((f) => (k.includes(f) ? f : null))
        .filter(Boolean);
      return { name: p.name, key: k };
    }),
  );
  await browser.close();
  return list;
}

const base = await programs(0);
const pilot = await programs(1);
const baseKeys = new Set(base.map((p) => p.key));
const extra = pilot.filter((p) => !baseKeys.has(p.key));
console.log(`baseline ${base.length} programs, pilot ${pilot.length}, new ${extra.length}`);
// Group the new programs by shader name, and show how one new key differs from its nearest baseline key
const by = {};
for (const p of extra) by[p.name] = (by[p.name] ?? 0) + 1;
console.log(by);
for (const p of extra.slice(0, 40)) {
  const parts = p.key.split(',');
  let best = null;
  let bestDiff = 1e9;
  for (const b of base) {
    const bp = b.key.split(',');
    const d = parts.reduce((n, v, i) => n + (v !== bp[i] ? 1 : 0), 0);
    if (d < bestDiff) {
      bestDiff = d;
      best = bp;
    }
  }
  const diffs = best ? parts.map((v, i) => (v !== best[i] ? `${i}:${best[i]}->${v}` : null)).filter(Boolean) : ['(no baseline program of this type)'];
  console.log(p.name, diffs.slice(0, 12).join("  "));
}
