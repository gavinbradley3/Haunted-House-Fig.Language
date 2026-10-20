/**
 * The haunting director: the house is quietly inhabited, and the one who inhabits it is the Lady in Green
 * (the woman in the portrait above the hall fireplace). Every haunting in the game is decided here.
 *
 * While a student explores (never during a lesson, a challenge, a writing check, a painting, the menu, a
 * cutscene or a notice, and never in the first moments after one closes), three clocks of exploring time run:
 *  - minor (every ~35-65 s): a sound or a small disturbance, chosen by what the student is doing:
 *      walking: footsteps that echo yours; steps in the next room; a door down the corridor drifts open;
 *      standing still and looking around: something shifts behind you; knocks in the wall; her whisper;
 *      lingering in a room: knocks, a door settling, her humming behind the walls, something dragged above;
 *      anywhere, rarely: her soft laugh, far off in the house.
 *    Plus a creak, a distant door, the hall clock stopping, a lamp stuttering, a crooked painting, a
 *    draught, the lights sinking, a mirror fogging.
 *  - painting (every ~2-4 min, when one can change unseen): the Lady's portrait turns to watch the room
 *    after the student has looked at it and turned away; her face appears in the darkness behind the
 *    sitter of another portrait. An altered painting goes back to normal after the student has seen it
 *    and looked away again (or if they open it in the viewer), so it is never certain it happened.
 *  - apparition (no more than every ~6-10 min): she is seen for a moment, far off, in a doorway or at the
 *    landing rail, and is gone; the lamps near her stutter as she goes.
 * Some events are followed by another a few seconds later (her face in a portrait, then her whisper; she
 * vanishes, then laughs). Major events keep apart from each other and from the minor ones.
 *
 * Rules: unpredictable spacing with occasional longer lulls, never the same event twice running (or the
 * same kind three times), long per-event cooldowns, her voice not too often, quiet levels (no stingers,
 * no screams, no flashing), nothing that blocks movement, doors or progress, and nothing saved.
 * Sounds have captions for students playing with the sound off. "Gentle" (the menu) slows every clock and
 * leaves out the startling ones (including the apparition); "Off" stops them.
 *
 * Developers: the test build and `npm run dev` can list and force every event (window.__hosl.haunt, and
 * the panel opened with ?haunt in the address). The student and teacher builds have neither.
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
import { decorPaintings, hungPaintings } from './parts/Artwork';
import { houseState, lampLevel } from './parts/Lights';
import { doorNudge, doorRegistry } from './parts/Door';
import { figureVisible, showFigure } from './HauntFigure';
import { LADY_DOOR_AT, landingFx } from './UpperLanding';
import { mats } from '../systems/materials';
import { HAUNT_IMAGES, hauntImagePresent, hauntTexture, type HauntImage } from '../systems/paintingImages';
import type { DecorId } from '../systems/paintingImages';

type V3 = [number, number, number];
type Kind = 'sound' | 'sight' | 'light';
export type Tier = 'minor' | 'painting' | 'apparition';

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
  /** Which clock it belongs to (default: minor). */
  tier?: Tier;
  /** Zones it can happen in (default: anywhere inside). */
  zones?: Zone[];
  cooldown: number;
  /** Events in the same group (the Lady's voice) keep a shared distance apart. */
  group?: 'voice';
  /** Left out at the Gentle level (the more startling ones). */
  startling?: boolean;
  /** Involves motion (left out when the computer asks for reduced motion). */
  motion?: boolean;
  /** Needs an asset that may not be in the build. */
  available?: () => boolean;
  /** How likely, given what the student is doing (0 = not now). */
  weight: (c: EventCtx) => number;
  /** Make it happen. Return false if it could not happen right now (it does not count as used). */
  run: (c: EventCtx) => boolean;
}

/** Every event that happened (and each altered painting the student noticed), for testing and tuning. */
export const hauntLog: { t: number; /** Seconds of exploring (the director's clock). */ ct: number; id: string; tier: Tier | 'follow' | 'noticed' | 'detail'; zone: Zone; still: number; moving: number; roomTime: number }[] = [];

const lastRun = new Map<string, number>();
const lastGroup = new Map<string, number>();
const recent: string[] = [];
const recentKinds: Kind[] = [];
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const INSIDE: Zone[] = ['hall', 'corridor', 'mirrors', 'gallery', 'dining', 'nursery', 'echoes', 'press', 'kitchen', 'ballroom', 'study'];
/** Seconds the Lady's voice keeps apart (whisper, laugh, sigh, hum). */
const VOICE_GAP = 75;
/** Seconds between two major events (a painting changing, the apparition). */
const MAJOR_GAP = 45;
/** Seconds a minor event keeps clear of a major one, either side (so they never overlap). */
const MINOR_CLEAR = 10;

/** Forcing (developer panel and tests): run an event even where it would wait to be unseen or in view. */
let forcing = false;

function log(id: string, tier: Tier | 'follow' | 'noticed' | 'detail', zone: Zone) {
  hauntLog.push({ t: +world.t.toFixed(1), ct: +ctx.t.toFixed(1), id, tier, zone, still: +ctx.still.toFixed(1), moving: +ctx.moving.toFixed(1), roomTime: Math.round(ctx.roomTime) });
  if (hauntLog.length > 400) hauntLog.splice(0, 100);
}

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

const toP = new THREE.Vector3();
function inView(cam: THREE.Camera, p: THREE.Vector3, deg = 38, far = 18) {
  cam.getWorldDirection(fwd);
  toP.copy(p).sub(cam.position);
  const d = toP.length();
  return d < far && toP.normalize().dot(fwd) > Math.cos((deg * Math.PI) / 180);
}

/** A point in a neighbouring room, beside the student (through a wall), if there is one. */
function nextRoom(cam: THREE.Camera, zone: Zone, dists = [4, 5.5, 7]): V3 | null {
  const sides = Math.random() < 0.5 ? [1, -1] : [-1, 1];
  for (const dist of dists)
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

/** Far off in the house: another room some way away, or the floor above. */
function farOff(cam: THREE.Camera, zone: Zone, upstairs: boolean): V3 {
  return nextRoom(cam, zone, [8, 10, 6.5]) ?? (upstairs ? around(cam, 6, (Math.random() - 0.5) * 6, -2.4) : around(cam, 4, (Math.random() - 0.5) * 6, 3));
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

// ------------------------------------------------------------------ follow-ups

/** Something that happens a few seconds after an event (dropped if a lesson, the menu or a painting opens first). */
const followUps: { at: number; id: string; run: () => void }[] = [];
function followUp(id: string, after: number, run: () => void) {
  followUps.push({ at: ctx.t + after, id, run });
}

/** The Lady laughs, far off. Shared by her own event and the follow-ups. */
function ladyLaughFrom(at: V3, gain = 1) {
  if (!audio.ladyLaugh(at, gain)) return false;
  lastGroup.set('voice', ctx.t);
  showHouseCaption('A woman laughs softly, somewhere far off in the house.');
  return true;
}

// ------------------------------------------------------------------ altered paintings

/** A painting showing something it should not. It goes back once the student has seen it and looked away. */
interface Altered {
  key: string;
  /** The inspectable id the viewer opens for this painting (so opening it puts it right first). */
  viewerId: string;
  object: THREE.Object3D;
  /** How far away it can be noticed from. */
  noticeDist: number;
  since: number;
  seenFor: number;
  noticedAt: number | null;
  revert: () => void;
  onNoticed?: () => void;
}
const altered = new Map<string, Altered>();
const wp = new THREE.Vector3();

function alter(a: Omit<Altered, 'since' | 'seenFor' | 'noticedAt'>) {
  altered.set(a.key, { ...a, since: ctx.t, seenFor: 0, noticedAt: null });
}
function restore(key: string) {
  const a = altered.get(key);
  if (!a) return;
  a.revert();
  altered.delete(key);
}

/** Each frame: has the student looked at an altered painting? Then, once they look away, put it back. */
function watchAltered(cam: THREE.Camera, dt: number) {
  for (const a of altered.values()) {
    a.object.getWorldPosition(wp);
    const looking = inView(cam, wp, 20, a.noticeDist);
    if (looking) a.seenFor += dt;
    if (a.noticedAt === null && a.seenFor > 0.8) {
      a.noticedAt = ctx.t;
      log(`noticed:${a.key}`, 'noticed', game().zone);
      a.onNoticed?.();
    }
    // Seen, then looked away (well away) for a moment: it is as it always was. Unseen for a few minutes: the same.
    const seenLongEnough = a.noticedAt !== null && ctx.t - a.noticedAt > 6;
    const forgotten = ctx.t - a.since > 150;
    if ((seenLongEnough || forgotten) && !inView(cam, wp, 55, 30)) restore(a.key);
  }
}

/** The Lady's portrait: when did the student last look at it properly (in its usual pose)? */
const ladyLook = { seconds: 0, lastSeenAt: -1e9 };
function watchLadyPortrait(cam: THREE.Camera, dt: number) {
  const lady = hungPaintings.get('ladyOfHouse');
  if (!lady || altered.has('ladyWatches') || altered.has('ladyGone')) return;
  lady.group.getWorldPosition(wp);
  if (inView(cam, wp, 30, 14)) {
    ladyLook.seconds += dt;
    if (ladyLook.seconds > 0.8) ladyLook.lastSeenAt = ctx.t;
  } else ladyLook.seconds = 0;
}

/** A decorative portrait that shows the Lady's face behind its sitter for a while. */
function faceInPortrait(key: string, art: DecorId & HauntImage, zone: Zone, noticeDist: number): HauntEvent {
  return {
    id: key,
    kind: 'sight',
    tier: 'painting',
    zones: [zone],
    cooldown: 300,
    available: () => hauntImagePresent(art),
    weight: () => 2,
    run: ({ cam }) => {
      const p = decorPaintings.get(art);
      const tex = hauntTexture(art);
      if (!p || !tex?.userData.loaded) return false;
      p.group.getWorldPosition(wp);
      if (!forcing && (inView(cam, wp, 55, 40) || wp.distanceTo(cam.position) > 16)) return false;
      p.showTexture(tex);
      alter({
        key,
        viewerId: art,
        object: p.group,
        noticeDist,
        revert: () => p.showTexture(null),
        // Sometimes, a moment after she is seen: her whisper, from the painting's side of the room.
        onNoticed: () => {
          if (Math.random() < 0.5 && ctx.t - (lastGroup.get('voice') ?? -1e9) > 30) {
            const at: V3 = [wp.x, wp.y - 0.4, wp.z];
            followUp('whisper:after-face', 1.6 + Math.random() * 1.6, () => {
              audio.whisperAt(at, 0.9);
              lastGroup.set('voice', ctx.t);
              showHouseCaption('A whisper, near the painting. You cannot make out the words.');
            });
          }
        },
      });
      return true;
    },
  };
}

/** Where she can be seen (her feet), and from which zones. Far off only, with a backdrop she shows up against. */
const SPOTS: { name: string; from: V3; to: V3; zones: Zone[]; light: number; when?: () => boolean; upstairs?: boolean }[] = [
  // At the landing rail, in front of its lit painting and candle, seen from the hall floor.
  { name: 'landing-west', from: [-1.2, 3.4, -9.45], to: [-1.9, 3.4, -9.45], zones: ['hall'], light: 0.62 },
  { name: 'landing-east', from: [1.1, 3.4, -9.45], to: [1.8, 3.4, -9.45], zones: ['hall'], light: 0.62 },
  // In the open doorway of the Hall of Mirrors, at the end of the corridor.
  { name: 'mirror-door', from: [0, 0, -18.3], to: [0.9, 0, -18.3], zones: ['hall', 'corridor'], light: 0.5, when: () => !!game().doors.mirror },
  // At the far end of the Hall of Mirrors, by the window.
  { name: 'mirrors-end', from: [0.6, 0, -30.2], to: [1.6, 0, -30.2], zones: ['mirrors'], light: 0.5 },
  // Looking back from the Hall of Mirrors through its open door: at the far end of the corridor, by the hall.
  { name: 'corridor-back', from: [0.2, 0, -10.9], to: [-0.8, 0, -10.9], zones: ['mirrors'], light: 0.55, when: () => !!game().doors.mirror },
  // At the far (west) end of the Portrait Gallery.
  { name: 'gallery-west', from: [-13.7, 0, -14.6], to: [-13.7, 0, -15.6], zones: ['gallery'], light: 0.62 },
  // Looking back up the corridor: by the front door, at the far side of the entrance hall.
  { name: 'hall-front', from: [-0.7, 0, -1.4], to: [-1.6, 0, -1.4], zones: ['corridor'], light: 0.62 },
  // At the giant's end of the dining room, by the window.
  { name: 'dining-east', from: [11.8, 0, -17.2], to: [11.8, 0, -17.9], zones: ['dining'], light: 0.5 },
];

/** Tests: show her now at a named spot (as the apparition would), wherever the student is looking. */
export function apparitionAt(name: string, mode: 'stand' | 'cross' = 'stand') {
  const s = SPOTS.find((x) => x.name === name);
  if (!s || !camRef) return false;
  const all = SPOTS.splice(0, SPOTS.length, s);
  forcing = true;
  try {
    return apparition({ cam: camRef, zone: s.zones[0], upstairs: !!s.upstairs }, mode);
  } finally {
    forcing = false;
    SPOTS.splice(0, SPOTS.length, ...all);
  }
}

// ------------------------------------------------------------------ the events

let crooked: string | null = null;

const EVENTS: HauntEvent[] = [
  // ---------------------------------------------------------------- minor: sounds
  {
    id: 'underDoor',
    kind: 'sight',
    zones: ['hall'],
    cooldown: 90,
    // Upstairs, with the Lady's door in view: something passes on the other side.
    weight: (c) => (c.upstairs ? 6 : 0),
    run: ({ cam, upstairs }) => {
      const p = new THREE.Vector3(...LADY_DOOR_AT);
      if (!upstairs || (!forcing && !inView(cam, p, 40, 9))) return false;
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
      // Three slow knocks; now and then, a while later, one more.
      audio.knocks(at, 3, 0.62);
      if (Math.random() < 0.45) window.setTimeout(() => audio.knocks(at, 1, 0, 0.8), 3200 + Math.random() * 1500);
      showHouseCaption('Three slow knocks, from inside the wall.');
      return true;
    },
  },
  {
    id: 'creak',
    kind: 'sound',
    cooldown: 90,
    // Lower than in Phase 10: the creaks were the house's most noticeable sound, and now have company.
    weight: () => 1,
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
    weight: () => 1.4 + (ctx.roomTime > 50 ? 0.8 : 0),
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
    // Her whisper, just behind one shoulder.
    id: 'whisper',
    kind: 'sound',
    cooldown: 220,
    group: 'voice',
    startling: true,
    weight: () => (ctx.still > 2 ? 2 : 0.8),
    run: ({ cam }) => {
      audio.whisperAt(around(cam, 1.3, Math.random() < 0.5 ? -0.8 : 0.8, -0.1), 1);
      showHouseCaption('Whispering, just behind you. You cannot make out the words.');
      return true;
    },
  },
  {
    // Her whisper on the other side of a wall.
    id: 'whisperWall',
    kind: 'sound',
    cooldown: 200,
    group: 'voice',
    weight: () => 1.6 + (ctx.roomTime > 45 ? 0.8 : 0),
    run: ({ cam, zone }) => {
      const p = nextRoom(cam, zone, [3.2, 4.5]);
      if (!p) return false;
      audio.whisperAt([p[0], p[1] + 1.2, p[2]], 2.2);
      showHouseCaption('Whispering, on the other side of the wall.');
      return true;
    },
  },
  {
    // Her laugh: the Lady's signature. Rare, soft, far away.
    id: 'ladyLaugh',
    kind: 'sound',
    cooldown: 360,
    group: 'voice',
    weight: () => 1.1 + (ctx.roomTime > 60 ? 0.6 : 0),
    run: ({ cam, zone, upstairs }) => ladyLaughFrom(farOff(cam, zone, upstairs), 1.6),
  },
  {
    // A few bars hummed behind the walls, while the student lingers.
    id: 'ladyHum',
    kind: 'sound',
    cooldown: 420,
    group: 'voice',
    weight: () => (ctx.roomTime > 35 ? 1.4 : 0.4),
    run: ({ cam, zone }) => {
      const p = nextRoom(cam, zone, [5, 7, 4]);
      if (!p || !audio.ladyHum(p, 1.6)) return false;
      showHouseCaption('Behind the walls, a woman is humming. It stops.');
      return true;
    },
  },
  {
    id: 'drag',
    kind: 'sound',
    cooldown: 220,
    weight: (c) => (c.upstairs ? 0 : 1.1),
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
  // ---------------------------------------------------------------- minor: disturbances
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
        return !id.startsWith('front') && !d.locked() && !doorNudge.has(id) && dist > 3 && dist < 13 && (forcing || inView(cam, p, 34));
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
    id: 'chairMoved',
    kind: 'sight',
    zones: ['hall'],
    cooldown: 400,
    weight: () => 1.2,
    run: ({ cam }) => {
      const p = new THREE.Vector3(-2.2, 0.5, -9.25);
      if (!forcing && inView(cam, p, 50)) return false;
      houseState.chairMoved = houseState.chairMoved ? 0 : 1;
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
        return (forcing || !inView(cam, w, 40)) && w.distanceTo(cam.position) < 14 && !['caretaker', 'oldManShadow', 'nervousSitter', 'emptyFrame', 'ladyOfHouse'].includes(p.id);
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
    cooldown: 200,
    weight: () => 2,
    run: () => {
      const m = Math.random() < 0.5 ? fx.speaking : fx.tunnel;
      m.mistTarget = 0.6;
      window.setTimeout(() => (m.mistTarget = 0), 3200);
      // Her sigh fogs the glass (the synthesised mist if her voice was heard too recently).
      if (ctx.t - (lastGroup.get('voice') ?? -1e9) > 40 && audio.ladySigh([0, 1.7, -24.9], 1)) lastGroup.set('voice', ctx.t);
      else audio.mist();
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
  // ---------------------------------------------------------------- painting
  {
    // The watching portrait: after the student has looked at her and turned away, she is looking at the room.
    id: 'ladyWatches',
    kind: 'sight',
    tier: 'painting',
    zones: ['hall'],
    cooldown: 240,
    weight: () => (ctx.t - ladyLook.lastSeenAt < 600 ? 4 : 0.5),
    run: ({ cam }) => {
      const lady = hungPaintings.get('ladyOfHouse');
      if (!lady?.swapArt || altered.has('ladyGone')) return false;
      lady.group.getWorldPosition(wp);
      // Only once she has been seen as she should be, and only while she is out of sight.
      if (!forcing && (ctx.t - ladyLook.lastSeenAt > 600 || inView(cam, wp, 55, 40))) return false;
      lady.swapArt('ladyOfHouseTurned');
      alter({
        key: 'ladyWatches',
        viewerId: 'ladyOfHouse',
        object: lady.group,
        noticeDist: 11,
        revert: () => lady.swapArt?.('ladyOfHouse'),
        // Seen: sometimes, a moment later, her soft laugh from somewhere upstairs.
        onNoticed: () => {
          const x = wp.x + (Math.random() - 0.5) * 4;
          if (Math.random() < 0.55 && ctx.t - (lastRun.get('ladyLaugh') ?? -1e9) > 90) followUp('laugh:after-portrait', 2.2 + Math.random() * 2, () => ladyLaughFrom([x, 4.2, -9.6], 1.4));
        },
      });
      return true;
    },
  },
  faceInPortrait('faceBuilder', 'D02', 'hall', 13),
  faceInPortrait('faceMourner', 'D09', 'gallery', 9),
  faceInPortrait('faceHost', 'D12', 'dining', 9),
  faceInPortrait('faceNursery', 'D14', 'nursery', 8),
  {
    // Optional, when its painting is supplied: her portrait is empty but for the chair. Then she is seen.
    id: 'ladyGone',
    kind: 'sight',
    tier: 'painting',
    zones: ['hall'],
    cooldown: 600,
    available: () => hauntImagePresent('ladyGone'),
    weight: () => 1.5,
    run: ({ cam }) => {
      const lady = hungPaintings.get('ladyOfHouse');
      const tex = hauntTexture('ladyGone');
      if (!lady?.showTexture || !tex?.userData.loaded || altered.has('ladyWatches')) return false;
      lady.group.getWorldPosition(wp);
      if (!forcing && inView(cam, wp, 55, 40)) return false;
      lady.showTexture(tex);
      alter({
        key: 'ladyGone',
        viewerId: 'ladyOfHouse',
        object: lady.group,
        noticeDist: 11,
        revert: () => lady.showTexture?.(null),
        // Her frame is empty: she is about the house. The apparition may come early.
        onNoticed: () => {
          if (ctx.t - (lastRun.get('ladyAppears') ?? -1e9) > 240) clocks.apparition = Math.min(clocks.apparition, ctx.t + 25 + Math.random() * 30);
        },
      });
      return true;
    },
  },
  // ---------------------------------------------------------------- apparition
  {
    // She stands, far off, for a couple of seconds; steps out of sight as the lamps near her stutter.
    id: 'ladyAppears',
    kind: 'sight',
    tier: 'apparition',
    cooldown: 360,
    startling: true,
    motion: true,
    available: () => hauntImagePresent('apparition'),
    weight: () => 3,
    run: (c) => apparition(c, 'stand'),
  },
  {
    // She crosses the far end of the landing or the corridor, and is gone.
    id: 'ladyCrosses',
    kind: 'sight',
    tier: 'apparition',
    cooldown: 360,
    startling: true,
    motion: true,
    available: () => hauntImagePresent('apparition'),
    weight: () => 2,
    run: (c) => apparition(c, 'cross'),
  },
];

function apparition({ cam, zone, upstairs }: EventCtx, mode: 'stand' | 'cross') {
  if (!hauntTexture('apparition')?.userData.loaded || figureVisible()) return false;
  for (const s of [...SPOTS].sort(() => Math.random() - 0.5)) {
    if (!s.zones.includes(zone) || !!s.upstairs !== upstairs || (s.when && !s.when())) continue;
    const mid = new THREE.Vector3((s.from[0] + s.to[0]) / 2, s.from[1] + 1.1, (s.from[2] + s.to[2]) / 2);
    const d = mid.distanceTo(cam.position);
    // Standing, she must be in plain view; crossing, she may be caught at the edge of vision.
    if (!forcing && (d < 5.5 || d > 19 || !inView(cam, mid, mode === 'cross' ? 55 : 45, 22))) continue;
    if (mode === 'stand') {
      const dur = 2.6 + Math.random() * 0.8;
      showFigure(s.from, s.to, dur, 0.85, 'stand', s.light);
      // The lamps near her stutter as she goes.
      window.setTimeout(() => (houseState.flicker = { x: s.from[0], z: s.from[2], until: world.t + 1.1 }), (dur - 0.75) * 1000);
      if (Math.random() < 0.6) followUp('laugh:after-apparition', dur + 1.5 + Math.random() * 2, () => ladyLaughFrom([s.to[0], s.to[1] + 1.5, s.to[2] - 1.5], 1.3));
    } else {
      // Across: start a step to one side of the spot and finish a step past the other.
      const dx = s.to[0] - s.from[0];
      const dz = s.to[2] - s.from[2];
      showFigure([s.from[0] - dx, s.from[1], s.from[2] - dz], [s.to[0] + dx, s.to[1], s.to[2] + dz], 1.2 + Math.random() * 0.3, 0.6, 'cross', s.light * 0.9);
    }
    log(`spot:${s.name}`, 'detail', zone);
    return true;
  }
  return false;
}

/** Quiet spells between events, per clock: the first comes after a while, then irregular gaps with occasional longer lulls. */
const PACE: Record<Exclude<EventLevel, 'off'>, Record<Tier, { first: [number, number]; gap: [number, number] }>> = {
  subtle: {
    minor: { first: [70, 95], gap: [80, 150] },
    painting: { first: [200, 280], gap: [240, 420] },
    apparition: { first: [900, 1200], gap: [900, 1200] },
  },
  eerie: {
    minor: { first: [28, 42], gap: [35, 65] },
    painting: { first: [100, 150], gap: [120, 240] },
    // First chance after 8-12 min of exploring; while she cannot be seen it stays due (tried every few seconds).
    apparition: { first: [480, 720], gap: [360, 600] },
  },
};
const level = (): Exclude<EventLevel, 'off'> => (game().eventLevel === 'subtle' ? 'subtle' : 'eerie');
const between = ([a, b]: [number, number]) => a + Math.random() * (b - a);
const firstAt = (tier: Tier) => between(PACE[level()][tier].first);
const nextGap = (tier: Tier) => between(PACE[level()][tier].gap) * (tier === 'minor' && Math.random() < 0.15 ? 1.8 : 1);
/** When each clock next wants something to happen (in exploring seconds). */
const clocks: Record<Tier, number> = { minor: firstAt('minor'), painting: firstAt('painting'), apparition: firstAt('apparition') };
let lastMajor = -1e9;
let lastMinor = -1e9;

const tierOf = (e: HauntEvent): Tier => e.tier ?? 'minor';

function eligible(c: EventCtx, tier?: Tier) {
  const gentle = level() === 'subtle';
  return EVENTS.filter((e) => {
    if (tier && tierOf(e) !== tier) return false;
    if (!(e.zones ?? INSIDE).includes(c.zone)) return false;
    if (e.available && !e.available()) return false;
    if (ctx.t - (lastRun.get(e.id) ?? -1e9) < e.cooldown) return false;
    if (e.group && ctx.t - (lastGroup.get(e.group) ?? -1e9) < VOICE_GAP) return false;
    if (e.motion && reducedMotion()) return false;
    if (gentle && e.startling) return false;
    if (recent[0] === e.id) return false;
    // Never three of the same kind in a row (sound, sound, sound).
    if (recentKinds[0] === e.kind && recentKinds[1] === e.kind) return false;
    // One altered painting at a time.
    if (tierOf(e) === 'painting' && altered.size) return false;
    return true;
  });
}

/** Choose by weight and run; if the choice cannot happen right now, try the next. */
function happen(c: EventCtx, pool: HauntEvent[]): string | null {
  // A weighted draw (not simply the heaviest): what suits the moment is likelier, but anything eligible
  // can come up, so the house does not settle into its two or three favourite tricks.
  const weighted = pool.map((e) => ({ e, w: forcing ? Math.max(1, e.weight(c)) : e.weight(c) })).filter((x) => x.w > 0);
  while (weighted.length) {
    let r = Math.random() * weighted.reduce((sum, x) => sum + x.w, 0);
    let k = 0;
    while (k < weighted.length - 1 && (r -= weighted[k].w) > 0) k++;
    const { e } = weighted.splice(k, 1)[0];
    if (e.run(c)) {
      const tier = tierOf(e);
      lastRun.set(e.id, ctx.t);
      if (e.group) lastGroup.set(e.group, ctx.t);
      if (tier === 'minor') lastMinor = ctx.t;
      else lastMajor = ctx.t;
      recent.unshift(e.id);
      recentKinds.unshift(e.kind);
      recent.length = Math.min(recent.length, 4);
      recentKinds.length = Math.min(recentKinds.length, 4);
      log(e.id, tier, c.zone);
      return e.id;
    }
  }
  return null;
}

let camRef: THREE.Camera | null = null;
/** Have the Lady's recordings been asked to decode? */
let warmed = false;
const evCtx = (): EventCtx | null => (camRef ? { cam: camRef, zone: game().zone, upstairs: game().upstairs } : null);

/** Teacher button and tests: make something happen now (a minor event; respects the zone; ignores the wait). */
export function triggerStrangeEvent() {
  const c = evCtx();
  if (!c) return null;
  clocks.minor = ctx.t + nextGap('minor');
  return happen(c, eligible(c, 'minor')) ?? happen(c, EVENTS.filter((e) => tierOf(e) === 'minor' && (e.zones ?? INSIDE).includes(c.zone)));
}

/**
 * Tests and the developer panel: run one particular event now, if it can happen here.
 * `force` also skips its wait to be unseen (or to be in view), so rare events can be checked on demand.
 */
export function forceHaunt(id: string, force = false) {
  const c = evCtx();
  const e = EVENTS.find((x) => x.id === id);
  if (!c || !e) return false;
  forcing = force;
  try {
    return happen(c, [e]) === id;
  } finally {
    forcing = false;
  }
}

/** Tests: keep the house quiet for a while (it still watches what the student does). */
export function holdHaunting(seconds: number) {
  ctx.quietUntil = ctx.t + seconds;
}

/** Developer panel and tests: every event, with whether it could be chosen here and now. */
export function hauntEvents() {
  const c = evCtx();
  const ok = new Set(c ? eligible(c).map((e) => e.id) : []);
  return EVENTS.map((e) => ({
    id: e.id,
    tier: tierOf(e),
    zones: e.zones ?? 'inside',
    available: e.available ? e.available() : true,
    eligibleNow: ok.has(e.id),
    cooldownLeft: Math.max(0, Math.round(e.cooldown - (ctx.t - (lastRun.get(e.id) ?? -1e9)))),
  }));
}

/** Tests: make every clock (or one) due now, to check what may and may not happen in a situation. */
export function hauntDueNow(tier?: Tier) {
  for (const k of tier ? [tier] : (['minor', 'painting', 'apparition'] as Tier[])) clocks[k] = ctx.t;
  lastMajor = lastMinor = -1e9;
}

/** Tests: run the director's clock faster than real time (a long session in a few minutes). 1 = normal. */
let speed = 1;
export function setHauntSpeed(k: number) {
  speed = Math.max(0.1, k);
}

/** Developer panel and tests: put every altered painting back and stop any follow-up. */
export function settleHouse() {
  for (const k of [...altered.keys()]) restore(k);
  followUps.length = 0;
}

/** Tests and the report: the director's state. */
export const hauntState = () => ({
  ...ctx,
  nextAt: clocks.minor,
  clocks: { ...clocks },
  lastMajor,
  altered: [...altered.values()].map((a) => ({ key: a.key, since: Math.round(a.since), noticedAt: a.noticedAt })),
  followUps: followUps.map((f) => ({ id: f.id, at: Math.round(f.at) })),
  log: hauntLog.slice(-60),
});

const FLAME_COLOUR = new THREE.Color(5, 3, 1.2);

export function HouseEvents() {
  const { camera } = useThree();
  useEffect(() => {
    camRef = camera;
    audio.onStep = onPlayerStep;
    // The haunting's images are small: start loading them now so each is ready long before it is wanted.
    for (const k of Object.keys(HAUNT_IMAGES) as HauntImage[]) if (hauntImagePresent(k)) hauntTexture(k);
    return () => {
      audio.onStep = null;
    };
  }, [camera]);
  useEffect(
    () =>
      useGame.subscribe((s, p) => {
        if (s.eventLevel !== p.eventLevel && s.eventLevel !== 'off') for (const tier of ['minor', 'painting', 'apparition'] as Tier[]) clocks[tier] = Math.max(clocks[tier], ctx.t + firstAt(tier) * 0.6);
        if (s.notice && s.notice !== p.notice) ctx.quietUntil = Math.max(ctx.quietUntil, ctx.t + 7);
        // Opening an altered painting in the viewer: it is put right first, so the viewer and the wall agree.
        if (s.inspecting && s.inspecting !== p.inspecting) for (const a of [...altered.values()]) if (a.viewerId === s.inspecting && a.key !== 'ladyWatches') restore(a.key);
        // A lesson or cutscene starting: every painting is as it should be (the lesson camera may look at any wall).
        if ((s.lessonActive && !p.lessonActive) || (s.cinematic && !p.cinematic)) for (const k of [...altered.keys()]) restore(k);
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
    const dt = world.dt * speed;
    if (busy) {
      // Coming back from a lesson, a painting or the menu, give the student a quiet moment first.
      ctx.quietUntil = Math.max(ctx.quietUntil, ctx.t + 15);
      followUps.length = 0;
      return;
    }
    ctx.t += dt;
    ctx.sinceLook += dt;
    // Her recordings are decoded a little after play begins, quietly, one at a time.
    if (!warmed && ctx.t > 6 && audio.ready) {
      warmed = true;
      void audio.warmHaunting();
    }
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
    const c = evCtx();
    if (!c) return;
    // What the student is looking at (the Lady's portrait; any painting that is not as it should be).
    watchLadyPortrait(c.cam, dt);
    watchAltered(c.cam, dt);
    // Follow-ups due now.
    for (let i = followUps.length - 1; i >= 0; i--) {
      if (ctx.t < followUps[i].at) continue;
      const f = followUps.splice(i, 1)[0];
      f.run();
      log(f.id, 'follow', c.zone);
    }
    // Reading or away from the keyboard (still, and the view has not turned for a while): leave them be.
    const reading = ctx.still > 20 && ctx.sinceLook > 20;
    if (ctx.t < ctx.quietUntil || reading || s.notice) return;
    // The rare clocks first; a major event keeps clear of the last major and minor ones.
    for (const tier of ['apparition', 'painting'] as const) {
      if (ctx.t < clocks[tier] || ctx.t - lastMajor < MAJOR_GAP || ctx.t - lastMinor < MINOR_CLEAR || followUps.length) continue;
      // Nothing can happen here right now: stay due, and look again in a few seconds.
      clocks[tier] = happen(c, eligible(c, tier)) ? ctx.t + nextGap(tier) : ctx.t + 4 + Math.random() * 4;
      return;
    }
    if (ctx.t < clocks.minor || ctx.t - lastMajor < MINOR_CLEAR || followUps.length) return;
    clocks.minor = ctx.t + (happen(c, eligible(c, 'minor')) ? nextGap('minor') : 5);
  });
  return null;
}
