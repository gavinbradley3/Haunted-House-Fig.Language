/**
 * The Last Dance's pages: the chapter card, the clue page from the diary, the picture lock on the first door,
 * the guest book, the Lady's last letter and the closing card. Each is shown in place of a plain note (so the
 * game treats it like any page being read: the student stands still, and the house keeps quiet).
 */
import { useState } from 'react';
import { CHAPTER, ENDING, GUESTS, JOURNAL, LEDGER, LOCK } from '../content/lastDance';
import { DIARY } from '../scene/UpperLanding';
import { useGame, type Note } from '../state/store';
import { lockTries, setWheel, tryLock } from '../story/actions';
import { checkLock, LD, LOCK_PICTURES, sawFlag, savedWheels } from '../story/lastDance';

const close = () => useGame.getState().setNote(null);

function ChapterCard({ note }: { note: Note }) {
  return (
    <div className="ld-chapter" role="dialog" aria-modal="true" aria-label={note.title}>
      <div className="ld-chapter-inner">
        <div className="kicker">{CHAPTER.kicker}</div>
        <h1>{CHAPTER.title}</h1>
        <p className="ld-lead">{CHAPTER.lead}</p>
        <div className="ld-rule" />
        {note.body.map((p) => (
          <p key={p} className="ld-story">
            {p}
          </p>
        ))}
        <p className="ld-small">{CHAPTER.optional}</p>
        <div className="ld-actions">
          <button className="btn quiet" onClick={close}>
            {CHAPTER.later}
          </button>
          <button className="btn primary" onClick={close} autoFocus>
            {CHAPTER.go}
          </button>
        </div>
      </div>
    </div>
  );
}

function Clues({ hints }: { hints: boolean }) {
  return (
    <ol className="ld-clues">
      {JOURNAL.clues.map((c, i) => (
        <li key={c.n}>
          <span className="ld-num">{c.n}</span>
          <span>
            {c.text}
            {hints && <small>{JOURNAL.hints[i]}</small>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function JournalCard() {
  const [hints, setHints] = useState(false);
  const [diary, setDiary] = useState(false);
  const found = useGame((s) => s.found);
  const seen = LOCK_PICTURES.filter((p) => found[sawFlag(p.id)]).length;
  if (diary) {
    return (
      <div className="note-paper" onClick={(e) => e.stopPropagation()}>
        <div className="kicker">{DIARY.kicker}</div>
        <h2>{DIARY.title}</h2>
        {DIARY.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <div className="ld-paper-actions">
          <button className="btn small" onClick={() => setDiary(false)}>
            Back to the loose page
          </button>
          <button className="btn primary" onClick={close} autoFocus>
            Put it back
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="note-paper ld-journal" onClick={(e) => e.stopPropagation()}>
      <div className="kicker">{JOURNAL.kicker}</div>
      <h2>{JOURNAL.title}</h2>
      {JOURNAL.intro.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <p className="ld-under">{JOURNAL.under}</p>
      <Clues hints={hints} />
      <p className="ld-footer">{JOURNAL.footer}</p>
      {seen > 0 && <p className="ld-seen">You have looked closely at {seen === 1 ? 'one painting' : `${seen} paintings`} that could be on the lock.</p>}
      <div className="ld-paper-actions">
        <button className="btn small" onClick={() => setDiary(true)}>
          Read the diary page
        </button>
        <button className="btn small" onClick={() => setHints(!hints)}>
          {hints ? 'Hide the hints' : 'I need a hint'}
        </button>
        <button className="btn primary" onClick={close} autoFocus>
          Put it back
        </button>
      </div>
      <p className="ld-small dark">Press J at any time to read these clues again.</p>
    </div>
  );
}

function LockCard() {
  const found = useGame((s) => s.found);
  const journal = !!found[LD.journal];
  const wheels = savedWheels(found);
  const [result, setResult] = useState<{ count: number; right: boolean[]; open: boolean } | null>(null);
  const [hints, setHints] = useState(lockTries.n >= 2);
  const showRight = lockTries.n >= 3;
  const turn = (w: number, dir: 1 | -1) => {
    const cur = LOCK_PICTURES.findIndex((p) => p.id === wheels[w]);
    const next = cur < 0 ? (dir > 0 ? 0 : LOCK_PICTURES.length - 1) : (cur + dir + LOCK_PICTURES.length) % LOCK_PICTURES.length;
    setWheel(w, LOCK_PICTURES[next].id);
    setResult(null);
  };
  const live = showRight ? checkLock(wheels).right : null;
  return (
    <div className="ld-lock" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={LOCK.title}>
      <div className="kicker">The right-hand door</div>
      <h2>{LOCK.title}</h2>
      <p className="ld-lock-intro">{journal ? LOCK.intro : LOCK.noJournal}</p>
      <div className="ld-wheels">
        {JOURNAL.clues.map((c, w) => {
          const pic = LOCK_PICTURES.find((p) => p.id === wheels[w]);
          const right = live?.[w];
          return (
            <div key={c.n} className={`ld-wheel ${right ? 'right' : ''}`}>
              <div className="ld-wheel-clue">
                <span className="ld-num">{c.n}</span>
                {journal ? c.text : '. . .'}
                {journal && hints && <small>{JOURNAL.hints[w]}</small>}
              </div>
              <div className="ld-pic">
                {pic?.url ? <img src={pic.url} alt={pic.title} draggable={false} /> : <div className="ld-blank">Turn the wheel</div>}
                {pic && found[sawFlag(pic.id)] && (
                  <span className="ld-eye" title="You have looked closely at this painting">
                    seen
                  </span>
                )}
              </div>
              <div className="ld-pic-title">{pic?.title ?? ''}</div>
              <div className="ld-turn">
                <button className="btn small" aria-label={`Turn wheel ${c.n} back`} onClick={() => turn(w, -1)}>
                  ◀
                </button>
                <button className="btn small" aria-label={`Turn wheel ${c.n} on`} onClick={() => turn(w, 1)}>
                  ▶
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="ld-lock-foot">
        <div className="ld-feedback" role="status" aria-live="polite">
          {result && !result.open && (
            <>
              {LOCK.wrong(result.count)} {lockTries.n >= 3 ? LOCK.showRight : lockTries.n >= 2 ? 'The clues now have hints.' : ''}
            </>
          )}
        </div>
        <div className="ld-actions">
          {journal && (
            <button className="btn small quiet" onClick={() => setHints(!hints)}>
              {hints ? 'Hide hints' : 'Hint'}
            </button>
          )}
          <button className="btn quiet" onClick={close}>
            Step back
          </button>
          <button
            className="btn primary"
            disabled={!journal || wheels.some((w) => !w)}
            onClick={() => {
              const r = tryLock();
              setResult(r);
              if (lockTries.n >= 2) setHints(true);
            }}
          >
            Try the lock
          </button>
        </div>
      </div>
    </div>
  );
}

function LedgerCard() {
  const firstTime = !useGame.getState().found[LD.key];
  return (
    <div className="note-paper ld-ledger" onClick={(e) => e.stopPropagation()}>
      <div className="kicker">{LEDGER.kicker}</div>
      <h2>{LEDGER.title}</h2>
      <p className="ld-under">{LEDGER.ask}</p>
      <table>
        <thead>
          <tr>
            {LEDGER.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GUESTS.map((g) => (
            <tr key={g.name}>
              <td className="ld-hand">{g.name}</td>
              <td>{g.arrived}</td>
              <td className="ld-empty" aria-label="nothing written" />
              <td className={g.where ? '' : 'ld-dim'}>
                {g.portrait}
                {g.where && <small> ({g.where})</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ld-realise">{LEDGER.realise}</p>
      <blockquote className="ld-lady">
        “{LEDGER.lady}”<small>{LEDGER.ladySign}</small>
      </blockquote>
      <div className="ld-paper-actions">
        <button className="btn primary" onClick={close} autoFocus>
          {firstTime ? 'Close the guest book' : 'Put it back'}
        </button>
      </div>
    </div>
  );
}

function LetterCard({ note }: { note: Note }) {
  return (
    <div className="note-paper ld-letter" onClick={(e) => e.stopPropagation()}>
      <div className="kicker">{note.kicker}</div>
      <h2>{note.title}</h2>
      {note.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {note.ask && <div className="note-ask">{note.ask}</div>}
      <div className="ld-paper-actions">
        <button className="btn primary" onClick={close} autoFocus>
          Put it back
        </button>
      </div>
    </div>
  );
}

function EndCard({ note }: { note: Note }) {
  return (
    <div className="ld-chapter" role="dialog" aria-modal="true" aria-label={note.title}>
      <div className="ld-chapter-inner">
        <div className="kicker">{ENDING.kicker}</div>
        <h1>{ENDING.title}</h1>
        <div className="ld-rule" />
        {note.body.map((p) => (
          <p key={p} className="ld-story">
            {p}
          </p>
        ))}
        <div className="ld-actions">
          <button className="btn primary" onClick={close} autoFocus>
            {ENDING.close}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The Last Dance card for a note, or null for an ordinary page. */
export function StoryCard({ note }: { note: Note }) {
  switch (note.card) {
    case 'chapter':
      return <ChapterCard note={note} />;
    case 'end':
      return <EndCard note={note} />;
    case 'journal':
      return (
        <div className="help note-card" onClick={close}>
          <JournalCard />
        </div>
      );
    case 'lock':
      return (
        <div className="help note-card" onClick={close}>
          <LockCard />
        </div>
      );
    case 'ledger':
      return (
        <div className="help note-card" onClick={close}>
          <LedgerCard />
        </div>
      );
    case 'letter':
      return (
        <div className="help note-card" onClick={close}>
          <LetterCard note={note} />
        </div>
      );
    default:
      return null;
  }
}

