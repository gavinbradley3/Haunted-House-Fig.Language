/**
 * The house is quietly alive. Every so often, while the class is exploring
 * (never during a lesson, a cutscene or an inspection), one small thing happens:
 * a board creaks elsewhere, a door shuts somewhere, the clock stops, a light
 * stutters, a painting is no longer straight, the lady over the fireplace has
 * turned her head, a draught stirs the curtains.
 *
 * Rules: unpredictable spacing, one event at a time, a long cooldown per event,
 * nothing that interrupts teaching, and motion events skipped for reduced motion.
 */
import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { game } from '../state/store';
import { audio } from '../systems/audio';
import { world } from '../systems/time';
import type { Zone } from '../world/layout';
import { hungPaintings } from './parts/Artwork';
import { houseState } from './parts/Lights';

type V3 = [number, number, number];

interface StrangeEvent {
  id: string;
  zones: Zone[];
  cooldown: number;
  motion?: boolean;
  /** Return false if the event could not happen right now (it will not count as used). */
  run: (ctx: { cam: THREE.Camera; zone: Zone }) => boolean;
}

const lastRun = new Map<string, number>();
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Somewhere audible but out of sight: a few rooms away from the camera. */
function elsewhere(cam: THREE.Camera): V3 {
  const spots: V3[] = [
    [-4.5, 3.6, -8.8], // landing
    [4.5, 0.2, -2],
    [0, 0.2, -16],
    [-8, 0.2, -14],
    [3, 0.2, -29],
    [-5.5, 3.6, -9.5],
  ];
  const far = spots.filter((p) => Math.hypot(p[0] - cam.position.x, p[2] - cam.position.z) > 7);
  return far[Math.floor(Math.random() * far.length)] ?? spots[0];
}

function inView(cam: THREE.Camera, p: THREE.Vector3) {
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  const to = p.clone().sub(cam.position);
  const dist = to.length();
  return to.normalize().dot(dir) > Math.cos((40 * Math.PI) / 180) && dist < 18;
}

let crooked: string | null = null;
let ladyTurned = false;

const EVENTS: StrangeEvent[] = [
  {
    id: 'creak',
    zones: ['hall', 'corridor', 'mirrors', 'gallery'],
    cooldown: 60,
    run: ({ cam }) => {
      audio.distantCreak(elsewhere(cam));
      return true;
    },
  },
  {
    id: 'door',
    zones: ['hall', 'corridor', 'mirrors', 'gallery'],
    cooldown: 150,
    run: ({ cam }) => {
      audio.distantDoor(elsewhere(cam));
      return true;
    },
  },
  {
    id: 'clock',
    zones: ['hall', 'corridor'],
    cooldown: 180,
    run: () => {
      houseState.clockStopped = true;
      audio.hallClockStopped = true;
      const hold = 4500 + Math.random() * 2500;
      window.setTimeout(() => {
        houseState.clockStopped = false;
        audio.hallClockStopped = false;
      }, hold);
      return true;
    },
  },
  {
    id: 'flicker',
    zones: ['hall', 'corridor', 'gallery'],
    cooldown: 90,
    run: ({ cam }) => {
      houseState.flicker = { x: cam.position.x, z: cam.position.z, until: world.t + 1.6 };
      return true;
    },
  },
  {
    id: 'crooked',
    zones: ['hall', 'corridor', 'gallery'],
    cooldown: 120,
    motion: true,
    run: ({ cam }) => {
      // Straighten the last one (unseen), then tilt a painting nobody is looking at.
      const candidates = [...hungPaintings.values()].filter((p) => {
        const w = new THREE.Vector3();
        p.group.getWorldPosition(w);
        return !inView(cam, w) && w.distanceTo(cam.position) < 14 && !['caretaker', 'oldManShadow', 'nervousSitter', 'emptyFrame'].includes(p.id);
      });
      if (!candidates.length) return false;
      if (crooked) {
        const prev = hungPaintings.get(crooked);
        if (prev) prev.tilt = 0;
      }
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      pick.tilt = (Math.random() < 0.5 ? -1 : 1) * (0.045 + Math.random() * 0.03);
      crooked = pick.id;
      return true;
    },
  },
  {
    id: 'lady',
    zones: ['hall'],
    cooldown: 200,
    motion: true,
    run: ({ cam }) => {
      const lady = hungPaintings.get('ladyOfHouse');
      if (!lady?.swapArt) return false;
      const w = new THREE.Vector3();
      lady.group.getWorldPosition(w);
      if (inView(cam, w)) return false;
      ladyTurned = !ladyTurned;
      lady.swapArt(ladyTurned ? 'ladyOfHouseTurned' : 'ladyOfHouse');
      return true;
    },
  },
  {
    id: 'draft',
    zones: ['mirrors'],
    cooldown: 100,
    motion: true,
    run: () => {
      houseState.draftUntil = world.t + 4.5;
      audio.distantCreak([0, 3, -30.6]);
      return true;
    },
  },
];

let timer = 45;
const nextGap = () => 38 + Math.random() * 55;

function eligible(zone: Zone) {
  const now = world.t;
  return EVENTS.filter((e) => e.zones.includes(zone) && now - (lastRun.get(e.id) ?? -1e9) > e.cooldown && !(e.motion && reducedMotion()));
}

let camRef: THREE.Camera | null = null;

/** Teacher button: make one event happen now (still respects zone and cooldown where possible). */
export function triggerStrangeEvent() {
  const s = game();
  if (!camRef) return;
  const pool = eligible(s.zone);
  const list = pool.length ? pool : EVENTS.filter((e) => e.zones.includes(s.zone));
  for (const e of [...list].sort(() => Math.random() - 0.5)) {
    if (e.run({ cam: camRef, zone: s.zone })) {
      lastRun.set(e.id, world.t);
      timer = nextGap();
      return;
    }
  }
}

export function HouseEvents() {
  const { camera } = useThree();
  useEffect(() => {
    camRef = camera;
  }, [camera]);
  useFrame(() => {
    const s = game();
    if (!s.eventsOn || s.phase !== 'play' || s.lessonActive || s.cinematic || s.paused || s.inspecting || s.zone === 'exterior') return;
    timer -= world.dt;
    if (timer > 0) return;
    timer = nextGap();
    const pool = eligible(s.zone);
    for (const e of pool.sort(() => Math.random() - 0.5)) {
      if (e.run({ cam: camera, zone: s.zone })) {
        lastRun.set(e.id, world.t);
        return;
      }
    }
  });
  return null;
}
