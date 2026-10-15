import { BLANK_TITLE, PAINTINGS } from '../content/paintings';
import { openLesson } from '../lesson/director';
import { useGame } from '../state/store';

/** Museum-label caption for the painting being inspected. */
export function PaintingCard() {
  const id = useGame((s) => s.inspecting);
  const titleRestored = useGame((s) => s.lessons.gallery.playA.solved || s.progress.completed.gallery);
  const galleryDone = useGame((s) => s.progress.completed.gallery);
  const close = () => useGame.getState().setInspecting(null);
  if (!id) return null;
  const p = PAINTINGS[id];
  if (!p) return null;
  const hidden = id === 'oldManShadow' && !titleRestored;
  return (
    <div className="painting-card" role="dialog" aria-label={hidden ? BLANK_TITLE : p.title}>
      <div className="pc-title">{hidden ? BLANK_TITLE : p.title}</div>
      <div className="pc-medium">{p.medium}</div>
      <p className="pc-note">{p.note}</p>
      {p.ask && !hidden && <div className="discuss">{p.ask}</div>}
      {hidden && <div className="discuss">The brass nameplate has been rubbed blank. What would you call it?</div>}
      {p.teacherNote && <div className="pc-teacher">For the teacher: {p.teacherNote}</div>}
      <div className="pc-actions">
        {id === 'caretaker' && (
          <button className="btn primary" onClick={() => openLesson('gallery')}>
            {galleryDone ? 'Revisit the metaphor lesson' : 'Begin the lesson here'}
          </button>
        )}
        <button className="btn quiet" onClick={close}>
          Step back <span className="key" style={{ marginLeft: 8 }}>E</span>
        </button>
      </div>
    </div>
  );
}

/** A discreet row of the keys the class has found, bottom-right. Not an inventory: just a reminder. */
export function KeyRing() {
  const keys = useGame((s) => s.progress.keys);
  const phase = useGame((s) => s.phase);
  const lessonActive = useGame((s) => s.lessonActive);
  const busy = useGame((s) => !!s.cinematic || !!s.inspecting);
  if (phase !== 'play' || lessonActive || busy || (!keys.mirrorKey && !keys.galleryKey)) return null;
  return (
    <div className="keyring" title="Keys found in the house">
      {keys.mirrorKey && <KeyGlyph label="Mirror Key" />}
      {keys.galleryKey && <KeyGlyph label="Gallery Key" />}
    </div>
  );
}

function KeyGlyph({ label }: { label: string }) {
  return (
    <span className="keyglyph">
      <svg width="30" height="14" viewBox="0 0 30 14" fill="none" stroke="#cfa95f" strokeWidth="1.4" aria-hidden="true">
        <circle cx="6" cy="7" r="4.5" />
        <path d="M10.5 7h17M24 7v4M20.5 7v3" />
      </svg>
      {label}
    </span>
  );
}
