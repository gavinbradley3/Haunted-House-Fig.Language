import { create } from 'zustand';
import {
  initialLessonState,
  lessonReducer,
  type LessonAction,
  type LessonState,
  type Stage,
} from '../lesson/lessonMachine';
import type { Pose, ShotName, Zone } from '../world/layout';

export type Phase = 'loading' | 'title' | 'intro' | 'play';
export type DoorId = 'front' | 'mirror' | 'jib';
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
  lessonActive: boolean;
  /** Incremented to replay the current stage's intro animation. */
  replayTick: number;
  mirrorsVisited: boolean;
  /** Black fade used when jumping between places. */
  fading: boolean;
  /** Camera shot override during the completion sequence. */
  completionShot: ShotName | null;

  lesson: LessonState;

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
  dispatch: (a: LessonAction) => void;
  gotoStage: (s: Stage) => void;
}

const loadNumber = (k: string, d: number) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : Number(v);
  } catch {
    return d;
  }
};
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
  doors: { front: false, mirror: false, jib: false },
  cinematic: null,
  teleport: null,
  shot: null,
  lessonActive: false,
  replayTick: 0,
  mirrorsVisited: false,
  fading: false,
  completionShot: null,
  lesson: initialLessonState(),

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
  dispatch: (a) => set({ lesson: lessonReducer(get().lesson, a) }),
  gotoStage: (stage) => set({ lesson: lessonReducer(get().lesson, { type: 'GOTO_STAGE', stage }) }),
}));

/** Non-reactive access for use inside animation loops. */
export const game = () => useGame.getState();
