/**
 * The end card, shown when the teacher presses "Finish the night" after the final lesson.
 * It reminds the class what each room taught, with the sentences the class itself wrote.
 */
import { useEffect, useState } from 'react';
import type { RoomId } from '../content/types';
import { closeLesson } from '../lesson/director';
import { jumpToHall } from '../lesson/navigation';
import { CONTENT, useGame } from '../state/store';

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
  // The last sentence the class wrote in each room, if they wrote one.
  const yours = (r: RoomId) => lessons[r].prove.responses[lessons[r].prove.responses.length - 1];
  return (
    <div className="ending" role="dialog" aria-label="The end">
      <div className="ending-card">
        <div className="kicker">The End</div>
        <h1>The House Can Rest</h1>
        <p className="ending-lead">Morning has come to the House of Strange Language. Your class learned to read it.</p>
        <div className="ending-grid">
          {ROOMS_TAUGHT.map((t) => (
            <div key={t.room} className="ending-room">
              <h3>{CONTENT[t.room].device}</h3>
              <small>{t.where}</small>
              <p>“{t.example}”</p>
              {yours(t.room) && (
                <p className="ending-yours">
                  <span>Your class wrote</span>“{yours(t.room)}”
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
        <div className="ending-actions">
          <button className="btn" onClick={close}>
            Keep exploring
          </button>
          <button
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
            {armed ? 'Press again: start a new class' : 'Start again with a new class'}
          </button>
        </div>
      </div>
    </div>
  );
}
