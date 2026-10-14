import { STAGE_LABELS, STAGES } from '../lesson/lessonMachine';
import { openLesson, closeLesson } from '../lesson/director';
import { jumpToHall, jumpToMirrors, walkToHall, walkToMirrors } from '../lesson/navigation';
import { skipCinematic } from '../scene/Player';
import { useGame } from '../state/store';
import { audio } from '../systems/audio';
import { toggleFullscreen } from './fullscreen';

/** Discreet teacher drawer. Everything here is safe to press at any time. */
export function TeacherPanel() {
  const s = useGame();
  if (!s.teacherOpen) return null;
  const stage = s.lesson.stage;
  const challenge = stage === 'playA' || stage === 'playB' ? stage : null;
  const inLesson = s.lessonActive;
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
        <button
          className="btn"
          onClick={() => {
            if (confirm('Start the whole simile lesson again?')) s.dispatch({ type: 'RESET_LESSON' });
          }}
        >
          Reset the lesson
        </button>
      </div>

      <h5>Jump to lesson stage</h5>
      <div className="stages">
        {STAGES.map((st) => (
          <button
            key={st}
            className={`btn ${stage === st ? 'now' : ''}`}
            onClick={() => {
              s.gotoStage(st);
              if (!s.lessonActive) openLesson();
            }}
          >
            {STAGE_LABELS[st].replace('Play: ', '')}
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
        <button className="btn" onClick={walkToHall}>
          Walk to the Hall
        </button>
        <button className="btn" onClick={jumpToHall}>
          Jump to the Hall
        </button>
        <button className="btn" onClick={inLesson ? closeLesson : openLesson}>
          {inLesson ? 'Leave lesson view' : 'Open the lesson'}
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

      <div className="keys">
        T teacher · Space skip · P pause · M mute · F fullscreen · Esc free mouse
      </div>
    </div>
  );
}
