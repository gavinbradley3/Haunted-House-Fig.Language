import { useEffect, useState } from 'react';
import { DEVICE_ROOMS, ROOMS, type RoomId } from '../content/types';
import { STAGE_LABELS, STAGES } from '../lesson/lessonMachine';
import { closeLesson, goToKey, jumpToRoom, openLesson } from '../lesson/director';
import { jumpToGallery, jumpToHall, jumpToMirrors, walkToHall, walkToMirrors } from '../lesson/navigation';
import { canCollect, GRANT_STEPS, KEY_FOR_ROOM, type GrantStep, type KeyId, type Progress } from '../lesson/progression';
import { triggerStrangeEvent } from '../scene/HouseEvents';
import { skipCinematic } from '../scene/Player';
import { activeLesson, EVENT_LEVELS, useGame, type EventLevel } from '../state/store';
import { audio } from '../systems/audio';
import { toggleFullscreen } from './fullscreen';

const EVENT_HELP: Record<EventLevel, string> = {
  off: 'The house stays still.',
  subtle: 'Now and then, something small: a creak, a stopped clock. Easy to miss.',
  eerie: 'More often, and some you will notice: candles bow in a draught, lights sink, a mirror fogs.',
};

const ROOM_NAMES: Record<RoomId, string> = {
  mirrors: 'Hall of Mirrors · Simile',
  gallery: 'Portrait Gallery · Metaphor',
  dining: 'Dining Room · Hyperbole',
  nursery: 'Nursery · Personification',
  echoes: 'Chamber of Echoes · Onomatopoeia',
  press: 'Whispering Press · Alliteration',
  kitchen: 'Crooked Kitchen · Idiom',
  ballroom: 'Ballroom · Oxymoron',
  study: 'Scholar’s Study · Allusion',
  finale: 'The Lady’s Letter · All nine',
};

const GRANT_LABELS: Record<GrantStep, string> = {
  mirrorKey: 'Mirror Key',
  galleryOpen: 'Gallery unlocked',
  galleryKey: 'Gallery Key',
  diningOpen: 'Dining Room unlocked',
  diningKey: 'Tiny Key',
  nurseryOpen: 'Nursery unlocked',
  nurseryKey: 'Music Box Key',
  echoesOpen: 'Chamber of Echoes unlocked',
  echoesKey: 'Bell Key',
  pressOpen: 'Whispering Press unlocked',
  pressKey: 'Type Key',
  kitchenOpen: 'Kitchen unlocked',
  kitchenKey: 'Pantry Key',
  ballroomOpen: 'Ballroom unlocked',
  ballroomKey: 'Ballroom Key',
  studyOpen: 'Study unlocked',
  studyKey: 'Scholar’s Key',
  deskOpen: 'Writing box open',
};

/** Where the class is in the chain of keys, in a few words. */
function chainStatus(p: Progress) {
  const done = DEVICE_ROOMS.filter((r) => p.completed[r]);
  const next = DEVICE_ROOMS.find((r) => !p.completed[r]);
  const waiting = (Object.keys(p.keys) as KeyId[]).find((k) => canCollect(p, k));
  const held = (Object.keys(p.keys) as KeyId[]).filter((k) => p.keys[k]).length;
  return [
    `Rooms complete: ${done.length} of ${DEVICE_ROOMS.length}`,
    next ? `Next: ${ROOM_NAMES[next]}` : 'All nine rooms complete',
    `Keys taken: ${held} of 9`,
    waiting ? 'A key is waiting to be taken' : '',
    `Writing box: ${p.unlocked.desk ? 'open' : 'locked'}`,
    p.completed.finale ? 'Finished' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** A button that asks for a second press instead of a browser dialog (dialogs are blocked in some views). */
function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      className={`btn ${armed ? 'now' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

/** Skip ahead: put the house in the state it would be in after a chosen step. */
function GrantControl({ onGrant }: { onGrant: (s: GrantStep) => void }) {
  const [step, setStep] = useState<GrantStep>('galleryKey');
  return (
    <div className="grant">
      <select value={step} onChange={(e) => setStep(e.target.value as GrantStep)} aria-label="Skip ahead to">
        {GRANT_STEPS.map((g) => (
          <option key={g} value={g}>
            Up to: {GRANT_LABELS[g]}
          </option>
        ))}
      </select>
      <button className="btn small" onClick={() => onGrant(step)}>
        Skip ahead
      </button>
    </div>
  );
}

/** Discreet teacher drawer. Everything here is safe to press at any time. */
export function TeacherPanel() {
  const s = useGame();
  if (!s.teacherOpen) return null;
  const lesson = activeLesson(s);
  const stage = lesson.stage;
  const challenge = stage === 'playA' || stage === 'playB' ? stage : null;
  const inLesson = s.lessonActive;
  const p = s.progress;
  return (
    <div className="teacher">
      <h2>Teacher Controls</h2>
      <div className="sub">Press T to hide. The class sees this panel too, so keep it brief.</div>

      <h5>Flow</h5>
      <div className="grid">
        <button className="btn" onClick={() => s.setPaused(!s.paused)}>
          {s.paused ? 'Resume the house' : 'Pause the house'}
        </button>
        <button className="btn" onClick={skipCinematic} disabled={!s.cinematic}>
          Skip animation
        </button>
        <button className="btn" onClick={s.replay}>
          Replay this moment
        </button>
        <button className="btn" disabled={!challenge} onClick={() => challenge && s.dispatch({ type: 'REVEAL_ANSWER', challenge })}>
          Reveal the answer
        </button>
        <button className="btn" onClick={() => s.dispatch({ type: 'RESET_QUESTION' })}>
          Reset this question
        </button>
        <ConfirmButton label="Reset this lesson" confirmLabel="Press again to reset" onConfirm={() => s.dispatch({ type: 'RESET_LESSON' })} />
      </div>

      <h5>Lesson</h5>
      <div className="grid">
        {ROOMS.map((r) => (
          <button key={r} className={`btn ${s.room === r ? 'now' : ''}`} onClick={() => openLesson(r)}>
            {ROOM_NAMES[r]}
          </button>
        ))}
      </div>
      <div className="stages" style={{ marginTop: 8 }}>
        {STAGES.map((st) => (
          <button
            key={st}
            className={`btn ${stage === st ? 'now' : ''}`}
            onClick={() => {
              s.gotoStage(st);
              if (!s.lessonActive) openLesson(s.room);
            }}
          >
            {STAGE_LABELS[st].replace('Play: ', '').replace('Find the Simile', 'Challenge A').replace('Change the Mood', 'Challenge B')}
          </button>
        ))}
      </div>

      <h5>Go to</h5>
      <div className="grid">
        <button className="btn" onClick={walkToMirrors}>
          Walk to the Mirrors
        </button>
        <button className="btn" onClick={jumpToMirrors}>
          Jump to the Mirrors
        </button>
        <button className="btn" onClick={jumpToGallery}>
          Jump to the Gallery
        </button>
        <button className="btn" onClick={() => jumpToRoom('dining')}>
          Jump to the Dining Room
        </button>
        <button className="btn" onClick={() => jumpToRoom('nursery')}>
          Jump to the Nursery
        </button>
        {(['echoes', 'press', 'kitchen', 'ballroom', 'study'] as RoomId[]).map((r) => (
          <button key={r} className="btn" onClick={() => jumpToRoom(r)}>
            Jump to {ROOM_NAMES[r].split(' · ')[0].replace(/^The /, 'the ')}
          </button>
        ))}
        <button className="btn" onClick={jumpToHall}>
          Jump to the Hall
        </button>
        <button className="btn" onClick={walkToHall}>
          Walk to the Hall
        </button>
        <button className="btn" onClick={inLesson ? closeLesson : () => openLesson(s.room)}>
          {inLesson ? 'Leave lesson view' : 'Open the lesson'}
        </button>
      </div>

      <h5>Keys and doors</h5>
      <div className="sub" style={{ marginBottom: 8 }}>
        {chainStatus(p)}
      </div>
      <div className="grid">
        <button className="btn" disabled={!canCollect(p, KEY_FOR_ROOM[s.room])} onClick={() => goToKey(s.room)}>
          Stand at the key
        </button>
        <GrantControl onGrant={(upTo) => s.progressDispatch({ type: 'GRANT', upTo })} />
        <ConfirmButton
          label="Reset all progress"
          confirmLabel="Press again: lock everything"
          onConfirm={() => {
            s.progressDispatch({ type: 'RESET_PROGRESS' });
            closeLesson();
            jumpToHall();
          }}
        />
      </div>

      <h5>Atmosphere</h5>
      <div className="grid">
        {EVENT_LEVELS.map((lvl) => (
          <button key={lvl} className={`btn ${s.eventLevel === lvl ? 'now' : ''}`} onClick={() => s.setEventLevel(lvl)} title={EVENT_HELP[lvl]}>
            Strange events: {lvl}
          </button>
        ))}
        <button className="btn" onClick={triggerStrangeEvent}>
          Make something happen
        </button>
        <button className={`btn ${s.footstepsOn ? 'now' : ''}`} onClick={() => s.setFootstepsOn(!s.footstepsOn)}>
          Footsteps: {s.footstepsOn ? 'on' : 'off'}
        </button>
        <button className={`btn ${s.musicOn ? 'now' : ''}`} onClick={() => s.setMusicOn(!s.musicOn)} title="Plays only if a music file has been added (see docs/SOUNDS.md)">
          Music: {s.musicOn ? 'on' : 'off'}
        </button>
        <button className="btn" onClick={toggleFullscreen}>
          Fullscreen
        </button>
      </div>

      <h5>Sound</h5>
      <div className="vol">
        <button className="btn small" onClick={s.toggleMute}>
          {s.muted ? 'Unmute' : 'Mute'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.volume}
          onChange={(e) => {
            audio.unlock();
            s.setVolume(Number(e.target.value));
          }}
          aria-label="Volume"
        />
        <span style={{ width: 44, textAlign: 'right' }}>{Math.round(s.volume * 100)}%</span>
      </div>

      <h5>Graphics</h5>
      <div className="stages">
        {(['high', 'balanced', 'low'] as const).map((q) => (
          <button key={q} className={`btn ${s.quality === q ? 'now' : ''}`} onClick={() => s.setQuality(q, q === 'high')}>
            {q[0].toUpperCase() + q.slice(1)}
          </button>
        ))}
      </div>
      <div className="sub" style={{ marginTop: 6 }}>
        {s.autoQuality ? 'Automatic: chosen for this computer’s graphics, and lowers itself if the house runs slowly. Low is recommended for most school computers.' : 'Fixed by you. Choose High to let it adjust again. Low is recommended for most school computers.'}
      </div>

      <div className="keys">T teacher · Space skip · P pause · M mute · F fullscreen · Esc free mouse / close</div>
    </div>
  );
}
