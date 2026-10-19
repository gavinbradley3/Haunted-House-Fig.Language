/**
 * The haunting director: the house is quietly inhabited.
 *
 * While a student explores (never during a lesson, a painting, the menu, a cutscene or a notice,
 * and never in the first moments after one closes), the director waits through a quiet spell, then
 * chooses ONE thing to happen, based on what the student is doing:
 *  - walking: footsteps that echo yours a beat late and stop a moment after you do; steps in the
 *    next room; a door down the corridor that has drifted open;
 *  - standing still and looking around: something shifts behind you; knocks from inside the wall;
 *    a whisper that might be the wind;
 *  - lingering in a room: knocks, a door settling, furniture dragged across the floor above;
 *  - looking up at the landing or down the corridor: a shape crosses, far away, and is gone.
 * Plus the older events: a creak, a distant door, the hall clock stopping, a lamp stuttering, a
 * crooked painting, the Lady turning her head, a draught, the lights sinking, a mirror fogging.
 *
 * Rules: unpredictable spacing with longer lulls, never the same event twice running (or the same
 * kind three times), long per-event cooldowns, quiet levels (no stingers, no screams), nothing that
 * blocks movement or progress. Sounds have captions for students playing with the sound off.
 * "Gentle" (the menu) halves the rate and leaves out the startling ones; "Off" stops them.
 */
import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fx } from '../lesson/fx';
import { game, livePlace, useGame, type EventLevel } from '../state/store';
import { audio } from '../systems/audio';
import { showHouseCaption } from '../systems/soundCues';
import { world } from '../systems/time';
import { zoneAt, type Zone } from '../world/layout';
import { hungPaintings } from './parts/Artwork';
import { houseState, lampLevel } from './parts/Lights';
import { doorNudge, doorRegistry } from './parts/Door';
import { showFigure } from './HauntFigure';
import { LADY_DOOR_AT, landingFx } from './UpperLanding';
import { mats } from '../systems/materials';

type V3 = [number, number, number];
type Kind = 'sound' | 'sight' | 'light';

/** What the student has been doing, updated every frame. */
const ctx = {
  /** Seconds of free exploring (the director's clock). */
  t: 0,
  /** Seconds standing still / walking without a break. */
  still: 0,
  moving: 0,
  /** Seconds in the current zone. */
  roomTime: 0,
  zone: 'exterior' as Zone,
  /** Seconds since the mouse or trackpad last turned the view. */
  sinceLook: 0,
  /** No events before this time (after a lesson, a painting, a notice, the menu). */
  quietUntil: 0,
  lastX: NaN,
  lastZ: NaN,
  lastYaw: NaN,
};

interface EventCtx {
  cam: THREE.Camera;
  zone: Zone;
  upstairs: boolean;
}

interface HauntEvent {
  id: string;
  kind: Kind;
  /** Zones it can happen in (default: anywhere inside). */
  zones?: Zone[];
  cooldown: number;
  /** Left out at the Gentle level (the more startling ones). */
  startling?: boolean;
  /** Involves motion (left out when the computer asks for reduced motion). */
  motion?: boolean;
  /** How likely, given what the student is doing (0 = not now). */
  weight: (c: EventCtx) => number;
  /** Make it happen. Return false if it could not happen right now (it does not count as used). */
  run: (c: EventCtx) => boolean;
}

/** Every event that happened, for testing and tuning. */
export const hauntLog: { t: number; id: string; zone: Zone; still: number; moving: number; roomTime: number }[] = [];

const lastRun = new Map<string, number>();
const recent: string[] = [];
const recentKinds: Kind[] = [];
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const INSIDE: Zone[] = ['hall', 'corridor', 'mirrors', 'gallery', 'dining', 'nursery', 'echoes', 'press', 'kitchen', 'ballroom', 'study'];

// ------------------------------------------------------------------ where things happen

const fwd = new THREE.Vector3();
function forward(cam: THREE.Camera) {
  cam.getWorldDirection(fwd);
  fwd.y = 0;
  return fwd.normalize();
}

/** A point relative to the camera: `back` metres behind, `side` to the right (negative: left), `up` above eye level. */
function around(cam: THREE.Camera, back: number, side: number, up = 0): V3 {
  const f = forward(cam);
  return [cam.position.x - f.x * back - f.z * side, cam.position.y + up, cam.position.z - f.z * back + f.x * side];
}

function inView(cam: THREE.Camera, p: THREE.Vector3, deg = 38, far = 18) {
  cam.getWorldDirection(fwd);
  const to = p.clone().sub(cam.position);
  const d = to.length();
  return d < far && to.normalize().dot(fwd) > Math.cos((deg * Math.PI) / 180);
}

/** A point in a neighbouring room, beside the student (through a wall), if there is one. */
function nextRoom(cam: THREE.Camera, zone: Zone): V3 | null {
  const sides = Math.random() < 0.5 ? [1, -1] : [-1, 1];
  for (const dist of [4, 5.5, 7])
    for (const s of sides) {
      const p = around(cam, (Math.random() - 0.5) * 2, s * dist, -1.4);
      const z = zoneAt(p[2], p[0]);
      if (z !== zone && z !== 'exterior') return p;
    }
  return null;
}

/** Somewhere audible but out of sight. */
function elsewhere(cam: THREE.Camera, zone: Zone): V3 {
  return nextRoom(cam, zone) ?? around(cam, 3, 0, 2.6);
}

// ------------------------------------------------------------------ the echoing footsteps

/** While armed, each of the student's steps is answered a beat later from behind; when they stop, one more step. */
const echo = { left: 0, lastStepAt: 0, pending: 0 };
function onPlayerStep() {
  if (echo.left <= 0 || !camRef) return;
  echo.left--;
  echo.lastStepAt = world.t;
  const at = around(camRef, 3.2, (Math.random() - 0.5) * 0.6, -1.5);
  window.setTimeout(() => audio.otherStep(at, 0.75), 260 + Math.random() * 60);
  if (echo.left === 0) echo.pending = world.t + 0.75;
}

// ------------------------------------------------------------------ the events

let crooked: string | null = null;
let ladyTurned = false;

const EVENTS: HauntEvent[] = [
  {
    id: 'underDoor',
    kind: 'sight',
    zones: ['hall'],
    cooldown: 90,
    // Upstairs, with the Lady's door in view: something passes on the other side.
    weight: (c) => (c.upstairs ? 6 : 0),
    run: ({ cam, upstairs }) => {
      const p = new THREE.Vector3(...LADY_DOOR_AT);
      if (!upstairs || !inView(cam, p, 40, 9)) return false;
      landingFx.shadowStart = world.t;
      for (let i = 0; i < 3; i++) window.setTimeout(() => audio.otherStep([LADY_DOOR_AT[0] - 0.6 + i * 0.6, LADY_DOOR_AT[1], LADY_DOOR_AT[2] - 1.2], 1.3), i * 520);
      showHouseCaption('Soft steps pass behind the Lady’s door.');
      return true;
    },
  },
  {
    id: 'stepsAbove',
    kind: 'sound',
    cooldown: 150,
    weight: (c) => (c.upstairs ? 0 : 2.6 + (ctx.roomTime > 40 ? 1 : 0)),
    run: ({ cam }) => {
      const at = around(cam, -1.5, 2, 2.6);
      // Measured in Phase 10: at its normal level this sat only 0-3 dB over a room's ambience, easy to miss.
      if (!audio.footstepsAbove(at, 2)) {
        for (let i = 0; i < 6; i++) window.setTimeout(() => audio.otherStep([at[0] - i * 0.5, at[1], at[2]], 0.6, true), i * 620);
      }
      showHouseCaption('Slow footsteps cross the floor above you.');
      return true;
    },
  },
  {
    id: 'stepsNextRoom',
    kind: 'sound',
    cooldown: 140,
    weight: () => 2.4 + (ctx.roomTime > 40 ? 1.2 : 0),
    run: ({ cam, zone }) => {
      const p = nextRoom(cam, zone);
      if (!p) return false;
      const f = forward(cam);
      const n = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) window.setTimeout(() => audio.otherStep([p[0] + f.x * (i - n / 2) * 0.55, p[1], p[2] + f.z * (i - n / 2) * 0.55], 1.7), i * (540 + Math.random() * 60));
      showHouseCaption('Footsteps in the next room. Then nothing.');
      return true;
    },
  },
  {
    id: 'knocks',
    kind: 'sound',
    cooldown: 160,
    weight: () => 1.8 + (ctx.still > 3 ? 2 : 0) + (ctx.roomTime > 60 ? 1 : 0),
    run: ({ cam }) => {
      const at = around(cam, 0.6, Math.random() < 0.5 ? -2.4 : 2.4, -0.3);
      audio.knocks(at, 3);
      if (Math.random() < 0.45) window.setTimeout(() => audio.knocks(at, 1, 0, 0.8), 3200 + Math.random() * 1500);
      showHouseCaption('Three slow knocks, from inside the wall.');
      return true;
    },
  },
  {
    id: 'creak',
    kind: 'sound',
    cooldown: 70,
    weight: () => 1.6,
    run: ({ cam, zone }) => {
      audio.distantCreak(Math.random() < 0.5 ? around(cam, 2.5, (Math.random() - 0.5) * 3, -1.5) : elsewhere(cam, zone));
      showHouseCaption('A floorboard creaks, somewhere close.');
      return true;
    },
  },
  {
    id: 'doorSettles',
    kind: 'sound',
    cooldown: 120,
    weight: () => 1.6 + (ctx.roomTime > 50 ? 0.8 : 0),
    run: ({ cam, zone }) => {
      audio.distantDoor(elsewhere(cam, zone), 1.7);
      showHouseCaption('Somewhere in the house, a door closes.');
      return true;
    },
  },
  {
    id: 'behind',
    kind: 'sound',
    cooldown: 240,
    startling: true,
    // Standing still and looking around (not reading: the view has turned in the last few seconds).
    weight: () => (ctx.still > 4 && ctx.sinceLook < 6 ? 4 : 0),
    run: ({ cam }) => {
      const at = around(cam, 1.4, (Math.random() - 0.5) * 0.8, -1.5);
      audio.otherStep(at, 1.1);
      window.setTimeout(() => audio.creak(at), 350);
      window.setTimeout(() => audio.creak(at), 380);
      showHouseCaption('Something shifts behind you.');
      return true;
    },
  },
  {
    id: 'whisper',
    kind: 'sound',
    cooldown: 260,
    startling: true,
    weight: () => (ctx.still > 2 ? 1.4 : 0.6),
    run: ({ cam }) => {
      audio.whisperAt(around(cam, 1.6, Math.random() < 0.5 ? -0.7 : 0.7, 0), 1.8);
      showHouseCaption('A faint whisper. Or the wind.');
      return true;
    },
  },
  {
    id: 'drag',
    kind: 'sound',
    cooldown: 220,
    weight: (c) => (c.upstairs ? 0 : 1.2),
    run: ({ cam }) => {
      audio.dragAbove(around(cam, -2, 1.5, 2.6));
      showHouseCaption('Something heavy is dragged across the floor upstairs.');
      return true;
    },
  },
  {
    id: 'echo',
    kind: 'sound',
    cooldown: 260,
    startling: true,
    weight: () => (ctx.moving > 2.5 && game().footstepsOn ? 3.2 : 0),
    run: () => {
      echo.left = 4 + Math.floor(Math.random() * 3);
      echo.pending = 0;
      return true;
    },
  },
  {
    id: 'doorDrifts',
    kind: 'sight',
    cooldown: 150,
    motion: true,
    weight: () => 2.6,
    run: ({ cam }) => {
      // A door the student can see, a few metres away, that is not locked: it drifts.
      const list = [...doorRegistry.entries()].filter(([id, d]) => {
        const p = d.hinge.clone().setY(1.2);
        const dist = p.distanceTo(cam.position);
        return !id.startsWith('front') && !d.locked() && !doorNudge.has(id) && dist > 3 && dist < 13 && inView(cam, p, 34);
      });
      if (!list.length) return false;
      const [id, d] = list[Math.floor(Math.random() * list.length)];
      doorNudge.set(id, d.open() ? 0.32 : 0.2);
      audio.creak([d.hinge.x, 1.2, d.hinge.z]);
      // Left alone, it eases back a while later.
      window.setTimeout(() => doorNudge.delete(id), 30000);
      return true;
    },
  },
  {
    id: 'figure',
    kind: 'sight',
    cooldown: 300,
    startling: true,
    motion: true,
    weight: () => 3,
    run: ({ cam, zone, upstairs }) => {
      // Far away only, across the landing or the end of the corridor, and only if that spot is in view.
      const spots: { from: V3; to: V3; zones: Zone[] }[] = [
        // Across the landing, in front of its lit painting and candle (against bare wallpaper it cannot be seen).
        { from: [-1.7, 3.4, -9.45], to: [1.5, 3.4, -9.45], zones: ['hall'] },
        { from: [1.7, 3.4, -9.45], to: [-1.5, 3.4, -9.45], zones: ['hall'] },
        { from: [-0.9, 0, -17.9], to: [0.9, 0, -17.9], zones: ['hall', 'corridor'] },
      ];
      if (upstairs) return false;
      for (const s of spots.sort(() => Math.random() - 0.5)) {
        if (!s.zones.includes(zone)) continue;
        const mid = new THREE.Vector3((s.from[0] + s.to[0]) / 2, s.from[1] + 1, (s.from[2] + s.to[2]) / 2);
        const d = mid.distanceTo(cam.position);
        if (d < 6 || d > 16 || !inView(cam, mid, 30)) continue;
        // The corridor end is behind the mirror door: only if it is open.
        if (s.from[2] < -17 && !game().doors.mirror) continue;
        showFigure(s.from, s.to, 0.8 + Math.random() * 0.3, 0.58);
        return true;
      }
      return false;
    },
  },
  {
    id: 'chairMoved',
    kind: 'sight',
    zones: ['hall'],
    cooldown: 400,
    weight: () => 1.2,
    run: ({ cam }) => {
      const p = new THREE.Vector3(-2.2, 0.5, -9.25);
      if (inView(cam, p, 50)) return false;
      houseState.chairMoved = houseState.chairMoved ? 0 : 1;
      return true;
    },
  },
  {
    id: 'clock',
    kind: 'sound',
    zones: ['hall', 'corridor'],
    cooldown: 180,
    weight: () => 1,
    run: () => {
      houseState.clockStopped = true;
      audio.hallClockStopped = true;
      window.setTimeout(() => {
        houseState.clockStopped = false;
        audio.hallClockStopped = false;
      }, 4500 + Math.random() * 2500);
      showHouseCaption('The hall clock stops ticking. Then starts again.');
      return true;
    },
  },
  {
    id: 'flicker',
    kind: 'light',
    zones: ['hall', 'corridor', 'gallery'],
    cooldown: 90,
    weight: () => 1.2,
    run: ({ cam }) => {
      houseState.flicker = { x: cam.position.x, z: cam.position.z, until: world.t + 1.6 };
      return true;
    },
  },
  {
    id: 'crooked',
    kind: 'sight',
    zones: ['hall', 'corridor', 'gallery'],
    cooldown: 120,
    motion: true,
    weight: () => 1.2,
    run: ({ cam }) => {
      const candidates = [...hungPaintings.values()].filter((p) => {
        const w = new THREE.Vector3();
        p.group.getWorldPosition(w);
        return !inView(cam, w, 40) && w.distanceTo(cam.position) < 14 && !['caretaker', 'oldManShadow', 'nervousSitter', 'emptyFrame'].includes(p.id);
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
    kind: 'sight',
    zones: ['hall'],
    cooldown: 200,
    motion: true,
    weight: () => 1.4,
    run: ({ cam }) => {
      const lady = hungPaintings.get('ladyOfHouse');
      if (!lady?.swapArt) return false;
      const w = new THREE.Vector3();
      lady.group.getWorldPosition(w);
      if (inView(cam, w, 40)) return false;
      ladyTurned = !ladyTurned;
      lady.swapArt(ladyTurned ? 'ladyOfHouseTurned' : 'ladyOfHouse');
      return true;
    },
  },
  {
    id: 'gust',
    kind: 'light',
    cooldown: 110,
    weight: () => 1,
    run: () => {
      houseState.gust = { start: world.t, until: world.t + 4 };
      houseState.draftUntil = world.t + 5;
      audio.gust();
      showHouseCaption('A cold draught. Every flame bows.');
      return true;
    },
  },
  {
    id: 'dim',
    kind: 'light',
    cooldown: 150,
    startling: true,
    weight: () => 1,
    run: () => {
      houseState.dim = { start: world.t, until: world.t + 6.5 };
      audio.houseGroan();
      showHouseCaption('The timbers of the house groan.');
      return true;
    },
  },
  {
    id: 'mirrorBreath',
    kind: 'sight',
    zones: ['mirrors'],
    cooldown: 130,
    weight: () => 2,
    run: () => {
      const m = Math.random() < 0.5 ? fx.speaking : fx.tunnel;
      m.mistTarget = 0.6;
      window.setTimeout(() => (m.mistTarget = 0), 3200);
      if (!audio.playClip('sigh', { gain: 0.5, reverb: 0.6 })) audio.mist();
      return true;
    },
  },
  {
    id: 'draft',
    kind: 'sight',
    zones: ['mirrors'],
    cooldown: 100,
    motion: true,
    weight: () => 1,
    run: () => {
      houseState.draftUntil = world.t + 4.5;
      audio.distantCreak([0, 3, -30.6]);
      return true;
    },
  },
];

/** Quiet spells between events: the first comes after a while, then irregular gaps with occasional longer lulls. */
const PACE: Record<Exclude<EventLevel, 'off'>, { first: [number, number]; gap: [number, number] }> = {
  subtle: { first: [70, 95], gap: [80, 150] },
  eerie: { first: [28, 42], gap: [34, 68] },
};
const level = (): Exclude<EventLevel, 'off'> => (game().eventLevel === 'subtle' ? 'subtle' : 'eerie');
const between = ([a, b]: [number, number]) => a + Math.random() * (b - a);
let nextAt = between(PACE.eerie.first);
const nextGap = () => between(PACE[level()].gap) * (Math.random() < 0.15 ? 1.8 : 1);

function eligible(c: EventCtx) {
  const gentle = level() === 'subtle';
  return EVENTS.filter((e) => {
    if (!(e.zones ?? INSIDE).includes(c.zone)) return false;
    if (ctx.t - (lastRun.get(e.id) ?? -1e9) < e.cooldown) return false;
    if (e.motion && reducedMotion()) return false;
    if (gentle && e.startling) return false;
    if (recent[0] === e.id) return false;
    // Never three of the same kind in a row (sound, sound, sound).
    if (recentKinds[0] === e.kind && recentKinds[1] === e.kind) return false;
    return true;
  });
}

/** Choose by weight and run; if the choice cannot happen right now, try the next. */
function happen(c: EventCtx, pool = eligible(c)): string | null {
  const weighted = pool.map((e) => ({ e, w: e.weight(c) * (0.6 + Math.random() * 0.8) })).filter((x) => x.w > 0);
  weighted.sort((a, b) => b.w - a.w);
  for (const { e } of weighted) {
    if (e.run(c)) {
      lastRun.set(e.id, ctx.t);
      recent.unshift(e.id);
      recentKinds.unshift(e.kind);
      recent.length = Math.min(recent.length, 4);
      recentKinds.length = Math.min(recentKinds.length, 4);
      hauntLog.push({ t: +world.t.toFixed(1), id: e.id, zone: c.zone, still: +ctx.still.toFixed(1), moving: +ctx.moving.toFixed(1), roomTime: Math.round(ctx.roomTime) });
      return e.id;
    }
  }
  return null;
}

let camRef: THREE.Camera | null = null;
const evCtx = (): EventCtx | null => (camRef ? { cam: camRef, zone: game().zone, upstairs: game().upstairs } : null);

/** Teacher button and tests: make something happen now (respects the zone; ignores the wait). */
export function triggerStrangeEvent() {
  const c = evCtx();
  if (!c) return null;
  nextAt = ctx.t + nextGap();
  return happen(c) ?? happen(c, EVENTS.filter((e) => (e.zones ?? INSIDE).includes(c.zone)));
}

/** Tests: run one particular event now, if it can happen here. */
export function forceHaunt(id: string) {
  const c = evCtx();
  const e = EVENTS.find((x) => x.id === id);
  if (!c || !e) return false;
  return happen(c, [e]) === id;
}

/** Tests: keep the house quiet for a while (it still watches what the student does). */
export function holdHaunting(seconds: number) {
  ctx.quietUntil = ctx.t + seconds;
}

/** Tests and the report: the director's state. */
export const hauntState = () => ({ ...ctx, nextAt, log: hauntLog.slice(-50) });

const FLAME_COLOUR = new THREE.Color(5, 3, 1.2);

export function HouseEvents() {
  const { camera } = useThree();
  useEffect(() => {
    camRef = camera;
    audio.onStep = onPlayerStep;
    return () => {
      audio.onStep = null;
    };
  }, [camera]);
  useEffect(
    () =>
      useGame.subscribe((s, p) => {
        if (s.eventLevel !== p.eventLevel && s.eventLevel !== 'off') nextAt = ctx.t + between(PACE[s.eventLevel].first) * 0.6;
        if (s.notice && s.notice !== p.notice) ctx.quietUntil = Math.max(ctx.quietUntil, ctx.t + 7);
      }),
    [],
  );
  useEffect(() => {
    const look = (e: MouseEvent) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) ctx.sinceLook = 0;
    };
    window.addEventListener('mousemove', look);
    return () => window.removeEventListener('mousemove', look);
  }, []);
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
      echo.left = 0;
      echo.pending = 0;
    }
    // The extra footstep after the student stops walking.
    if (echo.pending && world.t > echo.pending) {
      echo.pending = 0;
      if (camRef) {
        audio.otherStep(around(camRef, 3, 0, -1.5), 0.65);
        showHouseCaption('Footsteps behind you stop, a moment after yours.');
      }
    }
    const busy = s.phase !== 'play' || s.lessonActive || !!s.cinematic || s.paused || !!s.inspecting || !!s.note || s.helpOpen || s.endingOpen || s.fading || s.zone === 'exterior' || s.eventLevel === 'off';
    const dt = world.dt;
    if (busy) {
      // Coming back from a lesson, a painting or the menu, give the student a quiet moment first.
      ctx.quietUntil = Math.max(ctx.quietUntil, ctx.t + 15);
      return;
    }
    ctx.t += dt;
    ctx.sinceLook += dt;
    // Walking or standing still?
    if (livePlace.valid) {
      const v = Number.isFinite(ctx.lastX) ? Math.hypot(livePlace.x - ctx.lastX, livePlace.z - ctx.lastZ) / Math.max(dt, 1e-3) : 0;
      if (Number.isFinite(ctx.lastYaw) && Math.abs(livePlace.yaw - ctx.lastYaw) > 0.002) ctx.sinceLook = 0;
      ctx.lastX = livePlace.x;
      ctx.lastZ = livePlace.z;
      ctx.lastYaw = livePlace.yaw;
      if (v > 0.4) {
        ctx.moving += dt;
        ctx.still = 0;
      } else {
        ctx.still += dt;
        if (ctx.still > 0.6) ctx.moving = 0;
      }
    }
    if (s.zone !== ctx.zone) {
      ctx.zone = s.zone;
      ctx.roomTime = 0;
    }
    ctx.roomTime += dt;
    // Reading or away from the keyboard (still, and the view has not turned for a while): leave them be.
    const reading = ctx.still > 20 && ctx.sinceLook > 20;
    if (ctx.t < nextAt || ctx.t < ctx.quietUntil || reading || s.notice) return;
    const c = evCtx();
    if (!c) return;
    nextAt = ctx.t + (happen(c) ? nextGap() : 5);
  });
  return null;
}
