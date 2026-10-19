import { create } from 'zustand';
import {
  initialLessonState,
  lessonReducer,
  type LessonAction,
  type LessonState,
  type Stage,
} from '../lesson/lessonMachine';
import type { Pose, ShotName, Zone } from '../world/layout';
import type { LessonContent, RoomId } from '../content/types';
import { SIMILE } from '../content/simile';
import { METAPHOR } from '../content/metaphor';
import { HYPERBOLE } from '../content/hyperbole';
import { PERSONIFICATION } from '../content/personification';
import { FINALE } from '../content/finale';
import { ONOMATOPOEIA } from '../content/onomatopoeia';
import { ALLITERATION } from '../content/alliteration';
import { IDIOM } from '../content/idiom';
import { OXYMORON } from '../content/oxymoron';
import { ALLUSION } from '../content/allusion';
import { DEVICE_ROOMS } from '../content/types';
import { progressReducer, KEY_FOR_ROOM, type Progress, type ProgressAction } from '../lesson/progression';
import { DEV_GRAPHICS } from '../systems/testBuild';
import { hasProgress, Saver, type GameSave, type LoadStatus, type Place } from './save';

export const CONTENT: Record<RoomId, LessonContent> = {
  mirrors: SIMILE,
  gallery: METAPHOR,
  dining: HYPERBOLE,
  nursery: PERSONIFICATION,
  echoes: ONOMATOPOEIA,
  press: ALLITERATION,
  kitchen: IDIOM,
  ballroom: OXYMORON,
  study: ALLUSION,
  finale: FINALE,
};

const freshLessons = (): Record<RoomId, LessonState> => ({
  mirrors: initialLessonState(SIMILE),
  gallery: initialLessonState(METAPHOR),
  dining: initialLessonState(HYPERBOLE),
  nursery: initialLessonState(PERSONIFICATION),
  echoes: initialLessonState(ONOMATOPOEIA),
  press: initialLessonState(ALLITERATION),
  kitchen: initialLessonState(IDIOM),
  ballroom: initialLessonState(OXYMORON),
  study: initialLessonState(ALLUSION),
  finale: initialLessonState(FINALE),
});

/** The device rooms the student has not completed yet (the ending waits for all of them). */
export const unfinishedRooms = (p: Progress) => DEVICE_ROOMS.filter((r) => !p.completed[r]);
export type { RoomId };

export type Phase = 'loading' | 'title' | 'intro' | 'play';
/** `jib` is the hidden door to the Nursery; `desk` is the lid of the Lady's writing box. */
export type DoorId = 'front' | 'mirror' | 'jib' | 'gallery' | 'dining' | 'desk' | 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study' | 'landing';
export type Quality = 'high' | 'balanced' | 'low';
/** Captions for the house's own noises (creaks, knocks, steps): when the sound is off, always, or never. */
export type HouseCaptions = 'auto' | 'on' | 'off';
/** Whether progress is being saved on this Chromebook, and if not, why. */
export type SaveStatus = 'ok' | 'unavailable' | 'newer' | 'conflict' | 'failed';

export type Vec3 = [number, number, number];

export interface Cinematic {
  id: string;
  /** Camera positions along the path (Catmull-Rom). */
  points: Vec3[];
  /** Look-at targets, interpolated along the path. */
  targets: Vec3[];
  duration: number;
  /** Called once when the move finishes or is skipped. */
  onDone?: () => void;
  /** Optional events fired when progress t (0..1) passes a threshold. */
  events?: { t: number; run: () => void }[];
}

/** Something written to read close up (the page from the Lady's diary). */
export interface Note {
  kicker: string;
  title: string;
  body: string[];
  /** A small optional question underneath. */
  ask?: string;
}

interface Notice {
  text: string;
  sub?: string;
  at: number;
}

export interface GameState {
  phase: Phase;
  zone: Zone;
  /** True while the player is on the stairs' upper half or the landing. */
  upstairs: boolean;

  // Settings
  volume: number;
  muted: boolean;
  quality: Quality;
  /** True while the game may lower quality by itself if the frame rate is poor. */
  autoQuality: boolean;
  /** Fraction of the preset's resolution the 3D view draws at (lowered automatically on slow computers). */
  renderScale: number;
  /** Mouse and trackpad look speed, as a multiple of the default. */
  lookSpeed: number;
  houseCaptions: HouseCaptions;

  // UI
  teacherOpen: boolean;
  /** The student menu (controls, sound, settings, help). */
  helpOpen: boolean;
  paused: boolean;
  pointerLocked: boolean;
  notice: Notice | null;
  /** The 3D view stopped working (the graphics context was lost): show the recovery card. */
  graphicsLost: boolean;

  // Saving
  saveStatus: SaveStatus;
  /** How the save was found when the game started. */
  loadStatus: LoadStatus;
  /** Was there a saved game to continue when the page opened? */
  canContinue: boolean;
  /** Where the student was standing when they last left. */
  savedPlace: Place | null;
  lastSaved: number | null;

  // World
  hover: { id: string; label: string } | null;
  doors: Record<DoorId, boolean>;
  cinematic: Cinematic | null;
  /** Bumped to force the player to a pose (teleport). */
  teleport: { pose: Pose; n: number } | null;
  /** Fixed camera shot used during the lesson; null means free first-person. */
  shot: ShotName | null;
  /** Painting being inspected (camera framed on it, caption shown). */
  inspecting: string | null;
  /** A page being read (it covers the view until closed). */
  note: Note | null;
  /** Custom camera framing that overrides `shot` (used for painting inspection). */
  shotPose: { position: Vec3; target: Vec3 } | null;
  lessonActive: boolean;
  /** Incremented to replay the current stage's intro animation. */
  replayTick: number;
  mirrorsVisited: boolean;
  /** Black fade used when jumping between places. */
  fading: boolean;
  /** Camera shot override during the completion sequence. */
  completionShot: ShotName | null;
  /** The end card after the final lesson. */
  endingOpen: boolean;

  /** One lesson per room; `room` is the one the lesson panel shows. */
  lessons: Record<RoomId, LessonState>;
  room: RoomId;
  progress: Progress;
  /** The sentence that passed each room's writing check (shown on the end card). */
  writing: Partial<Record<RoomId, string>>;
  /** Optional discoveries (the upstairs landing). */
  found: Record<string, boolean>;
  /** How often and how plainly the house does strange things while the student explores. */
  eventLevel: EventLevel;
  musicOn: boolean;
  footstepsOn: boolean;

  // Actions
  setPhase: (p: Phase) => void;
  setZone: (z: Zone) => void;
  setUpstairs: (v: boolean) => void;
  setVolume: (v: number) => void;
  setQuality: (q: Quality, auto?: boolean) => void;
  setRenderScale: (v: number) => void;
  setLookSpeed: (v: number) => void;
  setHouseCaptions: (v: HouseCaptions) => void;
  toggleMute: () => void;
  setTeacherOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  setPointerLocked: (v: boolean) => void;
  showNotice: (text: string, sub?: string) => void;
  clearNotice: () => void;
  setGraphicsLost: (v: boolean) => void;
  setHover: (h: GameState['hover']) => void;
  setDoor: (id: DoorId, open: boolean) => void;
  playCinematic: (c: Cinematic) => void;
  endCinematic: () => void;
  teleportTo: (pose: Pose) => void;
  setShot: (s: ShotName | null) => void;
  setLessonActive: (v: boolean) => void;
  replay: () => void;
  markMirrorsVisited: () => void;
  setFading: (v: boolean) => void;
  setCompletionShot: (s: ShotName | null) => void;
  setEndingOpen: (v: boolean) => void;
  dispatch: (a: LessonAction) => void;
  gotoStage: (s: Stage) => void;
  setRoom: (r: RoomId) => void;
  progressDispatch: (a: ProgressAction) => void;
  markFound: (id: string) => void;
  setInspecting: (id: string | null, pose?: GameState['shotPose']) => void;
  setNote: (n: Note | null) => void;
  setEventLevel: (v: EventLevel) => void;
  setMusicOn: (v: boolean) => void;
  setFootstepsOn: (v: boolean) => void;
}

export const EVENT_LEVELS = ['off', 'subtle', 'eerie'] as const;
export type EventLevel = (typeof EVENT_LEVELS)[number];

const storage = (() => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
})();

const loadNumber = (k: string, d: number) => {
  try {
    const v = storage?.getItem(k);
    return v === null || v === undefined ? d : Number(v);
  } catch {
    return d;
  }
};
/** Has a graphics quality been chosen on this computer before (development builds only)? */
export const hasSavedQuality = () => !DEV_GRAPHICS || loadNumber('hosl.quality', -1) >= 0;
const save = (k: string, v: string) => {
  try {
    storage?.setItem(k, v);
  } catch {
    /* storage unavailable: settings simply won't persist */
  }
};
const clamp = (v: number, a: number, b: number, d: number) => (Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d);

// The student's saved game, read once before anything renders.
export const saver = new Saver(storage, CONTENT);
const loaded = saver.load();
if (loaded.status === 'recovered') console.warn('[save] the saved game was damaged; carried on from the backup');

/**
 * Students always play on Low: Balanced and High exist only in development and test builds, and a
 * quality saved by an older version of the game is ignored.
 */
const startQuality: Quality = DEV_GRAPHICS ? ((['high', 'balanced', 'low'] as const)[loadNumber('hosl.quality', 0)] ?? 'high') : 'low';

export const useGame = create<GameState>()((set, get) => ({
  phase: 'loading',
  zone: 'exterior',
  upstairs: false,
  volume: clamp(loadNumber('hosl.volume', 0.7), 0, 1, 0.7),
  muted: loadNumber('hosl.muted', 0) === 1,
  quality: startQuality,
  autoQuality: DEV_GRAPHICS ? loadNumber('hosl.autoQuality', 1) === 1 : true,
  renderScale: clamp(loadNumber('hosl.renderScale', 1), 0.6, 1, 1),
  lookSpeed: clamp(loadNumber('hosl.lookSpeed', 1), 0.4, 2.5, 1),
  houseCaptions: (['auto', 'on', 'off'] as const)[loadNumber('hosl.houseCaptions', 0)] ?? 'auto',
  teacherOpen: false,
  helpOpen: false,
  paused: false,
  pointerLocked: false,
  notice: null,
  graphicsLost: false,
  saveStatus: loaded.status === 'unavailable' ? 'unavailable' : loaded.status === 'newer' ? 'newer' : 'ok',
  loadStatus: loaded.status,
  canContinue: hasProgress(loaded.save),
  savedPlace: loaded.save.place,
  lastSaved: loaded.savedAt,
  hover: null,
  doors: { front: false, mirror: false, jib: false, gallery: false, dining: false, desk: false, echoes: false, press: false, kitchen: false, ballroom: false, study: false, landing: false },
  cinematic: null,
  teleport: null,
  shot: null,
  inspecting: null,
  note: null,
  shotPose: null,
  lessonActive: false,
  replayTick: 0,
  mirrorsVisited: false,
  fading: false,
  completionShot: null,
  endingOpen: false,
  lessons: loaded.save.lessons,
  room: 'mirrors',
  progress: loaded.save.progress,
  writing: loaded.save.writing,
  found: loaded.save.found,
  eventLevel: EVENT_LEVELS[loadNumber('hosl.eventLevel', 2)] ?? 'eerie',
  musicOn: loadNumber('hosl.music', 1) === 1,
  footstepsOn: loadNumber('hosl.footsteps', 1) === 1,

  setPhase: (phase) => set({ phase }),
  setZone: (zone) => set({ zone }),
  setUpstairs: (upstairs) => set({ upstairs }),
  setQuality: (quality, auto = false) => {
    if (!DEV_GRAPHICS) return;
    save('hosl.quality', String(['high', 'balanced', 'low'].indexOf(quality)));
    save('hosl.autoQuality', auto ? '1' : '0');
    set({ quality, autoQuality: auto });
  },
  setRenderScale: (renderScale) => {
    save('hosl.renderScale', String(renderScale));
    set({ renderScale });
  },
  setLookSpeed: (lookSpeed) => {
    save('hosl.lookSpeed', String(lookSpeed));
    set({ lookSpeed });
  },
  setHouseCaptions: (houseCaptions) => {
    save('hosl.houseCaptions', String(['auto', 'on', 'off'].indexOf(houseCaptions)));
    set({ houseCaptions });
  },
  setVolume: (volume) => {
    save('hosl.volume', String(volume));
    set({ volume });
  },
  toggleMute: () => {
    const muted = !get().muted;
    save('hosl.muted', muted ? '1' : '0');
    set({ muted });
  },
  setTeacherOpen: (teacherOpen) => set({ teacherOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setPaused: (paused) => set({ paused }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  showNotice: (text, sub) => set({ notice: { text, sub, at: performance.now() } }),
  clearNotice: () => set({ notice: null }),
  setGraphicsLost: (graphicsLost) => set({ graphicsLost }),
  setHover: (hover) => {
    const cur = get().hover;
    if (cur?.id === hover?.id && cur?.label === hover?.label) return;
    set({ hover });
  },
  setDoor: (id, open) => set({ doors: { ...get().doors, [id]: open } }),
  playCinematic: (cinematic) => set({ cinematic }),
  endCinematic: () => set({ cinematic: null }),
  teleportTo: (pose) => set({ teleport: { pose, n: (get().teleport?.n ?? 0) + 1 } }),
  setShot: (shot) => set({ shot }),
  setLessonActive: (lessonActive) => {
    if (lessonActive === get().lessonActive) return;
    set({ lessonActive });
    persistSoon();
  },
  replay: () => set({ replayTick: get().replayTick + 1 }),
  markMirrorsVisited: () => set({ mirrorsVisited: true }),
  setFading: (fading) => set({ fading }),
  setCompletionShot: (completionShot) => set({ completionShot }),
  setEndingOpen: (endingOpen) => set({ endingOpen }),
  dispatch: (a) => {
    const { lessons, room, progress } = get();
    const before = lessons[room];
    // The ending waits for every device room, however the final lesson was opened.
    const ending = room === 'finale' && (a.type === 'COMPLETE' || (a.type === 'GOTO_STAGE' && a.stage === 'complete'));
    const left = unfinishedRooms(progress);
    if (ending && left.length) {
      get().showNotice('The letter will not end yet.', `Still to complete: ${left.map((r) => CONTENT[r].room.replace(/^The /, '')).join(', ')}.`);
      return;
    }
    const after = lessonReducer(before, a, CONTENT[room]);
    if (after === before) return;
    const finished = after.completed && !before.completed;
    const nextLessons = { ...lessons, [room]: after };
    const patch: Partial<GameState> = { lessons: nextLessons };
    // Keep the sentence that passed the writing check, even if the lesson is replayed later.
    const passed = after.prove.responses[after.prove.responses.length - 1];
    if (finished && passed) patch.writing = { ...get().writing, [room]: passed };
    set(patch);
    // Typing is saved a moment later (one save per pause, not per key); everything else at once.
    if (a.type === 'SET_DRAFT') persistSoon();
    else persistNow(finished);
    // Finishing a lesson completes its room (and puts that room's key within reach).
    if (finished && !progress.completed[room]) get().progressDispatch({ type: 'COMPLETE_ROOM', room });
  },
  gotoStage: (stage) => get().dispatch({ type: 'GOTO_STAGE', stage }),
  setRoom: (room) => set({ room }),
  progressDispatch: (a) => {
    const before = get().progress;
    const progress = progressReducer(before, a);
    if (progress === before && a.type !== 'RESET_PROGRESS') return;
    const patch: Partial<GameState> = { progress };
    if (a.type === 'RESET_PROGRESS') {
      saver.clear();
      patch.lessons = freshLessons();
      patch.writing = {};
      patch.found = {};
      patch.savedPlace = null;
      patch.doors = { ...get().doors, gallery: false, jib: false, dining: false, desk: false, echoes: false, press: false, kitchen: false, ballroom: false, study: false, landing: false };
      patch.completionShot = null;
      patch.endingOpen = false;
    }
    set(patch);
    // Milestones (a room, a key, a door) also refresh the backup copy.
    persistNow(true);
  },
  markFound: (id) => {
    if (get().found[id]) return;
    set({ found: { ...get().found, [id]: true } });
    persistNow(true);
  },
  setInspecting: (inspecting, pose = null) => set({ inspecting, shotPose: pose }),
  setNote: (note) => {
    if (note && document.pointerLockElement) document.exitPointerLock();
    set({ note });
  },
  setEventLevel: (eventLevel) => {
    save('hosl.eventLevel', String(EVENT_LEVELS.indexOf(eventLevel)));
    set({ eventLevel });
  },
  setMusicOn: (musicOn) => {
    save('hosl.music', musicOn ? '1' : '0');
    set({ musicOn });
  },
  setFootstepsOn: (footstepsOn) => {
    save('hosl.footsteps', footstepsOn ? '1' : '0');
    set({ footstepsOn });
  },
}));

// ------------------------------------------------------------------ saving

/**
 * Where the player is standing, updated every frame by the Player without re-rendering anything.
 * `valid` is false until the student is walking around inside the house.
 */
export const livePlace = { x: 0, z: 0, yaw: 0, upstairs: false, valid: false };
let lastPlace = { x: NaN, z: NaN, yaw: NaN };

function snapshot(): GameSave {
  const s = useGame.getState();
  const place: Place | null = livePlace.valid
    ? { x: livePlace.x, z: livePlace.z, yaw: livePlace.yaw, upstairs: livePlace.upstairs, lesson: s.lessonActive ? s.room : null }
    : s.savedPlace;
  return { progress: s.progress, lessons: s.lessons, place, writing: s.writing, found: s.found };
}

let soon: number | null = null;

/** Save everything now. */
export function persistNow(backup = false) {
  if (soon !== null) {
    clearTimeout(soon);
    soon = null;
  }
  // Nothing is written until the student has actually entered the house (or made progress):
  // opening the title screen must never replace an existing save.
  const s = useGame.getState();
  if (s.phase === 'loading' || s.phase === 'title') return;
  const data = snapshot();
  const r = saver.write(data, backup);
  if (r === 'ok') {
    lastPlace = { x: livePlace.x, z: livePlace.z, yaw: livePlace.yaw };
    useGame.setState({ lastSaved: Date.now(), savedPlace: data.place, ...(s.saveStatus === 'failed' ? { saveStatus: 'ok' } : {}) });
  } else if (r === 'conflict') useGame.setState({ saveStatus: 'conflict' });
  else if (r === 'failed') useGame.setState({ saveStatus: 'failed' });
}

/** Save shortly (typing, walking): one write per pause rather than one per key or step. */
export function persistSoon() {
  if (soon !== null) return;
  soon = window.setTimeout(() => {
    soon = null;
    persistNow();
  }, 400);
}

/** Has the player moved or turned enough since the last save to be worth saving their place? */
export function placeChanged() {
  return livePlace.valid && (Math.hypot(livePlace.x - lastPlace.x, livePlace.z - lastPlace.z) > 0.6 || !(Math.abs(livePlace.yaw - lastPlace.yaw) < 0.5));
}

if (typeof window !== 'undefined') {
  // Leaving the page (closing the tab, signing out, the lid shutting): save straight away.
  const flush = () => {
    if (useGame.getState().phase === 'play') persistNow();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  // While walking around, save the student's place every few seconds if they have moved.
  window.setInterval(() => {
    const s = useGame.getState();
    if (s.phase === 'play' && !s.cinematic && !s.fading && placeChanged()) persistSoon();
  }, 4000);
  // Another tab of the same game saved: stop saving here so neither overwrites the other.
  window.addEventListener('storage', (e) => {
    if (e.key === 'hosl.save.rev' && saver.othersSaved() && useGame.getState().phase !== 'loading') {
      saver.conflict = true;
      useGame.setState({ saveStatus: 'conflict' });
    }
  });
  // Ask the browser to keep this site's storage even when the disk is nearly full (best effort).
  void navigator.storage?.persist?.().catch(() => undefined);
}

/** The lesson currently shown in the lesson panel. */
export const activeLesson = (s: GameState) => s.lessons[s.room];
export const activeContent = (s: GameState) => CONTENT[s.room];
export { KEY_FOR_ROOM };

/** Non-reactive access for use inside animation loops. */
export const game = () => useGame.getState();
