/**
 * "Her thoughts were a swarm of trapped moths": when the class picks the metaphor,
 * the moths burst out of the portrait and flutter past the viewer for a couple of
 * seconds. Drawn on a 2D canvas over the 3D view but under the lesson panel, so the
 * text is never covered. Skipped entirely for reduced motion.
 */
import { useEffect, useRef } from 'react';

const FRAMES = 6;
const SPRITE = 160;

/** Where the swarm starts (screen fractions) and when it was released. */
const swarm = { x: 0.7, y: 0.4, start: -1 };

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Release the swarm from a point on screen (0..1 across and down). */
export function releaseMoths(x: number, y: number) {
  if (reducedMotion()) return false;
  swarm.x = Math.min(0.95, Math.max(0.05, x));
  swarm.y = Math.min(0.95, Math.max(0.05, y));
  swarm.start = performance.now();
  window.dispatchEvent(new Event('hosl-moths'));
  return true;
}

/** A dusty, ragged moth seen from above, with its wings at one point in a beat. */
function drawMoth(g: CanvasRenderingContext2D, open: number, seed: number) {
  const c = SPRITE / 2;
  g.save();
  g.translate(c, c);
  for (const side of [-1, 1]) {
    g.save();
    g.scale(side * (0.18 + 0.82 * open), 1);
    // Forewing: a ragged triangle with a pale band and a dark eye spot
    g.beginPath();
    g.moveTo(4, -6);
    // Swept back like a moth's, with a softly frayed trailing edge
    const pts = 28;
    for (let i = 0; i <= pts; i++) {
      const u = i / pts;
      const a = -0.95 + u * 1.75;
      const fray = u > 0.55 ? 0.035 * Math.sin(u * 61 + seed) : 0;
      const r = 62 * (0.88 + 0.07 * Math.sin(u * 3.1 + seed) + fray);
      g.lineTo(4 + Math.cos(a) * r, -6 + Math.sin(a) * r * 0.62);
    }
    g.closePath();
    const fw = g.createLinearGradient(0, 0, 66, -20);
    fw.addColorStop(0, '#2a2219');
    fw.addColorStop(0.55, '#3b3025');
    fw.addColorStop(0.72, '#6d5d48');
    fw.addColorStop(0.85, '#3a2f24');
    fw.addColorStop(1, '#1d1712');
    g.fillStyle = fw;
    g.fill();
    g.fillStyle = 'rgba(12,9,7,0.85)';
    g.beginPath();
    g.ellipse(34, -14, 6, 4.5, 0.3, 0, Math.PI * 2);
    g.fill();
    // Hindwing
    g.beginPath();
    g.ellipse(18, 18, 30, 20, 0.5, 0, Math.PI * 2);
    g.fillStyle = '#2f261d';
    g.fill();
    g.restore();
  }
  // Furry body
  g.fillStyle = '#1a140f';
  g.beginPath();
  g.ellipse(0, 4, 6, 26, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(30,24,18,0.9)';
  g.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(side * 2, -20);
    g.quadraticCurveTo(side * 14, -40, side * 20, -44);
    g.stroke();
  }
  g.restore();
}

let sprites: HTMLCanvasElement[] | null = null;
function getSprites() {
  if (sprites) return sprites;
  sprites = [];
  for (let f = 0; f < FRAMES; f++) {
    const c = document.createElement('canvas');
    c.width = c.height = SPRITE;
    drawMoth(c.getContext('2d')!, Math.abs(Math.cos((f / FRAMES) * Math.PI)), 3);
    sprites.push(c);
  }
  return sprites;
}

interface Moth {
  delay: number;
  life: number;
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  wobble: number;
  phase: number;
  beat: number;
  spin: number;
}

function makeSwarm(n: number): Moth[] {
  const out: Moth[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 0.6 + Math.random() * 0.9;
    out.push({
      delay: Math.random() * 0.7,
      life: 1.2 + Math.random() * 1.0,
      ox: (Math.random() - 0.5) * 0.06,
      oy: (Math.random() - 0.5) * 0.08,
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d * 0.7,
      wobble: 0.02 + Math.random() * 0.05,
      phase: Math.random() * 10,
      beat: 18 + Math.random() * 14,
      spin: (Math.random() - 0.5) * 1.4,
    });
  }
  return out;
}

const DURATION = 2.8;

export function MothSwarm() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    let moths: Moth[] = [];
    const frame = () => {
      const cv = ref.current;
      if (!cv) return;
      const t = (performance.now() - swarm.start) / 1000;
      const w = (cv.width = window.innerWidth);
      const h = (cv.height = window.innerHeight);
      const g = cv.getContext('2d')!;
      g.clearRect(0, 0, w, h);
      if (t > DURATION) return;
      const sp = getSprites();
      for (const m of moths) {
        const u = (t - m.delay) / m.life;
        if (u <= 0 || u >= 1) continue;
        // Perspective: each moth rushes from the painting toward the viewer and past.
        const near = u * u;
        const size = 14 + near * Math.min(w, h) * 0.55;
        const x = (swarm.x + m.ox + m.dx * near * 0.9 + Math.sin(t * 9 + m.phase) * m.wobble) * w;
        const y = (swarm.y + m.oy + m.dy * near * 0.9 + Math.cos(t * 7 + m.phase) * m.wobble) * h;
        const f = Math.floor((t * m.beat + m.phase) % FRAMES);
        g.save();
        g.translate(x, y);
        g.rotate(Math.atan2(m.dy, m.dx) + Math.PI / 2 + Math.sin(t * 5 + m.phase) * 0.4 + m.spin * u);
        // Close moths are out of focus and soon gone
        g.globalAlpha = Math.min(1, u * 6) * (u > 0.8 ? (1 - u) / 0.2 : 1);
        if (size > 220) g.filter = `blur(${Math.min(10, (size - 220) / 40)}px)`;
        g.drawImage(sp[f], -size / 2, -size / 2, size, size);
        g.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      moths = makeSwarm(34);
      raf = requestAnimationFrame(frame);
    };
    window.addEventListener('hosl-moths', start);
    return () => {
      window.removeEventListener('hosl-moths', start);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={ref} className="moth-swarm" aria-hidden="true" />;
}
