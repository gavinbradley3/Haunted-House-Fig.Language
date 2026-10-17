import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { BLANK_TITLE, PAINTINGS } from '../content/paintings';
import { DECOR_PAINTINGS } from '../content/decorPaintings';
import { openLesson } from '../lesson/director';
import type { KeyId } from '../lesson/progression';
import { useGame } from '../state/store';
import { hungPaintings } from '../scene/parts/Artwork';
import { ART_IMAGES, DECOR_IMAGES, inspectionUrl, paintingUrl, type DecorId } from '../systems/paintingImages';
import { artAspect, artCanvas, type ArtId } from '../systems/paintingScenes';

const KEY_LABELS: Record<KeyId, string> = {
  mirrorKey: 'Mirror Key',
  galleryKey: 'Gallery Key',
  diningKey: 'Tiny Key',
  nurseryKey: 'Music Box Key',
  echoesKey: 'Bell Key',
  pressKey: 'Type Key',
  kitchenKey: 'Pantry Key',
  ballroomKey: 'Ballroom Key',
  studyKey: 'Scholar’s Key',
};

// ------------------------------------------------------------------ what to show

interface ViewerArt {
  /** Sharp image (native-size copy), and the in-game texture shown while it downloads. */
  src: string;
  preview?: string;
  aspect: number;
  /** CSS filter matching the canvas's current living state (the old man's fade). */
  filter?: string;
}

/** Words brushed onto the students' blank canvas, drawn like the 3D canvas does. */
function writtenCanvas(text: string): string {
  const base = artCanvas('emptyCanvas');
  const c = document.createElement('canvas');
  c.width = base.width;
  c.height = base.height;
  const g = c.getContext('2d')!;
  g.drawImage(base, 0, 0);
  if (text) {
    const W = c.width;
    const H = c.height;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const size = text.length > 40 ? 44 : 54;
    g.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
    const lines: string[] = [];
    let line = '';
    for (const w of text.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (g.measureText(t).width > W * 0.78 && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    const lh = size * 1.3;
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 6;
    g.fillStyle = 'rgba(222,208,178,0.95)';
    lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 - ((lines.length - 1) * lh) / 2 + i * lh));
  }
  return c.toDataURL('image/png');
}

function artFor(id: string): ViewerArt | null {
  const decor = DECOR_IMAGES[id as DecorId];
  if (decor) return { src: inspectionUrl(decor.file)!, preview: paintingUrl(decor.file), aspect: decor.w / decor.h };
  const info = PAINTINGS[id];
  if (!info) return null;
  const hung = hungPaintings.get(id);
  const art: ArtId = hung?.art ?? info.art;
  if (art === 'emptyCanvas') return { src: writtenCanvas(hung?.fx?.text ?? ''), aspect: artAspect('emptyCanvas') };
  const img = ART_IMAGES[art];
  if (!img) return null;
  const fade = hung?.fx?.fade ?? 0;
  const filter = fade > 0.01 ? `grayscale(${(fade * 0.8).toFixed(2)}) sepia(${(fade * 0.25).toFixed(2)}) brightness(${(1 - fade * 0.35).toFixed(2)})` : undefined;
  return { src: inspectionUrl(img.file)!, preview: paintingUrl(img.file), aspect: img.w / img.h, filter };
}

// ------------------------------------------------------------------ the viewer

const MAX_ZOOM = 4;

/**
 * Museum-style examination of a painting. The whole artwork is shown first, contain-fitted to the
 * screen at its own proportions (never cropped or stretched); the label sits beside it on wide screens
 * and beneath it on narrow ones, scrolling on its own if it is long. Zoom is optional and always
 * one click (or 0) away from the full view. Esc, E or Close return to the game exactly where you were.
 */
export function PaintingCard() {
  const id = useGame((s) => s.inspecting);
  const lessonActive = useGame((s) => s.lessonActive);
  const titleRestored = useGame((s) => s.lessons.gallery.playA.solved || s.progress.completed.gallery);
  const galleryDone = useGame((s) => s.progress.completed.gallery);
  const art = useMemo(() => (id ? artFor(id) : null), [id]);
  if (!id || lessonActive || !art) return null;
  const lesson = PAINTINGS[id];
  const decor = DECOR_PAINTINGS[id as DecorId];
  const hidden = id === 'oldManShadow' && !titleRestored;
  const title = hidden ? BLANK_TITLE : (lesson?.title ?? decor?.title ?? '');
  return (
    <Viewer key={id} art={art} title={title}>
      <div className="pv-title">{title}</div>
      <div className="pv-medium">{lesson?.medium ?? decor?.medium}</div>
      <p className="pv-note">{lesson?.note ?? decor?.note}</p>
      {lesson?.ask && !hidden && <div className="pv-ask">{lesson.ask}</div>}
      {hidden && <div className="pv-ask">The brass nameplate has been rubbed blank. What would you call it?</div>}
      {lesson?.teacherNote && <div className="pv-teacher">For the teacher: {lesson.teacherNote}</div>}
      {id === 'caretaker' && (
        <div className="pv-lesson">
          <button className="btn primary" onClick={() => openLesson('gallery')}>
            {galleryDone ? 'Revisit the metaphor lesson' : 'Begin the lesson here'}
          </button>
        </div>
      )}
    </Viewer>
  );
}

function Viewer({ art, title, children }: { art: ViewerArt; title: string; children: React.ReactNode }) {
  const close = () => useGame.getState().setInspecting(null);
  const stage = useRef<HTMLDivElement>(null!);
  const [box, setBox] = useState({ w: 0, h: 0, f: 12 });
  const [sharp, setSharp] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // Contain-fit the framed painting into the space the layout gives it.
  useLayoutEffect(() => {
    const el = stage.current;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const frame = Math.max(8, Math.min(18, Math.min(r.width, r.height) * 0.018));
      const aw = r.width - frame * 2;
      const ah = r.height - frame * 2;
      const w = Math.max(40, Math.min(aw, ah * art.aspect));
      setBox({ w, h: w / art.aspect, f: frame });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [art.aspect]);

  useEffect(() => closeBtn.current?.focus(), []);

  const clampPan = useCallback(
    (p: { x: number; y: number }, z: number) => {
      const mx = (box.w * (z - 1)) / 2;
      const my = (box.h * (z - 1)) / 2;
      return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
    },
    [box],
  );
  const setZoomAt = useCallback(
    (z: number, cx = 0, cy = 0) => {
      const nz = Math.max(1, Math.min(MAX_ZOOM, z));
      // keep the point under the cursor (cx, cy from the canvas centre) where it is
      setPan((p) => clampPan({ x: cx - ((cx - p.x) * nz) / zoom, y: cy - ((cy - p.y) * nz) / zoom }, nz));
      setZoom(nz);
    },
    [zoom, clampPan],
  );
  const fit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') setZoomAt(zoom * 1.5);
      else if (e.key === '-' || e.key === '_') setZoomAt(zoom / 1.5);
      else if (e.key === '0') fit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const local = (e: { clientX: number; clientY: number }) => {
    const r = stage.current.getBoundingClientRect();
    return { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) };
  };
  const onWheel = (e: React.WheelEvent) => {
    const p = local(e);
    setZoomAt(zoom * (e.deltaY < 0 ? 1.25 : 0.8), p.x, p.y);
  };
  const onDown = (e: RPointerEvent) => {
    if (zoom <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPan(clampPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }, zoom));
  };
  const onUp = () => (drag.current = null);
  const onDouble = (e: React.MouseEvent) => {
    if (zoom > 1) fit();
    else {
      const p = local(e);
      setZoomAt(2.5, p.x, p.y);
    }
  };

  const imgStyle = { width: box.w, height: box.h, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, filter: art.filter };
  return (
    <div className="painting-viewer" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="pv-stage" ref={stage} onWheel={onWheel}>
        <div className="pv-frame" style={{ width: box.w, height: box.h, padding: box.f }}>
          <div className={`pv-canvas${zoom > 1 ? ' zoomed' : ''}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDouble}>
            {art.preview && !sharp && <img className="pv-img" src={art.preview} alt="" style={imgStyle} draggable={false} />}
            <img className={`pv-img${sharp ? '' : ' loading'}`} src={art.src} alt={title} style={imgStyle} draggable={false} onLoad={() => setSharp(true)} />
          </div>
        </div>
      </div>
      <aside className="pv-label">
        <div className="pv-text">{children}</div>
        <div className="pv-controls">
          <div className="pv-zoom" aria-label="Zoom">
            <button className="pv-zbtn" onClick={() => setZoomAt(zoom / 1.5)} disabled={zoom <= 1} aria-label="Zoom out">−</button>
            <button className="pv-zbtn fit" onClick={fit} disabled={zoom <= 1} aria-label="Show the whole painting">Whole painting</button>
            <button className="pv-zbtn" onClick={() => setZoomAt(zoom * 1.5)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
          </div>
          <button ref={closeBtn} className="btn quiet pv-close" onClick={close}>
            Close <span className="key">Esc</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------ keys found

/** A discreet row of the keys the class has found, bottom-right. Not an inventory: just a reminder. */
export function KeyRing() {
  const keys = useGame((s) => s.progress.keys);
  const phase = useGame((s) => s.phase);
  const lessonActive = useGame((s) => s.lessonActive);
  const busy = useGame((s) => !!s.cinematic || !!s.inspecting);
  const held = (Object.keys(keys) as (keyof typeof keys)[]).filter((k) => keys[k]);
  if (phase !== 'play' || lessonActive || busy || !held.length) return null;
  return (
    <div className="keyring" title="Keys found in the house">
      {held.map((k) => (
        <KeyGlyph key={k} label={KEY_LABELS[k]} />
      ))}
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
