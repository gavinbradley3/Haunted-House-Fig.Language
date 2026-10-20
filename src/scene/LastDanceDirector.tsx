/**
 * The Last Dance's director: the story moments, as opposed to the haunting director's random disturbances.
 *
 * During the nine lessons (each happens once, never during a lesson, a painting, a page or the menu):
 *  - Early: after the Hall of Mirrors lesson, walking back up the corridor toward the hall, the student sees the
 *    Lady cross the far end of the corridor and step out of sight round the corner; then the door behind them
 *    slams. "Someone else is in the house."
 *  - Middle: after the fourth lesson, coming back into the entrance hall, her portrait above the fireplace is
 *    empty, and a woman is humming beside it. Once the student has looked, she is back in her frame.
 * After the lessons (the bonus chapter):
 *  - the chapter card; the house goes back to night; her portrait stays empty while she is upstairs;
 *  - the paintings the student examines are remembered (the lock shows which ones they have seen);
 *  - she is seen far off now and then while they search the house (the haunting's apparition comes due);
 *  - her room: the first step inside, turning away from the mirror, and the figure in the empty frame at the end.
 *
 * Everything that must happen only once is a saved flag, so loading a save never replays a story moment.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DEVICE_ROOMS } from '../content/types';
import { ffx } from '../lesson/finaleFx';
import { game, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { hauntImagePresent, hauntTexture } from '../systems/paintingImages';
import { showCaption } from '../systems/soundCues';
import { world } from '../systems/time';
import { BOUDOIR, CORRIDOR, FINALE, UPSTAIRS } from '../world/layout';
import { cancelStoryTimers, enterBoudoir, gentle, hookNotice, openChapterCard, slamDoor, turnedFromMirror } from '../story/actions';
import { ldFx } from '../story/fx';
import { LD, ldActive, ldStage, sawFlag, WATCHED } from '../story/lastDance';
import { storyHold } from '../story/hold';
import { hauntDueNow, holdHaunting } from './HouseEvents';
import { showFigure } from './HauntFigure';
import { hungPaintings } from './parts/Artwork';
import { houseState } from './parts/Lights';
import { roomLightLevel } from './RoomLights';

type V3 = [number, number, number];
const fwd = new THREE.Vector3();
const to = new THREE.Vector3();
function inView(cam: THREE.Camera, p: THREE.Vector3, deg: number, far: number) {
  cam.getWorldDirection(fwd);
  to.copy(p).sub(cam.position);
  const d = to.length();
  return d < far && to.normalize().dot(fwd) > Math.cos((deg * Math.PI) / 180);
}

/** Free to explore: no lesson, page, painting, menu, cutscene or fade. */
function exploring() {
  const s = game();
  return s.phase === 'play' && !s.lessonActive && !s.cinematic && !s.note && !s.inspecting && !s.helpOpen && !s.endingOpen && !s.fading && !s.paused && !s.teacherOpen;
}

const portraitPos = new THREE.Vector3(FINALE.portrait.x, FINALE.portrait.y, FINALE.portrait.z);

/** Show the Lady's portrait empty (she is out of her frame) or as it should be. */
function portraitEmpty(on: boolean) {
  const lady = hungPaintings.get('ladyOfHouse');
  if (!lady?.showTexture) return false;
  if (on) {
    const tex = hauntImagePresent('ladyGone') ? hauntTexture('ladyGone') : null;
    if (!tex?.userData.loaded) return false;
    lady.showTexture(tex);
  } else lady.showTexture(null);
  return true;
}

export function LastDanceDirector() {
  const { camera } = useThree();
  const st = useRef({
    introWait: 0,
    early: { tried: 0, fired: false },
    mid: { armed: false, called: -1, lookedFor: 0, noticed: -1, away: 0, hinted: false },
    portraitHeld: false,
    portraitCheck: 0,
    lastZone: '',
    apparitionNudged: false,
  });

  // Paintings looked at closely are remembered (the lock marks them "seen").
  useEffect(
    () =>
      useGame.subscribe((s, p) => {
        if (s.inspecting && s.inspecting !== p.inspecting && WATCHED.has(s.inspecting)) s.markFound(sawFlag(s.inspecting));
        // A new game (the teacher's reset): put the chapter's effects back.
        if (p.progress.completed.finale && !s.progress.completed.finale) {
          cancelStoryTimers();
          ldFx.frameFigure = ldFx.frameFigureTarget = 0;
        }
      }),
    [],
  );

  useFrame(() => {
    const s = game();
    const r = st.current;
    const stage = ldStage(s.found, s.progress);
    const active = ldActive(s.found, s.progress);

    // ---------------------------------------------------------------- the house during the chapter
    // Night again while the mystery is under way (morning when it is over); the hall a little gloomier.
    if (active && !(s.lessonActive && s.room === 'finale')) {
      ffx.dawnTarget = 0;
      ffx.hallTarget = 0.85;
    }
    // The candles in the two rooms follow the story (they sink and gutter at its worst moments).
    ldFx.candles += (ldFx.candlesTarget - ldFx.candles) * (1 - Math.exp(-world.dt * 3));
    roomLightLevel.records = roomLightLevel.boudoir = ldFx.candles;

    // Her portrait is empty while she is upstairs (from the chapter card until her letter has been read).
    const wantEmpty = active && stage !== 'intro';
    storyHold.portrait = wantEmpty || r.mid.armed;
    if (wantEmpty !== r.portraitHeld || (wantEmpty && (r.portraitCheck += world.dt) > 1)) {
      r.portraitCheck = 0;
      if (portraitEmpty(wantEmpty)) r.portraitHeld = wantEmpty;
    }

    // ---------------------------------------------------------------- the chapter card
    if (stage === 'intro' && exploring()) {
      r.introWait += world.dt;
      if (r.introWait > 1.6) {
        r.introWait = 0;
        openChapterCard();
      }
    } else r.introWait = 0;

    // ---------------------------------------------------------------- her room
    if (s.zone !== r.lastZone) {
      if (s.zone === 'boudoir' && !s.found.ldInRoom) {
        s.markFound('ldInRoom');
        enterBoudoir();
      }
      // Searching the house for the paintings: she is about. Her next sighting comes due.
      if (stage === 'paintings' && !r.apparitionNudged && (s.zone === 'corridor' || s.zone === 'gallery' || s.zone === 'nursery')) {
        r.apparitionNudged = true;
        if (!gentle()) hauntDueNow('apparition');
      }
      r.lastZone = s.zone;
    }
    // While she is in the mirror and the student has their view back: turning away sends her.
    if (world.t >= ldFx.lady.start && world.t <= ldFx.lady.start + ldFx.lady.dur && !s.shotPose) {
      camera.getWorldDirection(fwd);
      if (fwd.z > -0.35) turnedFromMirror();
    }
    // The end: someone is standing in the empty frame by her door.
    if (s.found[LD.twist]) ldFx.frameFigureTarget = 1;
    else if (stage === 'done' && s.zone === 'boudoir' && exploring()) {
      const p = new THREE.Vector3(BOUDOIR.frame.x, UPSTAIRS.y + BOUDOIR.frame.y, BOUDOIR.zN);
      if (inView(camera, p, 28, 5.5)) {
        s.markFound(LD.twist);
        ldFx.frameFigureTarget = 1;
        audio.whisperAt([p.x, p.y, p.z - 0.4], 1.4);
        window.setTimeout(() => showCaption('The empty frame by the door is not empty any more.'), 1800);
      }
    }

    // ---------------------------------------------------------------- the story moments during the lessons
    if (s.progress.completed.finale || s.eventLevel === 'off') return;
    const free = exploring();

    // Early: after the Hall of Mirrors.
    if (s.progress.completed.mirrors && !s.found[LD.hookEarly] && free) {
      r.early.tried += world.dt;
      const z = camera.position.z;
      camera.getWorldDirection(fwd);
      const lookingUp = s.zone === 'corridor' && fwd.z > 0.8 && z < -12.2 && z > CORRIDOR.zEnd + 0.4;
      if (lookingUp) runEarlyHook();
      // Never seen it (they went straight to another room): the quieter version, somewhere in the hall or corridor.
      else if (r.early.tried > 150 && (s.zone === 'hall' || s.zone === 'corridor') && !s.upstairs) runEarlyQuiet();
    }

    // Middle: after the fourth lesson, back in the entrance hall.
    const done = DEVICE_ROOMS.filter((d) => s.progress.completed[d]).length;
    const m = r.mid;
    if (done >= 4 && !s.found[LD.hookMid]) {
      const inHall = s.zone === 'hall' && !s.upstairs;
      if (!m.armed) {
        // Empty the frame while it cannot be seen, before the student is back in the hall.
        if (free && !inView(camera, portraitPos, 60, 40) && portraitEmpty(true)) {
          m.armed = true;
          m.called = -1;
        }
      } else if (inHall && free) {
        const near = camera.position.distanceTo(portraitPos) < 11;
        if (m.called < 0 && near) {
          // A sound the student knows: her humming, from beside the fireplace; the lamps there stutter.
          m.called = world.t;
          holdHaunting(40);
          if (!audio.ladyHum([portraitPos.x - 0.6, 1.4, portraitPos.z], 1.5)) audio.whisperAt([portraitPos.x - 0.6, 1.6, portraitPos.z], 1.4);
          houseState.flicker = { x: portraitPos.x, z: portraitPos.z, until: world.t + 1.6 };
          showCaption('A woman is humming, close by. The sound comes from the fireplace.');
        }
        if (m.called >= 0 && m.noticed < 0) {
          if (inView(camera, portraitPos, 22, 13)) m.lookedFor += world.dt;
          if (m.lookedFor > 0.6) {
            m.noticed = world.t;
            hookNotice('mid');
          } else if (!m.hinted && world.t - m.called > 22) {
            m.hinted = true;
            hookNotice('midHint');
          }
        }
        // Seen, then looked away: she is back in her frame, as if she had never left it.
        if (m.noticed >= 0) {
          m.away = inView(camera, portraitPos, 50, 30) ? 0 : m.away + world.dt;
          if (m.away > 2.5 || world.t - m.noticed > 40) finishMid();
        }
      }
      // A lesson or another room took the student away before they saw it: put her back, and try another time.
      if (m.armed && !inHall && m.called >= 0 && !free) {
        portraitEmpty(false);
        m.armed = false;
        m.called = -1;
        m.lookedFor = 0;
      }
    }

    function finishMid() {
      portraitEmpty(false);
      m.armed = false;
      game().markFound(LD.hookMid);
      if (Math.random() < 0.6) window.setTimeout(() => audio.ladyLaugh([portraitPos.x - 2, 4.4, -9.4], 1.1), 1500);
    }

    function runEarlyHook() {
      game().markFound(LD.hookEarly);
      holdHaunting(35);
      // She stands for a moment in the hall, beyond the arch at the end of the corridor, then steps aside out of sight.
      const from: V3 = [0.15, 0, -9.55];
      const toward: V3 = [-1.7, 0, -9.55];
      showFigure(from, toward, gentle() ? 3.0 : 2.6, gentle() ? 0.72 : 0.9, 'stand', 0.7);
      window.setTimeout(() => audio.otherStep([-1.2, 0.2, -9.4], 1.2), 2100);
      window.setTimeout(() => audio.otherStep([-2.0, 0.2, -9.0], 1.0), 2600);
      // Then the door behind the student slams.
      window.setTimeout(() => slamDoor('mirror-door', 'mirror', [0, 1.4, CORRIDOR.zEnd]), gentle() ? 3400 : 2900);
      window.setTimeout(() => hookNotice('early'), 4100);
    }

    function runEarlyQuiet() {
      game().markFound(LD.hookEarly);
      holdHaunting(35);
      const at: V3 = [camera.position.x + 3, 1.4, camera.position.z + (s.zone === 'hall' ? -3 : 3)];
      if (gentle()) audio.distantDoor(at, 2.2);
      else audio.slam(at);
      for (let i = 0; i < 5; i++) window.setTimeout(() => audio.otherStep([at[0] + i * 0.6, 0.2, at[2] - i * 0.4], 1.1 - i * 0.12), 900 + i * 300);
      window.setTimeout(() => hookNotice('earlyQuiet'), 1800);
    }
  });
  return null;
}
