import { useEffect, useState } from 'react';
import { startIntro } from '../lesson/navigation';
import type { Zone } from '../world/layout';
import { useGame } from '../state/store';
import { audio } from '../systems/audio';
import { skipCinematic } from '../scene/Player';

export function TitleScreen() {
  const phase = useGame((s) => s.phase);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const [skip, setSkip] = useState(false);
  const [leaving, setLeaving] = useState(false);
  if (phase !== 'title' && !leaving) return null;
  const enter = () => {
    if (leaving) return;
    audio.unlock();
    setLeaving(true);
    startIntro(skip);
    window.setTimeout(() => setLeaving(false), 1200);
  };
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
        <button className="btn primary title-enter" onClick={enter} autoFocus>
          Enter the House
        </button>
        <div className="title-options">
          <label>
            <input type="checkbox" checked={!muted} onChange={toggleMute} /> Sound on
          </label>
          <label>
            <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} /> Skip the arrival
          </label>
        </div>
      </div>
      <div className="title-hint">Best on a large screen with sound. Press T at any time for teacher controls.</div>
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

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(clearNotice, 6500);
    return () => clearTimeout(id);
  }, [notice, clearNotice]);

  const inspecting = useGame((s) => s.inspecting);
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
      {exploring && !locked && !hover && !teacherOpen && !helpOpen && !notice && (
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
              <span className="key">Esc</span> free the mouse
            </span>
            <span>
              <span className="key">T</span> teacher
            </span>
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
      {phase === 'play' && !lessonActive && !inspecting && <div className="location">{ZONE_NAMES[zone]}</div>}
      {phase !== 'title' && phase !== 'loading' && (
        <button className="teacher-key" title="Teacher controls (T)" onClick={() => setTeacherOpen(!teacherOpen)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cfa95f" strokeWidth="1.5">
            <circle cx="7" cy="12" r="4" />
            <path d="M11 12h11M18 12v4M21 12v3" />
          </svg>
        </button>
      )}
      {paused && <div className="paused-banner">Paused</div>}
      <div className={`fade ${fading ? 'on' : ''}`} />
    </>
  );
}

export function HelpOverlay() {
  const helpOpen = useGame((s) => s.helpOpen);
  const setHelpOpen = useGame((s) => s.setHelpOpen);
  if (!helpOpen) return null;
  return (
    <div className="help" onClick={() => setHelpOpen(false)}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <h2>Controls</h2>
        <table>
          <tbody>
            <tr><td><span className="key">Click</span></td><td>Capture the mouse to look around (or drag to look)</td></tr>
            <tr><td><span className="key">W A S D</span></td><td>Walk (hold Shift to walk faster). Arrow keys also work.</td></tr>
            <tr><td><span className="key">E</span> / click</td><td>Open doors, look into mirrors, use objects</td></tr>
            <tr><td><span className="key">Esc</span></td><td>Free the mouse / open this menu</td></tr>
            <tr><td><span className="key">T</span></td><td>Teacher controls</td></tr>
            <tr><td><span className="key">Space</span></td><td>Skip a cinematic</td></tr>
            <tr><td><span className="key">F</span></td><td>Fullscreen</td></tr>
            <tr><td><span className="key">M</span></td><td>Mute</td></tr>
            <tr><td><span className="key">P</span></td><td>Pause the house</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={() => setHelpOpen(false)}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
