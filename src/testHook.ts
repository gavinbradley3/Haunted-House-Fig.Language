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
import { triggerStrangeEvent } from './scene/HouseEvents';
import { hungPaintings } from './scene/parts/Artwork';
import { houseState } from './scene/parts/Lights';
import { renderer } from './systems/renderer';
import { audio } from './systems/audio';
import { mats } from './systems/materials';
import { textureTimes } from './systems/textures';

export function installTestHook() {
  (window as unknown as Record<string, unknown>).__hosl = {
    useGame,
    nav,
    director,
    skipCinematic,
    liveCamera,
    getInteractable,
    triggerStrangeEvent,
    hungPaintings,
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
}
