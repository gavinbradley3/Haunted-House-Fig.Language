// The developer haunting panel (?haunt, dev and test builds only): its buttons force the apparition and
// the empty portrait. Usage: node scripts/phase11/dev-panel.mjs [devUrl]
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:4192/';
const out = 'scripts/out/phase11/dev-panel';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
await p.goto(base + '?haunt');
await p.waitForFunction(() => window.__hosl?.useGame?.getState().phase === 'title', null, { timeout: 180000 });
await p.evaluate(() => window.__hosl.useGame.getState().setQuality('low'));
await p.getByLabel('Skip the arrival').check();
await p.click('.title-enter');
await p.waitForFunction(() => window.__hosl.useGame.getState().phase === 'play');
await p.evaluate(() => window.__hosl.holdHaunting(1e6));
const tp = (pos, yaw, pitch) => p.evaluate(([a, y, pi]) => window.__hosl.useGame.getState().teleportTo({ position: a, yaw: y, pitch: pi }), [pos, yaw, pitch]);
const log = () => p.evaluate(() => window.__hosl.hauntState().log.map((l) => l.id));
let ok = 0;
// The apparition, at the landing, from the hall floor.
await tp([1.5, 1.65, -2.0], 0.1, 0.3);
await p.waitForTimeout(3000);
await p.click('button:text-is("ladyAppears")');
await p.waitForTimeout(1300);
await p.screenshot({ path: `${out}/ladyAppears.png` });
const a = (await log()).includes('ladyAppears');
console.log(`${a ? 'PASS' : 'FAIL'}  panel button "ladyAppears" shows her`);
ok += a;
// The empty portrait, with the fireplace behind the student, then turn to look.
await tp([4, 1.65, -4.1], Math.PI / 2, 0);
await p.waitForTimeout(3000);
await p.click('button:text-is("ladyGone")');
await p.waitForTimeout(500);
const lady = await p.evaluate(() => { const v = window.__hosl.hungPaintings.get('ladyOfHouse').group.getWorldPosition(new (window.__hosl.hungPaintings.get('ladyOfHouse').group.position.constructor)()); return [v.x, v.y, v.z]; });
await tp([lady[0] + (lady[0] > 0 ? -4 : 4), 1.65, lady[2] + 0.5], lady[0] > 0 ? -Math.PI / 2 : Math.PI / 2, 0.35);
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/ladyGone.png` });
const g = (await log()).includes('ladyGone');
console.log(`${g ? 'PASS' : 'FAIL'}  panel button "ladyGone" empties her portrait`);
ok += g;
console.log(`\n${ok}/2 passed`);
await b.close();
