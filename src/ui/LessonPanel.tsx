import { Fragment, useEffect, useRef, useState } from 'react';
import { ROLE_LABELS, SIMILE, type AnnotatedPart, type ChoiceChallenge } from '../content/simile';
import { canAdvance, LEARN_STEP_COUNT, STAGES, type Stage } from '../lesson/lessonMachine';
import { closeLesson, panelSide } from '../lesson/director';
import { walkToHall } from '../lesson/navigation';
import { useGame } from '../state/store';

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
  let n = 0;
  return (
    <>
      <div className="annot">
        {parts.map((p, i) => {
          const delay = p.role ? 0.4 + n++ * 0.7 : 0;
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
            <span key={r} style={{ animationDelay: `${0.4 + i * 0.7}s` }}>
              <b style={{ background: `var(--${r})` }} />
              {ROLE_LABELS[r]}
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

// ------------------------------------------------------------------ stages

function Discover() {
  const d = useGame((s) => s.lesson.discover);
  const dispatch = useGame((s) => s.dispatch);
  const c = SIMILE.discover;
  const card = (which: 'A' | 'B', text: string) => {
    const revealed = which === 'A' ? d.revealedA : d.revealedB;
    if (!revealed)
      return (
        <button className="btn reveal-btn" onClick={() => dispatch({ type: 'REVEAL_DESCRIPTION', which })}>
          Reveal description {which}
        </button>
      );
    return (
      <div className={`card clickable ${d.active === which ? 'active' : ''}`} onClick={() => dispatch({ type: 'REVEAL_DESCRIPTION', which })} title="Show this description again">
        <div className="tag">Description {which}</div>
        <div className="quote">“{text}”</div>
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
  const step = useGame((s) => s.lesson.learnStep);
  const st = SIMILE.learn.steps[step];
  switch (st.id) {
    case 'term':
      return (
        <>
          <div className="term">SIMILE</div>
          <p className="definition">
            A simile compares two <em>different</em> things using the words <span className="hl-word">like</span> or <span className="hl-word">as</span>.
          </p>
        </>
      );
    case 'why':
      return (
        <>
          <p className="lead">{'body' in st ? st.body : ''}</p>
          <div className="effect">
            <strong>Try it</strong>
            Picture “a cold room.” Now picture a room “as cold as a cellar in winter.” Which one can you feel?
          </div>
        </>
      );
    case 'annotate':
    case 'example2': {
      const s2 = st as { parts: AnnotatedPart[]; effect: string };
      return (
        <>
          <Annotated parts={s2.parts} key={st.id} />
          <div className="effect">
            <strong>The effect</strong>
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
  const c = useGame((s) => s.lesson[ch.id]);
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
  const p = useGame((s) => s.lesson.prove);
  const dispatch = useGame((s) => s.dispatch);
  const c = SIMILE.prove;
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
          placeholder="Type a student’s simile…"
          onChange={(e) => dispatch({ type: 'SET_DRAFT', text: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label="Student simile"
        />
        <button className="btn" type="submit" disabled={!p.draft.trim()}>
          Show in the mirror
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
  const c = SIMILE.complete;
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

const HEAD: Record<Stage, { kicker: string; title: string }> = {
  discover: { kicker: SIMILE.discover.kicker, title: SIMILE.discover.title },
  learn: { kicker: SIMILE.learn.kicker, title: '' },
  playA: { kicker: SIMILE.playA.kicker, title: SIMILE.playA.title },
  playB: { kicker: SIMILE.playB.kicker, title: SIMILE.playB.title },
  prove: { kicker: SIMILE.prove.kicker, title: SIMILE.prove.title },
  complete: { kicker: SIMILE.complete.kicker, title: SIMILE.complete.title },
};

export function LessonPanel() {
  const lesson = useGame((s) => s.lesson);
  const shot = useGame((s) => s.shot);
  const dispatch = useGame((s) => s.dispatch);
  const { stage, learnStep } = lesson;
  const head = HEAD[stage];
  const learnTitle = stage === 'learn' ? (SIMILE.learn.steps[learnStep].title ?? '') : '';
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
        {(head.title || learnTitle) && stage !== 'learn' ? <h1 className="ptitle">{head.title}</h1> : learnTitle && learnTitle !== 'Simile' ? <h1 className="ptitle">{learnTitle}</h1> : null}
      </div>
      <div className="panel-body" key={`${stage}-${learnStep}`}>
        {stage === 'discover' && <Discover />}
        {stage === 'learn' && <Learn />}
        {stage === 'playA' && <Choice ch={SIMILE.playA} />}
        {stage === 'playB' && <Choice ch={SIMILE.playB} />}
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
          <button className="btn quiet" onClick={closeLesson} title="Close the lesson and walk freely. Use the mirror to come back.">
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
            <button className="btn primary" onClick={walkToHall}>
              Return to the hall
            </button>
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
