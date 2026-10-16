/**
 * The house is quietly alive. Every so often, while the class is exploring
 * (never during a lesson, a cutscene or an inspection), one thing happens:
 * a board creaks elsewhere, a door shuts somewhere, the clock stops, a light
 * stutters, a painting is no longer straight, the lady over the fireplace has
 * turned her head, a draught stirs the curtains.
 *
 * At the "eerie" level (the default) events come more often and some are meant
 * to be noticed: every candle bows in a gust, the lights sink, a mirror fogs as
 * if breathed on. Recorded clips (whispers, a distant giggle, a music box,
 * footsteps upstairs, a sigh) join in once their sound files are added; until
 * then those events never run.
 *
 * Rules: unpredictable spacing, one event at a time, a long cooldown per event,
 * nothing that interrupts teaching, the aim is atmosphere rather than fright,
 * and motion events are skipped for reduced motion.
 */
import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fx } from '../lesson/fx';
import { game, useGame, type EventLevel } from '../state/store';
import { audio } from '../systems/audio';
import { world } from '../systems/time';
import type { Zone } from '../world/layout';
import { hungPaintings } from './parts/Artwork';
import { houseState, lampLevel } from './parts/Lights';
import { mats } from '../systems/materials';

type V3 = [number, number, number];

interface StrangeEvent {
  id: string;
  zones: Zone[];
  cooldown: number;
  motion?: boolean;
  /** Only at the "eerie" level. */
  eerie?: boolean;
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

/** Close behind the player's shoulder, a little to one side. */
function behind(cam: THREE.Camera): V3 {
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  const side = Math.random() < 0.5 ? -1 : 1;
  return [cam.position.x - dir.x * 1.6 - dir.z * side * 0.7, cam.position.y + 0.1, cam.position.z - dir.z * 1.6 + dir.x * side * 0.7];
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
    zones: ['hall', 'corridor', 'mirrors', 'gallery', 'dining', 'nursery', 'echoes', 'press', 'kitchen', 'ballroom', 'study'],
    cooldown: 60,
    run: ({ cam }) => {
      audio.distantCreak(elsewhere(cam));
      return true;
    },
  },
  {
    id: 'door',
    zones: ['hall', 'corridor', 'mirrors', 'gallery', 'dining', 'nursery', 'echoes', 'press', 'kitchen', 'ballroom', 'study'],
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
    id: 'gust',
    zones: ['hall', 'corridor', 'mirrors', 'gallery', 'dining', 'nursery', 'echoes', 'press', 'kitchen', 'ballroom', 'study'],
    cooldown: 110,
    eerie: true,
    run: () => {
      houseState.gust = { start: world.t, until: world.t + 4 };
      houseState.draftUntil = world.t + 5;
      audio.gust();
      return true;
    },
  },
  {
    id: 'dim',
    zones: ['hall', 'corridor', 'mirrors', 'gallery', 'dining', 'nursery', 'echoes', 'press', 'kitchen', 'ballroom', 'study'],
    cooldown: 150,
    eerie: true,
    run: () => {
      houseState.dim = { start: world.t, until: world.t + 6.5 };
      audio.houseGroan();
      return true;
    },
  },
  {
    id: 'mirrorBreath',
    zones: ['mirrors'],
    cooldown: 130,
    eerie: true,
    run: () => {
      const m = Math.random() < 0.5 ? fx.speaking : fx.tunnel;
      m.mistTarget = 0.6;
      window.setTimeout(() => (m.mistTarget = 0), 3200);
      if (!audio.playClip('sigh', { gain: 0.5, reverb: 0.6 })) audio.mist();
      return true;
    },
  },
  // ---- recorded clips: these only happen once the sound files exist
  {
    id: 'whisper',
    zones: ['hall', 'corridor', 'mirrors', 'gallery', 'dining', 'nursery', 'echoes', 'press', 'kitchen', 'ballroom', 'study'],
    cooldown: 170,
    eerie: true,
    run: ({ cam }) => audio.playClip('whisper', { at: behind(cam), gain: 0.45 }),
  },
  {
    id: 'giggle',
    zones: ['hall', 'corridor', 'mirrors', 'gallery', 'dining', 'nursery', 'echoes', 'press', 'kitchen', 'ballroom', 'study'],
    cooldown: 220,
    run: ({ cam }) => audio.playClip('giggle', { at: elsewhere(cam), gain: 1.4 }),
  },
  {
    id: 'musicBox',
    zones: ['hall', 'corridor', 'gallery'],
    cooldown: 260,
    run: ({ cam }) => audio.playClip('music-box', { at: elsewhere(cam), gain: 1.2 }),
  },
  {
    id: 'stepsAbove',
    zones: ['hall', 'corridor'],
    cooldown: 180,
    run: ({ cam }) => audio.playClip('footsteps-above', { at: [cam.position.x + 2, cam.position.y + 3.6, cam.position.z - 1], gain: 1.1 }),
  },
  {
    id: 'sigh',
    zones: ['gallery', 'mirrors'],
    cooldown: 200,
    run: ({ cam }) => audio.playClip('sigh', { at: elsewhere(cam), gain: 1.0 }),
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

/** Seconds before the first event, and the random gap between events, per level. */
const PACE: Record<Exclude<EventLevel, 'off'>, { first: number; gap: [number, number] }> = {
  subtle: { first: 45, gap: [38, 93] },
  eerie: { first: 25, gap: [22, 50] },
};
const level = () => (game().eventLevel === 'subtle' ? 'subtle' : 'eerie');
let timer = PACE.eerie.first;
const nextGap = () => {
  const [a, b] = PACE[level()].gap;
  return a + Math.random() * (b - a);
};

function eligible(zone: Zone) {
  const now = world.t;
  const eerie = level() === 'eerie';
  return EVENTS.filter(
    (e) => e.zones.includes(zone) && now - (lastRun.get(e.id) ?? -1e9) > e.cooldown && !(e.motion && reducedMotion()) && (eerie || !e.eerie),
  );
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

const FLAME_COLOUR = new THREE.Color(5, 3, 1.2);

export function HouseEvents() {
  const { camera } = useThree();
  useEffect(() => {
    camRef = camera;
  }, [camera]);
  useEffect(() => useGame.subscribe((s, p) => {
    if (s.eventLevel !== p.eventLevel && s.eventLevel !== 'off') timer = PACE[s.eventLevel].first;
  }), []);
  useFrame(() => {
    const s = game();
    // The glowing lamp glass and flames follow the lights when an event dims them.
    const m = mats();
    const lamp = lampLevel(world.t);
    m.lampGlass.emissiveIntensity = 1.6 * lamp;
    m.flame.color.copy(FLAME_COLOUR).multiplyScalar(lamp);
    // A lesson starting ends any event still playing out.
    if (s.lessonActive || s.cinematic) {
      if (houseState.gust.until > world.t) houseState.gust.until = world.t;
      if (houseState.dim.until > world.t) houseState.dim.until = world.t;
    }
    if (s.eventLevel === 'off' || s.phase !== 'play' || s.lessonActive || s.cinematic || s.paused || s.inspecting || s.zone === 'exterior') return;
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
