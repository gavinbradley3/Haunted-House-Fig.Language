/**
 * The student's menu (Esc, or the menu button in the top corner): how to play, sound, captions,
 * look speed, how active the house is, where to go next, and a way back to the entrance hall if
 * they are stuck. Everything a student playing alone needs, with no teacher controls.
 */
import { useEffect, useState } from 'react';
import { nextStep } from '../lesson/guide';
import { closeLesson } from '../lesson/director';
import { jumpToHall } from '../lesson/navigation';
import { useGame, type EventLevel, type HouseCaptions } from '../state/store';
import { audio } from '../systems/audio';
import { toggleFullscreen } from './fullscreen';

const HAUNT: { level: EventLevel; label: string }[] = [
  { level: 'eerie', label: 'Normal' },
  { level: 'subtle', label: 'Gentle' },
  { level: 'off', label: 'Off' },
];

const CAPTIONS: { v: HouseCaptions; label: string }[] = [
  { v: 'auto', label: 'When sound is off' },
  { v: 'on', label: 'Always' },
  { v: 'off', label: 'Never' },
];

/** "a moment ago", "3 minutes ago"… */
export function ago(t: number | null, now = Date.now()) {
  if (!t) return null;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? 'a minute ago' : `${m} minutes ago`;
  return new Date(t).toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' });
}

/** One line about saving, for the title screen and the menu. */
export function saveLine(status: string, lastSaved: number | null) {
  switch (status) {
    case 'unavailable':
      return 'This browser window cannot save your progress (for example a guest or incognito window). Ask your teacher before you start.';
    case 'newer':
      return 'This saved game was made by a newer version of the house. You can look around, but nothing will be saved here.';
    case 'conflict':
      return 'The house is open in another tab. Progress is being saved there, not here.';
    case 'failed':
      return 'Your Chromebook would not save the last change (its storage may be full). Tell your teacher.';
    default: {
      const when = ago(lastSaved);
      return `Saved automatically${when ? ` ${when}` : ''}, on this Chromebook, for your school account, at this web address.`;
    }
  }
}

export function Menu() {
  const open = useGame((s) => s.helpOpen);
  const s = useGame();
  const [stuckArmed, setStuckArmed] = useState(false);
  useEffect(() => {
    if (!stuckArmed) return;
    const id = window.setTimeout(() => setStuckArmed(false), 4000);
    return () => clearTimeout(id);
  }, [stuckArmed]);
  if (!open) return null;
  const close = () => s.setHelpOpen(false);
  const step = nextStep(s.progress, s.lessons);
  return (
    <div className="help" onClick={close} role="dialog" aria-modal="true" aria-label="Menu">
      <div className="box menu" onClick={(e) => e.stopPropagation()}>
        <div className="menu-head">
          <h2>Menu</h2>
          <button className="btn primary" onClick={close} autoFocus>
            Back to the house
          </button>
        </div>

        <div className="menu-next">
          <strong>What to do next</strong>
          {step.text}
        </div>

        <div className="menu-cols">
          <section>
            <h5>How to play</h5>
            <table>
              <tbody>
                <tr><td><span className="key">Click</span></td><td>Click the house to look around with the mouse or trackpad. Press <span className="key">Esc</span> to get the pointer back.</td></tr>
                <tr><td><span className="key">W A S D</span></td><td>Walk (arrow keys work too; hold <span className="key">Shift</span> to walk faster)</td></tr>
                <tr><td><span className="key">E</span></td><td>Use the door or object in the middle of the screen (or click it)</td></tr>
                <tr><td>Trackpad</td><td>Slide two fingers across the trackpad to turn without clicking. Or hold the click and drag.</td></tr>
                <tr><td><span className="key">M</span> <span className="key">F</span> <span className="key">P</span></td><td>Mute · Full screen · Pause (press P again to carry on)</td></tr>
                <tr><td><span className="key">Esc</span></td><td>This menu</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h5>Sound</h5>
            <div className="menu-row">
              <button className="btn small" onClick={() => { audio.unlock(); s.toggleMute(); }} aria-pressed={s.muted}>
                {s.muted ? 'Sound is off: turn on' : 'Sound is on: mute'}
              </button>
            </div>
            <label className="menu-slider">
              <span>Volume</span>
              <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => { audio.unlock(); s.setVolume(Number(e.target.value)); }} aria-label="Volume" />
              <span className="menu-val">{Math.round(s.volume * 100)}%</span>
            </label>
            <div className="menu-row">
              <button className={`btn small ${s.footstepsOn ? 'now' : ''}`} onClick={() => s.setFootstepsOn(!s.footstepsOn)} aria-pressed={s.footstepsOn}>
                My footsteps: {s.footstepsOn ? 'on' : 'off'}
              </button>
            </div>

            <h5>Captions for the house’s sounds</h5>
            <div className="menu-seg" role="radiogroup" aria-label="Captions for the house's sounds">
              {CAPTIONS.map((c) => (
                <button key={c.v} role="radio" aria-checked={s.houseCaptions === c.v} className={`btn small ${s.houseCaptions === c.v ? 'now' : ''}`} onClick={() => s.setHouseCaptions(c.v)}>
                  {c.label}
                </button>
              ))}
            </div>
            <p className="menu-note">Lesson sounds always have captions. You never need sound to finish the game.</p>

            <h5>Looking around</h5>
            <label className="menu-slider">
              <span>Look speed</span>
              <input type="range" min={0.4} max={2.5} step={0.1} value={s.lookSpeed} onChange={(e) => s.setLookSpeed(Number(e.target.value))} aria-label="Look speed" />
              <span className="menu-val">{s.lookSpeed.toFixed(1)}×</span>
            </label>

            <h5>How active the house is</h5>
            <div className="menu-seg" role="radiogroup" aria-label="How active the house is">
              {HAUNT.map((h) => (
                <button key={h.level} role="radio" aria-checked={s.eventLevel === h.level} className={`btn small ${s.eventLevel === h.level ? 'now' : ''}`} onClick={() => s.setEventLevel(h.level)}>
                  {h.label}
                </button>
              ))}
            </div>
            <p className="menu-note">Creaks, knocks and footsteps while you explore. Never during a lesson. Gentle means fewer of them, and no sudden scares (the Last Dance is told more softly).</p>
          </section>
        </div>

        <div className="menu-foot">
          <button className="btn small" onClick={toggleFullscreen}>Full screen</button>
          {s.phase === 'play' && (
            <button
              className={`btn small ${stuckArmed ? 'now' : ''}`}
              onClick={() => {
                if (!stuckArmed) return setStuckArmed(true);
                setStuckArmed(false);
                close();
                closeLesson();
                jumpToHall();
              }}
            >
              {stuckArmed ? 'Press again to go to the entrance hall' : 'I’m stuck: take me to the entrance hall'}
            </button>
          )}
          <span className="menu-save">{saveLine(s.saveStatus, s.lastSaved)}</span>
        </div>
      </div>
    </div>
  );
}
