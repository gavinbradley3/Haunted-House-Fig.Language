import { useEffect, useState } from 'react';
import { startIntro } from '../lesson/navigation';
import { resumeGame } from '../lesson/resume';
import { nextStep } from '../lesson/guide';
import { ldObjective } from '../story/lastDance';
import { DEVICE_ROOMS } from '../content/types';
import type { Zone } from '../world/layout';
import { useGame } from '../state/store';
import { audio } from '../systems/audio';
import { TEACHER_BUILD } from '../systems/testBuild';
import { skipCinematic } from '../scene/Player';
import { saveLine } from './Menu';
import { panelSide } from '../lesson/director';

export function TitleScreen() {
  const phase = useGame((s) => s.phase);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const canContinue = useGame((s) => s.canContinue);
  const progress = useGame((s) => s.progress);
  const saveStatus = useGame((s) => s.saveStatus);
  const loadStatus = useGame((s) => s.loadStatus);
  const lastSaved = useGame((s) => s.lastSaved);
  const [skip, setSkip] = useState(false);
  const [leaving, setLeaving] = useState(false);
  if (phase !== 'title' && !leaving) return null;
  const go = (fn: () => void) => {
    if (leaving) return;
    audio.unlock();
    setLeaving(true);
    fn();
    window.setTimeout(() => setLeaving(false), 1200);
  };
  const enter = () => go(() => startIntro(skip));
  const done = DEVICE_ROOMS.filter((r) => progress.completed[r]).length;
  return (
    <div className={`title-screen ${leaving ? 'leaving' : ''}`}>
      <div className="title-kicker">A figurative language mystery</div>
      <h1 className="title-main">
        <span>The House of</span>
        Strange Language
      </h1>
      <div className="title-tagline">Some doors are opened with keys. Others are opened with words.</div>
      <div className="title-rule" />
      <div className="title-actions">
        {canContinue ? (
          <>
            <button className="btn primary title-enter" onClick={() => go(resumeGame)} autoFocus>
              Continue
            </button>
            <div className="title-progress">
              {progress.completed.finale ? 'You have finished the house.' : `${done} of 9 rooms complete. Next: ${nextStep(progress, useGame.getState().lessons).text}`}
            </div>
          </>
        ) : (
          <button className="btn primary title-enter" onClick={enter} autoFocus>
            Enter the House
          </button>
        )}
        <div className="title-options">
          <label>
            <input type="checkbox" checked={!muted} onChange={toggleMute} /> Sound on
          </label>
          {!canContinue && (
            <label>
              <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} /> Skip the arrival
            </label>
          )}
        </div>
        {loadStatus === 'recovered' && <div className="title-warn">Your saved game was damaged, so the house has carried on from its backup copy.</div>}
        {saveStatus !== 'ok' && <div className="title-warn">{saveLine(saveStatus, lastSaved)}</div>}
      </div>
      <div className="title-hint">
        {saveStatus === 'ok' ? 'Your progress saves automatically on this Chromebook, for your school account, at this web address. Headphones help.' : 'Headphones help.'}
        {TEACHER_BUILD ? ' Teacher edition: press T for teacher controls.' : ''}
      </div>
    </div>
  );
}

// Typed by Zone so a new room cannot be added without a name for the corner label.
const ZONE_NAMES: Record<Zone, string> = {
  exterior: 'The Drive',
  hall: 'The Entrance Hall',
  corridor: 'The Long Corridor',
  mirrors: 'The Hall of Mirrors',
  gallery: 'The Portrait Gallery',
  dining: 'The Giant’s Dining Room',
  nursery: 'The Nursery',
  echoes: 'The Chamber of Echoes',
  press: 'The Whispering Press',
  kitchen: 'The Crooked Kitchen',
  ballroom: 'The Ballroom of Contradictions',
  study: 'The Forgotten Scholar’s Study',
  records: 'The Guest Records',
  boudoir: 'The Lady’s Room',
};

export function HUD() {
  const phase = useGame((s) => s.phase);
  const hover = useGame((s) => s.hover);
  const locked = useGame((s) => s.pointerLocked);
  const cinematic = useGame((s) => s.cinematic);
  const lessonActive = useGame((s) => s.lessonActive);
  const teacherOpen = useGame((s) => s.teacherOpen);
  const helpOpen = useGame((s) => s.helpOpen);
  const notice = useGame((s) => s.notice);
  const clearNotice = useGame((s) => s.clearNotice);
  const zone = useGame((s) => s.zone);
  const fading = useGame((s) => s.fading);
  const paused = useGame((s) => s.paused);
  const setTeacherOpen = useGame((s) => s.setTeacherOpen);
  const setHelpOpen = useGame((s) => s.setHelpOpen);
  const upstairs = useGame((s) => s.upstairs);
  // After the nine lessons, the Last Dance's next step (if it has begun) takes the corner of the screen.
  const step = useGame((s) => ldObjective(s.found, s.progress) ?? nextStep(s.progress, s.lessons).text);
  // During a lesson the corner buttons sit on the side away from the panel, so they never cover it.
  const buttonsLeft = useGame((s) => s.lessonActive && panelSide(s.shot) === 'right');

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(clearNotice, 6500);
    return () => clearTimeout(id);
  }, [notice, clearNotice]);

  const inspecting = useGame((s) => s.inspecting);
  const reading = useGame((s) => !!s.note || !!s.shotPose);
  const exploring = phase === 'play' && !cinematic && !lessonActive && !inspecting;
  return (
    <>
      {exploring && locked && <div className={`crosshair ${hover ? 'on' : ''}`} />}
      {exploring && hover && (
        <div className="prompt">
          <span className="key">{locked ? 'E' : 'Click'}</span>
          {hover.label}
        </div>
      )}
      {exploring && !locked && !hover && !teacherOpen && !helpOpen && !notice && !reading && (
        <div className="free-hint">
          <h4>Click to look around</h4>
          <div className="row">
            <span>
              <span className="key">W A S D</span> walk
            </span>
            <span>
              <span className="key">E</span> use
            </span>
            <span>
              <span className="key">Esc</span> menu
            </span>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <span>Trackpad: slide two fingers to turn</span>
          </div>
        </div>
      )}
      {notice && (
        <div className="notice">
          <h3>{notice.text}</h3>
          {notice.sub && <p>{notice.sub}</p>}
        </div>
      )}
      {(phase === 'intro' || (phase === 'play' && cinematic)) && (
        <button className="btn quiet skip" onClick={skipCinematic}>
          Skip <span className="key" style={{ marginLeft: 8 }}>Space</span>
        </button>
      )}
      {phase === 'play' && !lessonActive && !inspecting && (
        <div className="location">
          {upstairs && zone === 'hall' ? 'The Upper Landing' : ZONE_NAMES[zone]}
          {!cinematic && !notice && <div className="objective">{step}</div>}
        </div>
      )}
      {phase !== 'title' && phase !== 'loading' && (
        <div className={`corner-buttons ${buttonsLeft ? 'left' : ''}`}>
          <button className="menu-key" title="Menu (Esc)" aria-label="Menu" onClick={() => { if (document.pointerLockElement) document.exitPointerLock(); setHelpOpen(true); }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cfa95f" strokeWidth="1.6" aria-hidden="true">
              <path d="M5 7h14M5 12h14M5 17h14" />
            </svg>
          </button>
          {TEACHER_BUILD && (
            <button className="teacher-key" title="Teacher controls (T)" aria-label="Teacher controls" onClick={() => setTeacherOpen(!teacherOpen)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cfa95f" strokeWidth="1.5" aria-hidden="true">
                <circle cx="7" cy="12" r="4" />
                <path d="M11 12h11M18 12v4M21 12v3" />
              </svg>
            </button>
          )}
        </div>
      )}
      {paused && <div className="paused-banner">Paused</div>}
      <div className={`fade ${fading ? 'on' : ''}`} />
    </>
  );
}
