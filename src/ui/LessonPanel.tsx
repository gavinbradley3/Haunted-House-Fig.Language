import { Fragment, useEffect, useRef, useState } from 'react';
import { ROLE_LABELS, type AnnotatedPart, type ChoiceChallenge, type Role } from '../content/types';
import { canAdvance, evaluateBuild, itemState, masteryMet, STAGES, type Stage } from '../lesson/lessonMachine';
import { playCue } from '../systems/soundCues';
import { closeLesson, goToKey, panelSide, ROOM_PLACES } from '../lesson/director';
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
          {(['subject', 'word', 'compared'] as const).filter((r) => labels[r] && parts.some((p) => p.role === r)).map((r, i) => (
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
            Good thinking to test it. {ch.retryHint ?? 'Look again: which sentence compares two different things?'}
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

/** Fill a sentence's ___ blank with the chosen words (or leave a visible gap). */
function filled(text: string, chosen: string | null) {
  if (!text.includes('___')) return <>{text}</>;
  const [a, b] = text.split('___');
  return (
    <>
      {a}
      <span className={chosen ? 'blank filled' : 'blank'}>{chosen ?? '______'}</span>
      {b}
    </>
  );
}

/**
 * A multi-part challenge: the class works through each item (a place card, a toy, a phrase
 * of a letter) in turn. One item is open at a time so the panel stays readable on a projector.
 */
/** Evidence the class has opened, per room and item (kept while the game runs). */
const openedEvidence = new Set<string>();

function Items({ ch }: { ch: ChoiceChallenge }) {
  const c = useGame((s) => activeLesson(s)[ch.id]);
  const room = useGame((s) => s.room);
  const dispatch = useGame((s) => s.dispatch);
  const [, rerender] = useState(0);
  const evidenceOpen = (id: string) => openedEvidence.has(`${room}:${id}`) || itemState(c, id).solved;
  const openEvidence = (id: string) => {
    openedEvidence.add(`${room}:${id}`);
    // The book on the desk opens too (and the caption says so).
    playCue(`evidence:${id}`);
    rerender((n) => n + 1);
  };
  const items = ch.items ?? [];
  const firstOpen = items.find((it) => !itemState(c, it.id).solved)?.id ?? null;
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId && !itemState(c, openId).solved ? openId : firstOpen;
  const done = items.filter((it) => itemState(c, it.id).solved).length;
  return (
    <>
      <p className="lead" style={{ marginTop: 6 }}>
        {ch.prompt}
      </p>
      <div className="items-count">
        {done} of {items.length} done
      </div>
      {items.map((it, n) => {
        const st = itemState(c, it.id);
        const sel = it.options.find((o) => o.id === st.selected) ?? null;
        const expanded = it.id === open;
        const shown = st.solved || (st.checked && sel) ? sel : expanded ? sel : null;
        return (
          <div key={it.id} className={`item ${expanded ? 'open' : ''} ${st.solved ? 'solved' : ''}`}>
            <button className="item-head" onClick={() => setOpenId(it.id)} disabled={st.solved}>
              <span className="item-num">{st.solved ? '✓' : n + 1}</span>
              <span className="item-text">
                {it.source && <small>{it.source}</small>}
                {it.text.endsWith('?') ? it.text : <>“{filled(it.text, it.text.includes('___') ? (shown?.text ?? null) : null)}”</>}
              </span>
              {st.solved && sel && <span className="item-verdict">{sel.verdict}</span>}
            </button>
            {expanded && (
              <div className="item-body">
                <ScrollHere key={it.id} />
                {it.sound && (
                  <div className="item-sound">
                    <button className="btn small" onClick={() => playCue(it.sound!)}>
                      ▶ Play the sound
                    </button>
                    {it.caption && <span className="item-caption">Caption: {it.caption}</span>}
                  </div>
                )}
                {it.evidence && !evidenceOpen(it.id) && (
                  <div className="item-sound">
                    <button className="btn small primary" onClick={() => openEvidence(it.id)}>
                      Open the book: read the evidence
                    </button>
                  </div>
                )}
                {it.evidence && evidenceOpen(it.id) && (
                  <div className="evidence">
                    <strong>{it.evidence.title}</strong>
                    {it.evidence.text}
                  </div>
                )}
                {/* Investigation first: in Challenge A the answers appear once the evidence has been read. */}
                {(!it.evidence || evidenceOpen(it.id) || ch.id === 'playB') && (
                <div className="item-options">
                  {it.options.map((o) => {
                    const isSel = st.selected === o.id;
                    const wrong = st.wrongAttempts.includes(o.id);
                    const cls = isSel && !(st.checked && !o.correct) ? 'selected' : wrong ? 'wrong' : '';
                    return (
                      <button key={o.id} className={`option compact ${cls}`} onClick={() => dispatch({ type: 'SELECT_ITEM_OPTION', challenge: ch.id, itemId: it.id, optionId: o.id })}>
                        <span className="letter">
                          <span>{o.letter}</span>
                        </span>
                        <span>{o.text}</span>
                      </button>
                    );
                  })}
                </div>
                )}
                <button className="btn primary small" disabled={!st.selected || st.checked} onClick={() => dispatch({ type: 'CHECK_ITEM', challenge: ch.id, itemId: it.id })}>
                  Check the class’s answer
                </button>
                {st.checked && sel && !st.solved && (
                  <div className="feedback bad">
                    <h4>{sel.verdict}</h4>
                    <p>{sel.explanation}</p>
                    <p className="dim" style={{ marginTop: 8, fontStyle: 'italic' }}>
                      {ch.retryHint ?? 'Look again.'}
                    </p>
                    <ScrollHere />
                  </div>
                )}
              </div>
            )}
            {/* Only the item just answered keeps its explanation, so the next one stays in view. */}
            {st.solved && sel && (c.activeItem === it.id || c.solved) && (
              <div className="item-why">
                {st.revealedByTeacher ? 'The answer: ' : ''}
                {sel.explanation}
              </div>
            )}
          </div>
        );
      })}
      {!c.solved && <div className="discuss">{ch.discussion}</div>}
      {c.solved && (
        <>
          <div className="effect">
            <strong>Watch the room</strong>
            {ch.takeaway}
          </div>
          <ScrollHere />
        </>
      )}
    </>
  );
}

/**
 * Phrase building: one word from each tray of type. After every check the panel shows each
 * word's beginning SOUND, so the class sees why a phrase does or does not alliterate.
 */
function Build({ ch }: { ch: ChoiceChallenge }) {
  const c = useGame((s) => activeLesson(s)[ch.id]);
  const dispatch = useGame((s) => s.dispatch);
  const spec = ch.build!;
  const chosen = spec.trays.map((t, i) => t.tiles.find((x) => x.id === c.build[i]) ?? null);
  const verdict = evaluateBuild(spec, c.build);
  const complete = chosen.every(Boolean);
  const sounds = (
    <div className="sounds">
      Beginning sounds:{' '}
      {chosen.map((t, i) => (
        <Fragment key={i}>
          {i > 0 && ' · '}
          {t?.text} <b>/{t?.sound}/</b>
        </Fragment>
      ))}
    </div>
  );
  return (
    <>
      <p className="lead" style={{ marginTop: 6 }}>
        {ch.prompt}
      </p>
      <div className="build-preview" aria-live="polite">
        {chosen.map((t, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            {t ? t.text : <span className="gap">____</span>}
          </Fragment>
        ))}
      </div>
      {spec.trays.map((tray, ti) => (
        <div className="tray" key={tray.label}>
          <small>{tray.label}</small>
          <div className="tray-tiles">
            {tray.tiles.map((tile) => (
              <button key={tile.id} className={`tile ${c.build[ti] === tile.id ? 'on' : ''}`} disabled={c.solved} onClick={() => dispatch({ type: 'SET_BUILD', challenge: ch.id, tray: ti, tileId: tile.id })}>
                {tile.text}
              </button>
            ))}
          </div>
        </div>
      ))}
      {!c.solved && <div className="discuss">{ch.discussion}</div>}
      {!c.solved && (
        <div className="row-actions">
          <button className="btn primary" disabled={!complete || c.checked} onClick={() => dispatch({ type: 'CHECK_BUILD', challenge: ch.id })}>
            Check the headline
          </button>
        </div>
      )}
      {c.checked && !c.solved && !verdict.ok && (
        <div className="feedback bad">
          <h4>{verdict.reason === 'nonsense' ? 'It alliterates, but it makes no sense' : verdict.reason === 'letterOnly' ? 'Same letter, different sounds' : 'No repeated sound'}</h4>
          <p>{verdict.detail}</p>
          {sounds}
          <p className="dim" style={{ marginTop: 8, fontStyle: 'italic' }}>
            {ch.retryHint}
          </p>
          <ScrollHere />
        </div>
      )}
      {c.solved && verdict.ok && (
        <>
          <div className="feedback good">
            <h4>{c.revealedByTeacher ? 'One headline that works' : 'Set in type'}</h4>
            <p>It repeats the beginning “{verdict.sound}” sound, and the words make sense together.</p>
            {sounds}
          </div>
          <div className="effect">
            <strong>Watch the room</strong>
            {ch.takeaway}
          </div>
          <ScrollHere />
        </>
      )}
    </>
  );
}

/** The right view for a challenge: phrase building, several items, or one question. */
function Challenge({ ch }: { ch: ChoiceChallenge }) {
  if (ch.build) return <Build ch={ch} />;
  if (ch.items?.length) return <Items ch={ch} />;
  return <Choice ch={ch} />;
}

function Prove() {
  const p = useGame((s) => activeLesson(s).prove);
  const dispatch = useGame((s) => s.dispatch);
  const content = useGame(activeContent);
  const c = content.prove;
  const room = useGame((s) => s.room);
  const noun = content.proveNoun ?? (room === 'gallery' ? 'metaphor' : 'simile');
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
          {content.proveButton ?? (room === 'gallery' ? 'Give the frame its title' : 'Show in the mirror')}
        </button>
      </form>
      {content.requireMastery && !latest && <p className="mastery-note">To finish this room, add the class’s own sentence and tick every success criterion for it.</p>}
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
          {content.requireMastery && !p.criteria.every(Boolean) && <p className="mastery-note">To finish this room, tick every success criterion for the class’s sentence.</p>}
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
        {stage === 'playA' && <Challenge ch={C.playA} />}
        {stage === 'playB' && <Challenge ch={C.playB} />}
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
          <button className="btn quiet" onClick={closeLesson} title={`Close the lesson and walk freely. ${ROOM_PLACES[room].hint} to come back.`}>
            Explore
          </button>
        </div>
        {stage === 'prove' ? (
          <button
            className="btn primary"
            disabled={!!C.requireMastery && !masteryMet(lesson)}
            title={C.requireMastery && !masteryMet(lesson) ? 'Add a class sentence and tick every success criterion first.' : undefined}
            onClick={() => dispatch({ type: 'COMPLETE' })}
          >
            Complete the challenge
          </button>
        ) : stage === 'complete' ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn quiet" onClick={() => dispatch({ type: 'RESET_LESSON' })}>
              Replay lesson
            </button>
            {room === 'finale' ? (
              <button className="btn primary" onClick={() => useGame.getState().setEndingOpen(true)}>
                Finish the night
              </button>
            ) : keyWaiting ? (
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
