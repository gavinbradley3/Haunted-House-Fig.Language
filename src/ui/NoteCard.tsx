/** A page to read close up (the Lady's diary on the upper landing). E, Esc or the button closes it. */
import { useGame } from '../state/store';
import { StoryCard } from './StoryCards';

export function NoteCard() {
  const note = useGame((s) => s.note);
  const setNote = useGame((s) => s.setNote);
  if (!note) return null;
  if (note.card) return <StoryCard note={note} />;
  return (
    <div className="help note-card" onClick={() => setNote(null)} role="dialog" aria-modal="true" aria-label={note.title}>
      <div className="note-paper" onClick={(e) => e.stopPropagation()}>
        <div className="kicker">{note.kicker}</div>
        <h2>{note.title}</h2>
        {note.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {note.ask && <div className="note-ask">{note.ask}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn primary" onClick={() => setNote(null)} autoFocus>
            Put it back
          </button>
        </div>
      </div>
    </div>
  );
}
