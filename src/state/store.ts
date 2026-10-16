import { create } from 'zustand';
import {
  initialLessonState,
  restoreLesson,
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
import { DEVICE_ROOMS, ROOMS } from '../content/types';
import { initialProgress, parseProgress, progressReducer, KEY_FOR_ROOM, type Progress, type ProgressAction } from '../lesson/progression';

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

/** The device rooms the class has not completed yet (the ending waits for all of them). */
export const unfinishedRooms = (p: Progress) => DEVICE_ROOMS.filter((r) => !p.completed[r]);
export type { RoomId };

export type Phase = 'loading' | 'title' | 'intro' | 'play';
/** `jib` is the hidden door to the Nursery; `desk` is the lid of the Lady's writing box. */
export type DoorId = 'front' | 'mirror' | 'jib' | 'gallery' | 'dining' | 'desk' | 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study';
export type Quality = 'high' | 'balanced' | 'low';

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

interface Notice {
  text: string;
  sub?: string;
  at: number;
}

export interface GameState {
  phase: Phase;
  zone: Zone;

  // Settings
  volume: number;
  muted: boolean;
  quality: Quality;
  /** True while the game may lower quality by itself if the frame rate is poor. */
  autoQuality: boolean;

  // UI
  teacherOpen: boolean;
  helpOpen: boolean;
  paused: boolean;
  pointerLocked: boolean;
  notice: Notice | null;

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
  /** Occasional strange happenings in the house. */
  /** How often and how plainly the house does strange things while the class explores. */
  eventLevel: EventLevel;
  musicOn: boolean;
  footstepsOn: boolean;

  // Actions
  setPhase: (p: Phase) => void;
  setZone: (z: Zone) => void;
  setVolume: (v: number) => void;
  setQuality: (q: Quality, auto?: boolean) => void;
  toggleMute: () => void;
  setTeacherOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  setPointerLocked: (v: boolean) => void;
  showNotice: (text: string, sub?: string) => void;
  clearNotice: () => void;
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
  setInspecting: (id: string | null, pose?: GameState['shotPose']) => void;
  setEventLevel: (v: EventLevel) => void;
  setMusicOn: (v: boolean) => void;
  setFootstepsOn: (v: boolean) => void;
}

export const EVENT_LEVELS = ['off', 'subtle', 'eerie'] as const;
export type EventLevel = (typeof EVENT_LEVELS)[number];

const loadNumber = (k: string, d: number) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : Number(v);
  } catch {
    return d;
  }
};
/** Has a graphics quality been chosen on this computer before (by the teacher or the frame-rate guard)? */
export const hasSavedQuality = () => loadNumber('hosl.quality', -1) >= 0;
const save = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage unavailable: settings simply won't persist */
  }
};

export const useGame = create<GameState>()((set, get) => ({
  phase: 'loading',
  zone: 'exterior',
  volume: loadNumber('hosl.volume', 0.7),
  muted: loadNumber('hosl.muted', 0) === 1,
  quality: (['high', 'balanced', 'low'] as const)[loadNumber('hosl.quality', 0)] ?? 'high',
  autoQuality: loadNumber('hosl.autoQuality', 1) === 1,
  teacherOpen: false,
  helpOpen: false,
  paused: false,
  pointerLocked: false,
  notice: null,
  hover: null,
  doors: { front: false, mirror: false, jib: false, gallery: false, dining: false, desk: false, echoes: false, press: false, kitchen: false, ballroom: false, study: false },
  cinematic: null,
  teleport: null,
  shot: null,
  inspecting: null,
  shotPose: null,
  lessonActive: false,
  replayTick: 0,
  mirrorsVisited: false,
  fading: false,
  completionShot: null,
  endingOpen: false,
  lessons: loadLessons(),
  room: 'mirrors',
  progress: loadProgress(),
  eventLevel: EVENT_LEVELS[loadNumber('hosl.eventLevel', 2)] ?? 'eerie',
  musicOn: loadNumber('hosl.music', 1) === 1,
  footstepsOn: loadNumber('hosl.footsteps', 1) === 1,

  setPhase: (phase) => set({ phase }),
  setZone: (zone) => set({ zone }),
  setQuality: (quality, auto = false) => {
    save('hosl.quality', String(['high', 'balanced', 'low'].indexOf(quality)));
    save('hosl.autoQuality', auto ? '1' : '0');
    set({ quality, autoQuality: auto });
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
  setLessonActive: (lessonActive) => set({ lessonActive }),
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
    let nextProgress = progress;
    // Finishing a lesson completes its room (and puts that room's key within reach).
    if (after.completed && !before.completed) nextProgress = progressReducer(progress, { type: 'COMPLETE_ROOM', room });
    const nextLessons = { ...lessons, [room]: after };
    set({ lessons: nextLessons });
    saveLessons(nextLessons);
    if (nextProgress !== progress) get().progressDispatch({ type: 'COMPLETE_ROOM', room });
  },
  gotoStage: (stage) => get().dispatch({ type: 'GOTO_STAGE', stage }),
  setRoom: (room) => set({ room }),
  progressDispatch: (a) => {
    const before = get().progress;
    const progress = progressReducer(before, a);
    if (progress === before) return;
    save('hosl.progress', JSON.stringify(progress));
    const patch: Partial<GameState> = { progress };
    if (a.type === 'RESET_PROGRESS') {
      patch.lessons = freshLessons();
      saveLessons(patch.lessons);
      patch.doors = { ...get().doors, gallery: false, jib: false, dining: false, desk: false, echoes: false, press: false, kitchen: false, ballroom: false, study: false };
      patch.completionShot = null;
      patch.endingOpen = false;
    }
    set(patch);
  },
  setInspecting: (inspecting, pose = null) => set({ inspecting, shotPose: pose }),
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

/** Each room's lesson, saved so a class can carry on after the page is reloaded or the computer restarts. */
function loadLessons(): Record<RoomId, LessonState> {
  try {
    const raw = localStorage.getItem('hosl.lessons');
    const saved = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const out = freshLessons();
    for (const r of ROOMS) out[r] = restoreLesson(saved?.[r], CONTENT[r]);
    return out;
  } catch {
    return freshLessons();
  }
}
function saveLessons(lessons: Record<RoomId, LessonState>) {
  try {
    localStorage.setItem('hosl.lessons', JSON.stringify(lessons));
  } catch {
    /* storage unavailable or full: lessons simply won't survive a reload */
  }
}

function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem('hosl.progress'));
  } catch {
    return initialProgress();
  }
}

/** The lesson currently shown in the lesson panel. */
export const activeLesson = (s: GameState) => s.lessons[s.room];
export const activeContent = (s: GameState) => CONTENT[s.room];
export { KEY_FOR_ROOM };

/** Non-reactive access for use inside animation loops. */
export const game = () => useGame.getState();
