/**
 * The end card, shown after "Finish the night" at the end of the final lesson.
 * It reminds the student what each room taught, with the sentences they wrote themselves.
 * Starting again (which wipes the save) is only offered in the teacher edition.
 */
import { useEffect, useState } from 'react';
import type { RoomId } from '../content/types';
import { closeLesson } from '../lesson/director';
import { jumpToHall } from '../lesson/navigation';
import { CONTENT, useGame } from '../state/store';
import { TEACHER_BUILD } from '../systems/testBuild';

const ROOMS_TAUGHT: { room: RoomId; where: string; example: string }[] = [
  { room: 'mirrors', where: 'The Hall of Mirrors', example: 'The curtains trembled like frightened hands.' },
  { room: 'gallery', where: 'The Portrait Gallery', example: 'The caretaker was a storm.' },
  { room: 'dining', where: 'The Giant’s Dining Room', example: 'I’ve waited a hundred years for this soup!' },
  { room: 'nursery', where: 'The Nursery', example: 'The music box sang itself to sleep.' },
  { room: 'echoes', where: 'The Chamber of Echoes', example: 'The pipe went drip, drip, drip.' },
  { room: 'press', where: 'The Whispering Press', example: 'The patient press pounded pages past midnight.' },
  { room: 'kitchen', where: 'The Crooked Kitchen', example: 'Mrs. Hale spilled the beans.' },
  { room: 'ballroom', where: 'The Ballroom of Contradictions', example: 'The dancers waltzed in a deafening silence.' },
  { room: 'study', where: 'The Forgotten Scholar’s Study', example: 'Opening the attic door would be opening Pandora’s box.' },
];

export function Ending() {
  const open = useGame((s) => s.endingOpen);
  const lessons = useGame((s) => s.lessons);
  const writing = useGame((s) => s.writing);
  const found = useGame((s) => s.found);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(id);
  }, [armed]);
  if (!open) return null;
  const close = () => {
    useGame.getState().setEndingOpen(false);
    closeLesson();
  };
  // The sentence that passed each room's writing check (or the latest one written there).
  const yours = (r: RoomId) => writing[r] ?? lessons[r].prove.responses[lessons[r].prove.responses.length - 1];
  return (
    <div className="ending" role="dialog" aria-label="The end">
      <div className="ending-card">
        <div className="kicker">The End</div>
        <h1>The House Can Rest</h1>
        <p className="ending-lead">Morning has come to the House of Strange Language. You learned to read it.</p>
        <div className="ending-grid">
          {ROOMS_TAUGHT.map((t) => (
            <div key={t.room} className="ending-room">
              <h3>{CONTENT[t.room].device}</h3>
              <small>{t.where}</small>
              <p>“{t.example}”</p>
              {yours(t.room) && (
                <p className="ending-yours">
                  <span>You wrote</span>“{yours(t.room)}”
                </p>
              )}
            </div>
          ))}
        </div>
        {yours('finale') && (
          <p className="ending-final">
            <span>And your answer to the Lady</span>“{yours('finale')}”
          </p>
        )}
        {found.diary && <p className="ending-lead" style={{ marginTop: 18, fontSize: 21 }}>You also found the page from the Lady’s diary on the upper landing. Not every visitor climbs the stairs.</p>}
        {found.ldEnd ? (
          <p className="ending-lead" style={{ marginTop: 12, fontSize: 21 }}>And you found out what happened at the Last Dance. The nine guests never left.</p>
        ) : (
          <p className="ending-lead" style={{ marginTop: 12, fontSize: 21 }}>
            The lessons are complete. But the house has one more secret: <strong>the Last Dance</strong>, a bonus mystery, begins when you close this page.
          </p>
        )}
        <div className="ending-actions">
          <button className="btn" onClick={close}>
            Keep exploring
          </button>
          {TEACHER_BUILD && <button
            className={`btn ${armed ? 'now' : ''}`}
            onClick={() => {
              if (!armed) return setArmed(true);
              const s = useGame.getState();
              s.progressDispatch({ type: 'RESET_PROGRESS' });
              s.setEndingOpen(false);
              s.setRoom('mirrors');
              closeLesson();
              jumpToHall();
            }}
          >
            {armed ? 'Press again: wipe this game and start again' : 'Teacher: start again from the beginning'}
          </button>}
        </div>
      </div>
    </div>
  );
}
