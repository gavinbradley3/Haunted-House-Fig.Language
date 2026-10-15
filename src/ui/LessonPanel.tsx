import { Fragment, useEffect, useRef, useState } from 'react';
import { ROLE_LABELS, type AnnotatedPart, type ChoiceChallenge, type Role } from '../content/types';
import { canAdvance, STAGES, type Stage } from '../lesson/lessonMachine';
import { closeLesson, goToKey, panelSide } from '../lesson/director';
import { canCollect, KEY_FOR_ROOM } from '../lesson/progression';
import { walkToHall } from '../lesson/navigation';
import { activeContent, activeLesson, useGame } from '../state/store';

const PROGRESS: { stage: Stage[]; label: string }[] = [
  { stage: ['discover'], label: 'Discover' },
  { stage: ['learn'], label: 'Learn' },
  { stage: ['playA', 'playB'], label: 'Play' },
  { stage: ['prove'], label: 'Prove' },
];

function Progress({ stage }: { stage: Stage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="progress">
      {PROGRESS.map((p, i) => {
        const pIdx = Math.max(...p.stage.map((s) => STAGES.indexOf(s)));
        const now = p.stage.includes(stage);
        const done = !now && idx > pIdx;
        return (
          <Fragment key={p.label}>
            {i > 0 && <span className="sep" />}
            <span className={`dot ${now ? 'now' : ''} ${done ? 'done' : ''}`}>
              <i />
              {p.label}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

export function Annotated({ parts, showLegend = true }: { parts: AnnotatedPart[]; showLegend?: boolean }) {
  const labels: Record<Role, string> = useGame((s) => activeContent(s).roleLabels) ?? ROLE_LABELS;
  let n = 0;
  return (
    <>
      <div className="annot">
        {parts.map((p, i) => {
          const delay = p.role ? 0.2 + n++ * 0.35 : 0;
          return (
            <span key={i} className={`part ${p.role ? `role ${p.role}` : ''}`} style={p.role ? { animationDelay: `${delay}s` } : undefined}>
              {p.text}
            </span>
          );
        })}
      </div>
      {showLegend && (
        <div className="legend">
          {(['subject', 'word', 'compared'] as const).map((r, i) => (
            <span key={r} style={{ animationDelay: `${0.2 + i * 0.35}s` }}>
              <b style={{ background: `var(--${r})` }} />
              {labels[r]}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

/** Scrolls newly revealed content into view so the class never misses it below the fold. */
function ScrollHere() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => ref.current?.scrollIntoView({ block: 'nearest' }), 80);
    return () => clearTimeout(id);
  }, []);
  return <span ref={ref} style={{ display: 'block', height: 1 }} />;
}

/** Render content text: *word* is emphasised, [word] is highlighted. */
function Marked({ text }: { text: string }) {
  const bits = text.split(/(\*[^*]+\*|\[[^\]]+\])/);
  return (
    <>
      {bits.map((b, i) =>
        b.startsWith('*') ? <em key={i}>{b.slice(1, -1)}</em> : b.startsWith('[') ? <span key={i} className="hl-word">{b.slice(1, -1)}</span> : <Fragment key={i}>{b}</Fragment>,
      )}
    </>
  );
}

// ------------------------------------------------------------------ stages

function Discover() {
  const d = useGame((s) => activeLesson(s).discover);
  const dispatch = useGame((s) => s.dispatch);
  const c = useGame(activeContent).discover;
  const card = (which: 'A' | 'B', text: string) => {
    const revealed = which === 'A' ? d.revealedA : d.revealedB;
    const label = which === 'A' ? c.labelA : c.labelB;
    const ask = which === 'A' ? c.askA : c.askB;
    if (!revealed)
      return (
        <button className="btn reveal-btn" onClick={() => dispatch({ type: 'REVEAL_DESCRIPTION', which })}>
          Reveal {label.toLowerCase()}
        </button>
      );
    return (
      <div className={`card clickable ${d.active === which ? 'active' : ''}`} onClick={() => dispatch({ type: 'REVEAL_DESCRIPTION', which })} title="Show this again">
        <div className="tag">{label}</div>
        <div className="quote">“{text}”</div>
        {ask && <div className="discuss" style={{ margin: '10px 0 0', fontSize: 21 }}>{ask}</div>}
      </div>
    );
  };
  return (
    <>
      <p className="lead">{c.intro}</p>
      {card('A', c.descriptionA)}
      {card('B', c.descriptionB)}
      {d.revealedA && d.revealedB && (
        <>
          {!d.questionsShown ? (
            <button className="btn quiet" onClick={() => dispatch({ type: 'SHOW_DISCOVER_QUESTIONS' })}>
              Show discussion questions
            </button>
          ) : (
            <>
              <div className="discuss">Talk with a partner</div>
              <ol className="questions">
                {c.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
              <ScrollHere />
            </>
          )}
        </>
      )}
    </>
  );
}

function Learn() {
  const step = useGame((s) => activeLesson(s).learnStep);
  const st = useGame(activeContent).learn.steps[step];
  switch (st.id) {
    case 'term':
      return (
        <>
          <div className="term">{st.term}</div>
          <p className="definition">
            <Marked text={st.body ?? ''} />
          </p>
        </>
      );
    case 'why':
      return (
        <>
          <p className="lead">{st.body}</p>
          {st.tryIt && (
            <div className="effect">
              <strong>Try it</strong>
              {st.tryIt}
            </div>
          )}
        </>
      );
    case 'compare':
      return (
        <>
          {st.rows?.map((row) => (
            <div key={row.label} className="compare-row">
              <div className="tag kicker">{row.label}</div>
              <Annotated parts={row.parts} showLegend={false} />
            </div>
          ))}
          <p className="lead">
            <Marked text={st.body ?? ''} />
          </p>
        </>
      );
    case 'annotate':
    case 'example2': {
      const s2 = st as { parts: AnnotatedPart[]; effect: string; question?: string };
      return (
        <>
          <Annotated parts={s2.parts} key={st.id} />
          {s2.question && <div className="discuss">{s2.question}</div>}
          <div className="effect">
            <strong>{s2.question ? 'One reading' : 'The effect'}</strong>
            {s2.effect}
          </div>
        </>
      );
    }
    case 'nonExample': {
      const s3 = st as { sentence: string; verdict: string; body: string; check: string[] };
      return (
        <>
          <div className="quote" style={{ fontSize: 42, margin: '14px 0 6px' }}>
            “{s3.sentence}”
          </div>
          <div className="stamp">{s3.verdict}</div>
          <p className="lead">{s3.body}</p>
          <ul className="checklist">
            {s3.check.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      );
    }
  }
  return null;
}

function Choice({ ch }: { ch: ChoiceChallenge }) {
  const c = useGame((s) => activeLesson(s)[ch.id]);
  const dispatch = useGame((s) => s.dispatch);
  const [showAll, setShowAll] = useState(true);
  const selected = ch.options.find((o) => o.id === c.selected);
  return (
    <>
      <p className="lead" style={{ marginTop: 6 }}>
        {ch.prompt}
      </p>
      {ch.baseSentence && <div className="base">Plain sentence: “{ch.baseSentence}”</div>}
      <div className="options">
        {ch.options.map((o) => {
          const isSel = c.selected === o.id;
          const wrong = c.wrongAttempts.includes(o.id);
          const right = c.solved && o.correct;
          const cls = right ? 'right' : isSel && !(c.checked && !o.correct) ? 'selected' : wrong ? 'wrong' : '';
          return (
            <button key={o.id} className={`option ${cls}`} disabled={c.solved} onClick={() => dispatch({ type: 'SELECT_OPTION', challenge: ch.id, optionId: o.id })}>
              <span className="letter">
                <span>{o.letter}</span>
              </span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {!c.solved && !c.checked && <div className="discuss">{ch.discussion}</div>}
      {!c.solved && (
        <div className="row-actions">
          <button className="btn primary" disabled={!c.selected || c.checked} onClick={() => dispatch({ type: 'CHECK_ANSWER', challenge: ch.id })}>
            Check the class’s answer
          </button>
        </div>
      )}
      {c.checked && selected && !c.solved && (
        <div className="feedback bad">
          <h4>{selected.verdict}</h4>
          <p>{selected.explanation}</p>
          <p className="dim" style={{ marginTop: 8, fontStyle: 'italic' }}>
            Good thinking to test it. Look again: which sentence compares two different things?
          </p>
          <ScrollHere />
        </div>
      )}
      {c.solved && selected && (
        <>
          <div className="feedback good">
            <h4>
              {c.revealedByTeacher ? 'The answer: ' : ''}
              {selected.verdict}
            </h4>
            <p>{selected.explanation}</p>
          </div>
          <div className="effect">
            <strong>Watch the room</strong>
            {ch.takeaway}
          </div>
          <ScrollHere />
          <button className="btn quiet small" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Hide' : 'Show'} why the others don’t work
          </button>
          {showAll && (
            <div className="why-list">
              {ch.options
                .filter((o) => !o.correct)
                .map((o) => (
                  <div className="row" key={o.id}>
                    <b>{o.letter}</b>
                    <div>
                      <em>{o.verdict}.</em>
                      {o.explanation}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function Prove() {
  const p = useGame((s) => activeLesson(s).prove);
  const dispatch = useGame((s) => s.dispatch);
  const c = useGame(activeContent).prove;
  const room = useGame((s) => s.room);
  const noun = room === 'gallery' ? 'metaphor' : 'simile';
  const latest = p.responses[p.responses.length - 1];
  return (
    <>
      <div className="base" style={{ fontSize: 34, color: 'var(--ink)' }}>
        “{c.baseSentence}”
      </div>
      <p className="lead" style={{ margin: '8px 0' }}>
        {c.task}
      </p>
      <div className="starters">
        {c.starters.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <form
        className="entry"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'SUBMIT_RESPONSE' });
        }}
      >
        <input
          value={p.draft}
          placeholder={`Type a student’s ${noun}…`}
          onChange={(e) => dispatch({ type: 'SET_DRAFT', text: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Student ${noun}`}
        />
        <button className="btn" type="submit" disabled={!p.draft.trim()}>
          {room === 'gallery' ? 'Give the frame its title' : 'Show in the mirror'}
        </button>
      </form>
      {latest && (
        <>
          <div className="response">
            <small>From the class</small>“{latest}”
          </div>
          <div className="criteria">
            {c.criteria.map((cr, i) => (
              <label key={cr}>
                <input type="checkbox" checked={p.criteria[i]} onChange={() => dispatch({ type: 'TOGGLE_CRITERION', index: i })} />
                {cr}
              </label>
            ))}
          </div>
          {p.responses.slice(0, -1).reverse().slice(0, 3).map((r, i) => (
            <div className="earlier" key={i}>
              <span>“{r}”</span>
              <button className="btn quiet small" onClick={() => dispatch({ type: 'REMOVE_RESPONSE', index: p.responses.length - 2 - i })}>
                Remove
              </button>
            </div>
          ))}
        </>
      )}
      {!p.questionsShown ? (
        <button className="btn quiet" onClick={() => dispatch({ type: 'SHOW_PROVE_QUESTIONS' })}>
          Show discussion questions
        </button>
      ) : (
        <>
          <ol className="questions">
            {c.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
          {!p.modelRevealed && <ScrollHere />}
        </>
      )}
      {!p.modelRevealed ? (
        <div className="row-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => dispatch({ type: 'REVEAL_MODEL' })}>
            Reveal a model answer
          </button>
        </div>
      ) : (
        <>
          <div className="tag kicker" style={{ marginTop: 18 }}>
            Model answer
          </div>
          <Annotated parts={c.modelParts} />
          <div className="effect">
            <strong>Why it works</strong>
            {c.modelExplanation}
          </div>
          <ScrollHere />
        </>
      )}
    </>
  );
}

function Complete() {
  const c = useGame(activeContent).complete;
  return (
    <>
      <div className="inscription">“{c.inscription}”</div>
      <ul className="summary">
        {c.summary.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <div className="effect" style={{ marginTop: 18 }}>
        <strong>Something has changed</strong>
        {c.nextHint}
      </div>
    </>
  );
}

export function LessonPanel() {
  const lesson = useGame(activeLesson);
  const C = useGame(activeContent);
  const room = useGame((s) => s.room);
  const keyWaiting = useGame((s) => canCollect(s.progress, KEY_FOR_ROOM[s.room]));
  const shot = useGame((s) => s.shot);
  const dispatch = useGame((s) => s.dispatch);
  const { stage, learnStep } = lesson;
  const LEARN_STEP_COUNT = C.learn.steps.length;
  const HEAD: Record<Stage, { kicker: string; title: string }> = {
    discover: { kicker: C.discover.kicker, title: C.discover.title },
    learn: { kicker: C.learn.kicker, title: '' },
    playA: { kicker: C.playA.kicker, title: C.playA.title },
    playB: { kicker: C.playB.kicker, title: C.playB.title },
    prove: { kicker: C.prove.kicker, title: C.prove.title },
    complete: { kicker: C.complete.kicker, title: C.complete.title },
  };
  const head = HEAD[stage];
  const learnTitle = stage === 'learn' ? (C.learn.steps[learnStep].title ?? '') : '';
  const side = panelSide(shot);
  const nextLabel =
    stage === 'learn' && learnStep < LEARN_STEP_COUNT - 1
      ? 'Next'
      : stage === 'discover'
        ? 'Learn the word for it'
        : stage === 'learn'
          ? 'Try a challenge'
          : stage === 'playA'
            ? 'Next challenge'
            : 'Final request';

  return (
    <aside className={`panel ${side}`} key={side}>
      <div className="panel-head">
        <Progress stage={stage} />
        <div className="kicker" style={{ marginTop: 18 }}>
          {head.kicker}
          {stage === 'learn' ? `  ·  ${learnStep + 1} of ${LEARN_STEP_COUNT}` : ''}
        </div>
        {(head.title || learnTitle) && stage !== 'learn' ? <h1 className="ptitle">{head.title}</h1> : learnTitle && learnTitle !== C.device ? <h1 className="ptitle">{learnTitle}</h1> : null}
      </div>
      <div className="panel-body" key={`${stage}-${learnStep}`}>
        {stage === 'discover' && <Discover />}
        {stage === 'learn' && <Learn />}
        {stage === 'playA' && <Choice ch={C.playA} />}
        {stage === 'playB' && <Choice ch={C.playB} />}
        {stage === 'prove' && <Prove />}
        {stage === 'complete' && <Complete />}
      </div>
      <div className="panel-foot">
        <div style={{ display: 'flex', gap: 10 }}>
          {stage !== 'discover' && stage !== 'complete' && (
            <button className="btn quiet" onClick={() => dispatch({ type: 'BACK' })}>
              Back
            </button>
          )}
          <button className="btn quiet" onClick={closeLesson} title={`Close the lesson and walk freely. ${room === 'gallery' ? 'Look at the caretaker' : 'Use the mirror'} to come back.`}>
            Explore
          </button>
        </div>
        {stage === 'prove' ? (
          <button className="btn primary" onClick={() => dispatch({ type: 'COMPLETE' })}>
            Complete the challenge
          </button>
        ) : stage === 'complete' ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn quiet" onClick={() => dispatch({ type: 'RESET_LESSON' })}>
              Replay lesson
            </button>
            {keyWaiting ? (
              <button className="btn primary" onClick={() => goToKey(room)}>
                Go and take the key
              </button>
            ) : (
              <button className="btn primary" onClick={walkToHall}>
                Return to the hall
              </button>
            )}
          </div>
        ) : (
          <button className="btn primary" disabled={!canAdvance(lesson) && !(stage === 'learn')} onClick={() => dispatch({ type: 'NEXT' })}>
            {nextLabel}
          </button>
        )}
      </div>
    </aside>
  );
}
