/**
 * Test hook for the automated browser checks (scripts/*.mjs and the Playwright runs).
 *
 * It exposes the store, lesson content (including answers) and shortcuts that skip progression,
 * so it is loaded only in dev and in the test build (see systems/testBuild.ts). The classroom
 * build never includes this file.
 */
import { CONTENT, useGame } from './state/store';
import * as nav from './lesson/navigation';
import * as THREE from 'three';
import * as director from './lesson/director';
import { evaluateBuild } from './lesson/lessonMachine';
import { doorState } from './lesson/progression';
import { skipCinematic } from './scene/Player';
import { liveCamera, world } from './systems/time';
import { getInteractable } from './systems/interaction';
import { apparitionAt, forceHaunt, hauntDueNow, hauntEvents, hauntLog, hauntState, holdHaunting, setHauntSpeed, settleHouse, triggerStrangeEvent } from './scene/HouseEvents';
import { doorNudge, doorSlam } from './scene/parts/Door';
import { figureFx, showFigure } from './scene/HauntFigure';
import { decorPaintings, hungPaintings } from './scene/parts/Artwork';
import { houseState } from './scene/parts/Lights';
import { renderer } from './systems/renderer';
import { audio } from './systems/audio';
import { mats } from './systems/materials';
import { textureTimes } from './systems/textures';
import * as ldActions from './story/actions';
import * as ldStory from './story/lastDance';
import { ldFx } from './story/fx';

export function installTestHook() {
  (window as unknown as Record<string, unknown>).__hosl = {
    useGame,
    nav,
    director,
    skipCinematic,
    liveCamera,
    getInteractable,
    triggerStrangeEvent,
    forceHaunt,
    holdHaunting,
    showFigure,
    figureFx,
    hauntState,
    hauntEvents,
    hauntLog,
    apparitionAt,
    hauntDueNow,
    setHauntSpeed,
    settleHouse,
    decorPaintings,
    doorNudge,
    doorSlam,
    /** The final mix's loudness right now (dBFS, RMS over ~43 ms), for measuring how audible events are. */
    level: () => {
      const a = audio.tap();
      if (!a) return null;
      const d = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(d);
      let s = 0;
      for (const v of d) s += v * v;
      return 10 * Math.log10(s / d.length + 1e-12);
    },
    hungPaintings,
    /** The Last Dance: its actions, its pure logic and its shared effects. */
    ld: { actions: ldActions, story: ldStory, fx: ldFx },
    audio,
    houseState,
    world,
    mats,
    content: CONTENT,
    evaluateBuild,
    doorState,
    programs: () => renderer.gl?.info.programs?.length ?? -1,
    /** The WebGL renderer, for draw-call and memory measurements. */
    gl: () => renderer.gl,
    scene: () => renderer.scene,
    /** Where an interactable is on screen (CSS pixels), so tests can move the real mouse onto it. */
    screenPos: (id: string) => {
      const it = getInteractable(id);
      const cam = renderer.camera;
      const canvas = renderer.gl?.domElement;
      if (!it || !cam || !canvas) return null;
      const c = new THREE.Box3().setFromObject(it.object).getCenter(new THREE.Vector3()).project(cam);
      const r = canvas.getBoundingClientRect();
      if (c.z > 1) return null;
      return { x: r.left + ((c.x + 1) / 2) * r.width, y: r.top + ((1 - c.y) / 2) * r.height };
    },
    textureTimes: () => [...textureTimes.entries()].map(([k, ms]) => [k, Math.round(ms)] as const).sort((a, b) => b[1] - a[1]),
    /** Lights in the scene by type, with how many are currently switched off (intensity 0). */
    lights: () => {
      const out: Record<string, { n: number; off: number }> = {};
      renderer.scene?.traverse((o) => {
        const l = o as unknown as { isLight?: boolean; type: string; intensity: number };
        if (!l.isLight) return;
        const e = (out[l.type] ??= { n: 0, off: 0 });
        e.n++;
        if (l.intensity === 0) e.off++;
      });
      return out;
    },
  };
  if (new URLSearchParams(location.search).has('haunt')) installHauntPanel();
}

/**
 * Developer panel for the haunting (dev and the test build only, opened with ?haunt in the address):
 * one button per event, forced now (ignoring its cooldown and its wait to be unseen or in view),
 * plus the director's clocks and its recent log. Never in the student or teacher builds.
 */
function installHauntPanel() {
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:60;width:330px;max-height:70vh;overflow:auto;padding:8px 10px;background:rgba(8,8,8,0.88);border:1px solid #6b5a3a;color:#ddd;font:12px/1.35 system-ui,sans-serif';
  const buttons = document.createElement('div');
  const status = document.createElement('pre');
  status.style.cssText = 'margin:6px 0 0;white-space:pre-wrap;font:11px/1.3 ui-monospace,monospace;color:#bba';
  box.innerHTML = '<b style="color:#cfa95f">Haunting (developer)</b> — click a button, then click the game to look again.<br>';
  box.append(buttons, status);
  document.body.append(box);
  const btn = (label: string, title: string, fn: () => unknown) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    b.style.cssText = 'margin:2px;padding:2px 6px;font:12px system-ui;background:#2a241a;color:#eee;border:1px solid #6b5a3a;cursor:pointer';
    b.onclick = (e) => {
      e.stopPropagation();
      const r = fn();
      b.style.borderColor = r === false ? '#a33' : '#5a5';
      window.setTimeout(() => (b.style.borderColor = '#6b5a3a'), 900);
    };
    buttons.append(b);
  };
  for (const e of hauntEvents()) btn(e.id, `${e.tier}; zones: ${e.zones}`, () => forceHaunt(e.id, true));
  btn('settle', 'Put altered paintings back, drop follow-ups', () => settleHouse());
  btn('quiet 10 min', 'Hold all events for 600 s', () => holdHaunting(600));
  window.setInterval(() => {
    const s = hauntState();
    const z = useGame.getState().zone;
    status.textContent =
      `zone ${z}  t ${s.t.toFixed(0)}  still ${s.still.toFixed(0)}  room ${s.roomTime.toFixed(0)}\n` +
      `next: minor ${(s.clocks.minor - s.t).toFixed(0)}s  painting ${(s.clocks.painting - s.t).toFixed(0)}s  apparition ${(s.clocks.apparition - s.t).toFixed(0)}s\n` +
      `altered: ${s.altered.map((a) => `${a.key}${a.noticedAt !== null ? ' (seen)' : ''}`).join(', ') || '-'}\n` +
      s.log
        .slice(-8)
        .map((l) => `${l.t.toFixed(0).padStart(5)} ${l.tier.padEnd(10)} ${l.id}`)
        .join('\n');
  }, 1000);
}
