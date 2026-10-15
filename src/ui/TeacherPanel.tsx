import { useEffect, useState } from 'react';
import type { RoomId } from '../content/types';
import { STAGE_LABELS, STAGES } from '../lesson/lessonMachine';
import { closeLesson, goToKey, openLesson } from '../lesson/director';
import { jumpToGallery, jumpToHall, jumpToMirrors, walkToHall, walkToMirrors } from '../lesson/navigation';
import { canCollect, KEY_FOR_ROOM } from '../lesson/progression';
import { triggerStrangeEvent } from '../scene/HouseEvents';
import { skipCinematic } from '../scene/Player';
import { activeLesson, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { toggleFullscreen } from './fullscreen';

const ROOM_NAMES: Record<RoomId, string> = { mirrors: 'Hall of Mirrors · Simile', gallery: 'Portrait Gallery · Metaphor' };

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
        {(['mirrors', 'gallery'] as RoomId[]).map((r) => (
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
        Mirror Key: {p.keys.mirrorKey ? 'taken' : p.completed.mirrors ? 'waiting in the drawer' : 'not yet earned'} · Gallery door: {p.galleryUnlocked ? 'unlocked' : 'locked'} · Gallery Key:{' '}
        {p.keys.galleryKey ? 'taken' : p.completed.gallery ? 'waiting in the safe' : 'not yet earned'}
      </div>
      <div className="grid">
        <button className="btn" disabled={!canCollect(p, KEY_FOR_ROOM[s.room])} onClick={() => goToKey(s.room)}>
          Stand at the key
        </button>
        <button className="btn" disabled={p.galleryUnlocked} onClick={() => s.progressDispatch({ type: 'GRANT', upTo: 'galleryOpen' })}>
          Unlock the Gallery
        </button>
        <button className="btn" disabled={p.keys.galleryKey} onClick={() => s.progressDispatch({ type: 'GRANT', upTo: 'galleryKey' })}>
          Give both keys
        </button>
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
        <button className={`btn ${s.eventsOn ? 'now' : ''}`} onClick={() => s.setEventsOn(!s.eventsOn)}>
          Strange events: {s.eventsOn ? 'on' : 'off'}
        </button>
        <button className="btn" onClick={triggerStrangeEvent}>
          Make something happen
        </button>
        <button className={`btn ${s.footstepsOn ? 'now' : ''}`} onClick={() => s.setFootstepsOn(!s.footstepsOn)}>
          Footsteps: {s.footstepsOn ? 'on' : 'off'}
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
        {s.autoQuality ? 'Automatic: lowers itself if the house runs slowly.' : 'Fixed by you. Choose High to let it adjust again.'}
      </div>

      <div className="keys">T teacher · Space skip · P pause · M mute · F fullscreen · Esc free mouse / close</div>
    </div>
  );
}
