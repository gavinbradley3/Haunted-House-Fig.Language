/**
 * Teacher-friendly navigation: the cinematic intro, guided walks with doors
 * opening on cue, and instant jumps (with a fade) for when time is short.
 */
import { game, useGame, type Vec3 } from '../state/store';
import { audio } from '../systems/audio';
import { liveCamera } from '../systems/time';
import { EXTERIOR, POSES, type Pose } from '../world/layout';

const FZ = EXTERIOR.facadeZ;

export function startIntro(skip: boolean) {
  const s = useGame.getState();
  audio.unlock();
  if (skip) {
    s.setDoor('front', true);
    s.teleportTo(POSES.hallStart);
    s.setPhase('play');
    s.setZone('hall');
    audio.setZone('hall');
    return;
  }
  s.setPhase('intro');
  const steps = [0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.74, 0.82, 0.9].map((t) => ({ t, run: () => audio.footstep(0.7, t < 0.5 ? 'gravel' : 'wood') }));
  s.playCinematic({
    id: `intro-${Date.now()}`,
    points: [
      [liveCamera.position[0], liveCamera.position[1], liveCamera.position[2]],
      [0.6, 1.3, 13],
      [0.1, 1.28, FZ + 5.2],
      [0, 1.66, FZ + 2.1],
      [0, 1.66, FZ + 1.1],
      [0, 1.65, -0.6],
      [...POSES.hallStart.position] as Vec3,
    ],
    targets: [
      [0, 5.4, -2],
      [0, 3.6, 0],
      [0, 2.2, 0],
      [0, 1.8, -2],
      [0, 1.7, -4],
      [0, 1.8, -7],
      [0, 1.6, -9],
    ],
    duration: 15,
    events: [
      ...steps,
      {
        t: 0.56,
        run: () => {
          useGame.getState().setDoor('front', true);
          audio.doorOpen([0, 1.5, FZ], true);
        },
      },
    ],
    onDone: () => {
      const g = useGame.getState();
      g.setPhase('play');
      g.teleportTo(POSES.hallStart);
      g.showNotice('Welcome to the house.', 'Click to look around. Walk with W A S D. Press E to use a door or object.');
    },
  });
}

/** Instant move with a short fade to black. */
export function jumpTo(pose: Pose, before?: () => void) {
  const s = useGame.getState();
  s.endCinematic();
  s.setFading(true);
  window.setTimeout(() => {
    before?.();
    useGame.getState().teleportTo(pose);
    window.setTimeout(() => useGame.getState().setFading(false), 120);
  }, 380);
}

export function jumpToHall() {
  closeLessonView();
  jumpTo(POSES.hallStart);
}

export function jumpToMirrors() {
  closeLessonView();
  jumpTo(POSES.mirrorEntry, () => {
    useGame.getState().setDoor('mirror', true);
    useGame.getState().markMirrorsVisited();
  });
}

function closeLessonView() {
  const s = useGame.getState();
  s.setLessonActive(false);
  s.setShot(null);
  s.setCompletionShot(null);
}

/** A guided walk from wherever the camera is now, through the corridor, into the Hall of Mirrors. */
export function walkToMirrors() {
  closeLessonView();
  const [x, y, z] = liveCamera.position;
  const pts: Vec3[] = [[x, y, z]];
  const tgts: Vec3[] = [[x + liveCamera.forward[0] * 3, 1.6, z + liveCamera.forward[2] * 3]];
  if (z > -9) {
    pts.push([0.2, 1.65, -6.8]);
    tgts.push([0, 1.6, -12]);
  }
  if (z > -16.5) {
    pts.push([0, 1.65, -12.5]);
    tgts.push([0, 1.5, -18.6]);
    pts.push([0, 1.65, -16.9]);
    tgts.push([0, 1.4, -19]);
  }
  pts.push([0, 1.65, -18.9]);
  tgts.push([0.4, 1.6, -24]);
  pts.push([...POSES.mirrorEntry.position] as Vec3);
  tgts.push([0.3, 1.7, -30]);
  const dist = Math.abs(z - POSES.mirrorEntry.position[2]);
  const doorOpen = game().doors.mirror;
  game().playCinematic({
    id: `walk-${Date.now()}`,
    points: pts,
    targets: tgts,
    duration: Math.max(4, dist / 1.6),
    events: [
      {
        t: Math.max(0.05, 1 - 3.5 / Math.max(dist, 4)),
        run: () => {
          if (!doorOpen) {
            useGame.getState().setDoor('mirror', true);
            audio.doorOpen([0, 1.4, -18.75], true);
          }
        },
      },
      ...Array.from({ length: Math.floor(dist / 1.4) }, (_, i) => ({ t: (i + 0.5) / Math.floor(dist / 1.4), run: () => audio.footstep(0.8) })),
    ],
    onDone: () => useGame.getState().markMirrorsVisited(),
  });
}

/** Guided walk back to the entrance hall. */
export function walkToHall() {
  closeLessonView();
  const [x, y, z] = liveCamera.position;
  const pts: Vec3[] = [[x, y, z]];
  const tgts: Vec3[] = [[x + liveCamera.forward[0] * 3, 1.6, z + liveCamera.forward[2] * 3]];
  if (z < -18.8) {
    pts.push([0, 1.65, -20.0]);
    tgts.push([0, 1.6, -15]);
    if (!game().doors.mirror) useGame.getState().setDoor('mirror', true);
  }
  if (z < -10.5) {
    pts.push([0, 1.65, -16.5]);
    tgts.push([0, 1.6, -9]);
    pts.push([0, 1.65, -10.6]);
    tgts.push([0, 1.8, -5]);
  }
  pts.push([0.0, 1.65, -6.8]);
  tgts.push([0.5, 2.2, -2]);
  pts.push([...POSES.hallStart.position] as Vec3);
  tgts.push([0, 1.65, -6]);
  const dist = Math.abs(z - POSES.hallStart.position[2]);
  game().playCinematic({
    id: `walkhall-${Date.now()}`,
    points: pts,
    targets: tgts,
    duration: Math.max(4, dist / 1.6),
    events: Array.from({ length: Math.floor(dist / 1.4) }, (_, i) => ({ t: (i + 0.5) / Math.max(1, Math.floor(dist / 1.4)), run: () => audio.footstep(0.8) })),
  });
}

/** Fade straight into the Portrait Gallery (teacher shortcut; opens the door so nobody is shut in). */
export function jumpToGallery() {
  closeLessonView();
  jumpTo(POSES.galleryEntry, () => useGame.getState().setDoor('gallery', true));
}
