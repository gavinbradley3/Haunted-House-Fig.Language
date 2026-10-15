/**
 * A small "oil painting" renderer for the mansion's artworks.
 *
 * 1. A scene function composes the picture with shapes and gradients.
 * 2. The brush pass repaints it as thousands of short strokes whose direction
 *    follows the image's edges (coarse strokes first, fine strokes where there is detail).
 * 3. Varnish, canvas weave and craquelure age it.
 *
 * Swap in real images later: anything that returns a canvas works with the painting system.
 */
import { mulberry32, vnoise, fbm } from './noise';

export type Ctx = CanvasRenderingContext2D;
type Rnd = () => number;

export interface SceneSpec {
  w: number;
  h: number;
  /** Draw the underpainting. */
  draw: (g: Ctx, w: number, h: number, rnd: Rnd) => void;
  /** Optional: brush size multiplier (1 = default). */
  brush?: number;
  /** Optional: regions to keep sharp (faces), drawn after the brush pass, softly. */
  detail?: (g: Ctx, w: number, h: number, rnd: Rnd) => void;
  seed?: number;
  /** Warmth of the aged varnish, 0..1. */
  varnish?: number;
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Render a scene spec into an aged oil-painting canvas. */
export function paint(spec: SceneSpec): HTMLCanvasElement {
  const { w, h } = spec;
  const rnd = mulberry32(spec.seed ?? 7);
  const base = makeCanvas(w, h);
  const bg = base.getContext('2d', { willReadFrequently: true })!;
  spec.draw(bg, w, h, rnd);
  const src = bg.getImageData(0, 0, w, h).data;

  // Luminance gradient on a coarse grid, used to orient strokes along edges.
  const S = 4;
  const gw = Math.ceil(w / S);
  const gh = Math.ceil(h / S);
  const lum = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const i = (Math.min(h - 1, y * S) * w + Math.min(w - 1, x * S)) * 4;
      lum[y * gw + x] = src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11;
    }
  const grad = (x: number, y: number) => {
    const gx = Math.min(gw - 2, Math.max(1, Math.floor(x / S)));
    const gy = Math.min(gh - 2, Math.max(1, Math.floor(y / S)));
    const dx = lum[gy * gw + gx + 1] - lum[gy * gw + gx - 1];
    const dy = lum[(gy + 1) * gw + gx] - lum[(gy - 1) * gw + gx];
    return { dx, dy, mag: Math.hypot(dx, dy) };
  };
  const sample = (x: number, y: number) => {
    const i = (Math.min(h - 1, Math.max(0, y | 0)) * w + Math.min(w - 1, Math.max(0, x | 0))) * 4;
    return [src[i], src[i + 1], src[i + 2]];
  };

  const out = makeCanvas(w, h);
  // CPU-backed: age() reads every pixel back, and a GPU readback stalls on slow graphics.
  const g = out.getContext('2d', { willReadFrequently: true })!;
  // Start from a softened copy so gaps between strokes read as thin paint.
  g.filter = 'blur(3px)';
  g.drawImage(base, 0, 0);
  g.filter = 'none';
  g.lineCap = 'round';

  const scale = (spec.brush ?? 1) * (w / 768);
  const passes = [
    { n: 5200, len: 26, width: 9, minMag: 0, alpha: 0.55 },
    { n: 9000, len: 14, width: 5, minMag: 0, alpha: 0.62 },
    { n: 12000, len: 7, width: 2.4, minMag: 10, alpha: 0.75 },
  ];
  for (const p of passes) {
    const n = Math.round(p.n * (w * h) / (768 * 960));
    for (let k = 0; k < n; k++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const gr = grad(x, y);
      if (gr.mag < p.minMag && rnd() > 0.15) continue;
      // Strokes run along edges (perpendicular to the gradient), with a little wobble.
      const a = gr.mag > 2 ? Math.atan2(gr.dy, gr.dx) + Math.PI / 2 + (rnd() - 0.5) * 0.35 : (rnd() - 0.5) * 0.8 + vnoise(x / 90, y / 90, 0, 0, 3) * 3;
      const len = p.len * scale * (0.6 + rnd() * 0.8) * (gr.mag > 30 ? 0.6 : 1);
      const [r, gg, b] = sample(x, y);
      const j = (rnd() - 0.5) * 14;
      g.strokeStyle = `rgba(${clamp(r + j)},${clamp(gg + j)},${clamp(b + j * 0.8)},${p.alpha})`;
      g.lineWidth = p.width * scale * (0.7 + rnd() * 0.6);
      g.beginPath();
      g.moveTo(x - (Math.cos(a) * len) / 2, y - (Math.sin(a) * len) / 2);
      g.quadraticCurveTo(x + (rnd() - 0.5) * len * 0.3, y + (rnd() - 0.5) * len * 0.3, x + (Math.cos(a) * len) / 2, y + (Math.sin(a) * len) / 2);
      g.stroke();
    }
  }
  if (spec.detail) {
    g.globalAlpha = 0.85;
    spec.detail(g, w, h, rnd);
    g.globalAlpha = 1;
  }
  age(g, w, h, spec.varnish ?? 0.55, spec.seed ?? 7);
  return out;
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Varnish yellowing, darkened edges, canvas weave and fine craquelure. */
function age(g: Ctx, w: number, h: number, varnish: number, seed: number) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const u = x / w;
      const v = y / h;
      const weave = (Math.sin(x * 1.7) * Math.sin(y * 1.7)) * 3.2;
      const crackN = Math.abs(vnoise(u * 60, v * 75, 0, 0, seed) - 0.5);
      const crack = crackN < 0.012 && vnoise(u * 7, v * 7, 0, 0, seed + 9) > 0.45 ? 0.82 : 1;
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const vign = 0.78 + 0.22 * Math.min(1, edge * 6);
      const grime = 1 - fbm(u * 3, v * 3, 3, 0, 0, seed + 4) * 0.12;
      const k = vign * crack * grime;
      // Varnish: pull toward amber, lift blacks slightly
      d[i] = clamp((d[i] * (1 + 0.04 * varnish) + 4 + weave) * k);
      d[i + 1] = clamp((d[i + 1] * (1 - 0.02 * varnish) + 3 + weave) * k);
      d[i + 2] = clamp((d[i + 2] * (1 - 0.22 * varnish) + 1 + weave) * k);
    }
  g.putImageData(img, 0, 0);
}

// ----------------------------------------------------------------- drawing helpers

export function linear(g: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}
export function radial(g: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}
export function glow(g: Ctx, x: number, y: number, r: number, color: string, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = radial(g, x, y, 0, r, [
    [0, color],
    [1, 'rgba(0,0,0,0)'],
  ]);
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}
/** Soft cloud bank made of many overlapping blurred blobs. */
export function clouds(g: Ctx, rnd: Rnd, x: number, y: number, w: number, h: number, color: string, count = 40, alpha = 0.35) {
  g.save();
  g.filter = 'blur(6px)';
  for (let i = 0; i < count; i++) {
    const cx = x + rnd() * w;
    const cy = y + rnd() * h;
    const r = (0.15 + rnd() * 0.35) * Math.min(w, h * 2);
    g.globalAlpha = alpha * (0.4 + rnd() * 0.6);
    g.fillStyle = radial(g, cx, cy, 0, r, [
      [0, color],
      [1, 'rgba(0,0,0,0)'],
    ]);
    g.beginPath();
    g.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
export function poly(g: Ctx, pts: [number, number][], fill: string | CanvasGradient) {
  g.fillStyle = fill;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
}
/** A bare tree silhouette by recursive branching. */
export function bareTree(g: Ctx, rnd: Rnd, x: number, y: number, len: number, angle: number, width: number, color: string, depth = 7) {
  if (depth <= 0 || width < 0.4) return;
  const x2 = x + Math.cos(angle) * len;
  const y2 = y + Math.sin(angle) * len;
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo((x + x2) / 2 + (rnd() - 0.5) * len * 0.2, (y + y2) / 2, x2, y2);
  g.stroke();
  const n = 2 + (rnd() < 0.3 ? 1 : 0);
  for (let i = 0; i < n; i++) bareTree(g, rnd, x2, y2, len * (0.62 + rnd() * 0.2), angle + (rnd() - 0.5) * 1.1, width * 0.66, color, depth - 1);
}
/** Rain streaks. */
export function rain(g: Ctx, rnd: Rnd, x: number, y: number, w: number, h: number, alpha = 0.12, n = 260) {
  g.save();
  g.strokeStyle = `rgba(200,210,225,${alpha})`;
  g.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const sx = x + rnd() * w;
    const sy = y + rnd() * h;
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx - 6, sy + 22 + rnd() * 18);
    g.stroke();
  }
  g.restore();
}
/** A jagged lightning bolt with a glow. */
export function lightning(g: Ctx, rnd: Rnd, x: number, y: number, len: number) {
  const pts: [number, number][] = [[x, y]];
  let cx = x;
  let cy = y;
  while (cy < y + len) {
    cx += (rnd() - 0.5) * 24;
    cy += 10 + rnd() * 18;
    pts.push([cx, cy]);
  }
  g.save();
  g.filter = 'blur(5px)';
  g.strokeStyle = 'rgba(190,210,255,0.7)';
  g.lineWidth = 8;
  g.beginPath();
  pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.stroke();
  g.filter = 'none';
  g.strokeStyle = 'rgba(245,248,255,0.95)';
  g.lineWidth = 2;
  g.beginPath();
  pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.stroke();
  g.restore();
}

/** Draw with a soft edge: fills `draw`'s path through a blur filter. */
function soft(g: Ctx, blur: number, fn: () => void) {
  g.save();
  g.filter = `blur(${Math.max(0.1, blur)}px)`;
  fn();
  g.restore();
}
function blob(g: Ctx, x: number, y: number, rx: number, ry: number, color: string, blur: number, rot = 0) {
  soft(g, blur, () => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
    g.fill();
  });
}

export interface HeadOpts {
  light?: -1 | 1;
  skin?: string;
  shadow?: string;
  hair?: string;
  coat?: string;
  stern?: number;
  turn?: number;
  female?: boolean;
  lightColor?: string;
  /** Grey/white hair is drawn in finer, lighter strands. */
  old?: boolean;
}

/**
 * A chiaroscuro head and shoulders in the manner of an old portrait: the face is
 * modelled from soft planes of light and shadow rather than outlined.
 * (cx, cy) is the centre of the face; s is roughly the face height in px.
 */
export function portraitHead(g: Ctx, cx: number, cy: number, s: number, o: HeadOpts) {
  const L = o.light ?? -1; // which side the light comes from
  const turn = o.turn ?? 0;
  const skin = o.skin ?? '#c9a184';
  const dark = o.shadow ?? '#2a1a12';
  const lite = o.lightColor ?? mix(skin, '#f4e6d4', 0.35);
  const hair = o.hair ?? '#2a221a';
  const fw = s * 0.34;
  const fh = s * 0.47;
  const fx = cx + turn * fw * 0.18;
  const coat = o.coat ?? '#14110e';

  // ---- shoulders and coat: sloping shoulders, arms falling at the sides
  const sh = cy + fh * 1.25;
  const sw = fw * (o.female ? 2.05 : 2.45);
  g.fillStyle = coat;
  g.beginPath();
  g.moveTo(cx - fw * 0.42, cy + fh * 0.8);
  g.bezierCurveTo(cx - fw * 0.55, sh - fh * 0.15, cx - sw * 0.75, sh - fh * 0.05, cx - sw, sh + fh * 0.55);
  if (o.female) {
    // Fitted bodice narrowing to the waist, then a full skirt
    g.bezierCurveTo(cx - sw * 1.0, sh + fh * 1.6, cx - sw * 0.62, cy + s * 1.35, cx - sw * 0.6, cy + s * 1.6);
    g.bezierCurveTo(cx - sw * 0.9, cy + s * 2.0, cx - sw * 1.5, cy + s * 2.6, cx - sw * 1.9, cy + s * 5);
    g.lineTo(cx + sw * 1.9, cy + s * 5);
    g.bezierCurveTo(cx + sw * 1.5, cy + s * 2.6, cx + sw * 0.9, cy + s * 2.0, cx + sw * 0.6, cy + s * 1.6);
    g.bezierCurveTo(cx + sw * 0.62, cy + s * 1.35, cx + sw * 1.0, sh + fh * 1.6, cx + sw, sh + fh * 0.55);
  } else {
    g.bezierCurveTo(cx - sw * 1.08, sh + fh * 1.4, cx - sw * 1.05, cy + s * 2.4, cx - sw * 1.12, cy + s * 5);
    g.lineTo(cx + sw * 1.12, cy + s * 5);
    g.bezierCurveTo(cx + sw * 1.05, cy + s * 2.4, cx + sw * 1.08, sh + fh * 1.4, cx + sw, sh + fh * 0.55);
  }
  g.bezierCurveTo(cx + sw * 0.75, sh - fh * 0.05, cx + fw * 0.55, sh - fh * 0.15, cx + fw * 0.42, cy + fh * 0.8);
  g.closePath();
  g.fill();
  // Volume: the far side and the arms turn into shadow
  g.save();
  g.clip();
  blob(g, cx - L * sw * 0.95, sh + fh * 2.2, sw * 0.5, fh * 2.6, mix(coat, '#000000', 0.6), fw * 0.5);
  blob(g, cx + L * sw * 0.72, sh + fh * 2.0, sw * 0.08, fh * 2.2, mix(coat, '#000000', 0.5), fw * 0.18);
  blob(g, cx - L * sw * 0.68, sh + fh * 2.0, sw * 0.08, fh * 2.2, mix(coat, '#000000', 0.5), fw * 0.18);
  blob(g, cx + L * sw * 0.35, sh + fh * 1.4, sw * 0.35, fh * 1.2, mix(coat, lite, 0.1), fw * 0.6);
  g.restore();
  // Light catching the near shoulder
  blob(g, cx + L * sw * 0.78, sh + fh * 0.25, fw * 0.75, fh * 0.28, mix(coat, lite, 0.22), fw * 0.35, L * 0.4);
  // Neck, with the chin's shadow falling across it
  g.fillStyle = mix(skin, dark, 0.35);
  g.beginPath();
  g.moveTo(cx - fw * 0.45, cy + fh * 0.6);
  g.lineTo(cx + fw * 0.45, cy + fh * 0.6);
  g.lineTo(cx + fw * 0.5, sh + fh * 0.05);
  g.lineTo(cx - fw * 0.5, sh + fh * 0.05);
  g.fill();
  blob(g, cx + L * fw * 0.2, cy + fh * 1.05, fw * 0.25, fh * 0.25, lite, fw * 0.2);
  blob(g, cx, cy + fh * 0.85, fw * 0.55, fh * 0.16, dark, fw * 0.12);
  if (o.female) {
    // Low neckline of a dark dress
    g.fillStyle = mix(skin, dark, 0.15);
    g.beginPath();
    g.ellipse(cx, sh + fh * 0.15, fw * 1.0, fh * 0.32, 0, 0, Math.PI);
    g.fill();
    blob(g, cx + L * fw * 0.35, sh + fh * 0.12, fw * 0.4, fh * 0.12, lite, fw * 0.25);
  } else {
    // Shirt collar, dark cravat and coat lapels
    poly(g, [
      [cx - fw * 0.5, cy + fh * 1.0],
      [cx, sh + fh * 0.32],
      [cx + fw * 0.5, cy + fh * 1.0],
      [cx + fw * 0.6, sh + fh * 0.2],
      [cx, sh + fh * 0.75],
      [cx - fw * 0.6, sh + fh * 0.2],
    ], mix('#cfc4ac', dark, 0.25));
    blob(g, cx + L * fw * 0.3, cy + fh * 1.15, fw * 0.25, fh * 0.14, '#e8e0cc', fw * 0.08);
    poly(g, [
      [cx - fw * 0.18, sh + fh * 0.12],
      [cx + fw * 0.18, sh + fh * 0.12],
      [cx + fw * 0.08, sh + fh * 0.9],
      [cx - fw * 0.08, sh + fh * 0.9],
    ], '#0d0b0a');
    g.strokeStyle = mix(coat, lite, 0.18);
    g.lineWidth = fw * 0.05;
    g.beginPath();
    g.moveTo(cx - fw * 0.7, sh + fh * 0.1);
    g.lineTo(cx - fw * 0.15, sh + fh * 1.7);
    g.moveTo(cx + fw * 0.7, sh + fh * 0.1);
    g.lineTo(cx + fw * 0.15, sh + fh * 1.7);
    g.stroke();
  }

  // ---- hair behind the head (women: falls to the shoulders)
  if (o.female) {
    blob(g, fx, cy + fh * 0.1, fw * 1.35, fh * 1.25, hair, fw * 0.08);
  }

  // ---- the head: an egg, narrower at the chin
  const head = new Path2D();
  head.moveTo(fx, cy - fh);
  head.bezierCurveTo(fx + fw * 1.05, cy - fh, fx + fw * 1.02, cy + fh * 0.25, fx + fw * 0.55, cy + fh * 0.78);
  head.quadraticCurveTo(fx, cy + fh * 1.08, fx - fw * 0.55, cy + fh * 0.78);
  head.bezierCurveTo(fx - fw * 1.02, cy + fh * 0.25, fx - fw * 1.05, cy - fh, fx, cy - fh);
  g.fillStyle = skin;
  g.fill(head);
  g.save();
  g.clip(head);
  // Shadow side, falling off softly across the face
  blob(g, fx - L * fw * 0.95, cy + fh * 0.1, fw * 0.75, fh * 1.25, dark, fw * 0.45);
  blob(g, fx - L * fw * 0.55, cy + fh * 0.2, fw * 0.4, fh * 0.9, mix(skin, dark, 0.55), fw * 0.35);
  // Light: forehead, cheekbone, bridge of the nose
  blob(g, fx + L * fw * 0.3, cy - fh * 0.55, fw * 0.55, fh * 0.28, lite, fw * 0.3);
  blob(g, fx + L * fw * 0.5, cy + fh * 0.12, fw * 0.32, fh * 0.22, lite, fw * 0.25);
  blob(g, fx + L * fw * 0.04, cy - fh * 0.05, fw * 0.08, fh * 0.3, lite, fw * 0.06);
  // Eye sockets: soft hollows under the brow ridge
  const eyY = cy - fh * 0.13;
  const eyX = fw * 0.4;
  for (const sd of [-1, 1]) {
    const ex = fx + sd * eyX + turn * fw * 0.08;
    const far = sd === -L;
    blob(g, ex, eyY, fw * 0.26, fh * 0.13, mix(skin, dark, far ? 0.8 : 0.55), fw * 0.1);
    // The eye itself: dim white, a dark iris, the faintest catchlight
    g.fillStyle = far ? mix('#9a8f80', dark, 0.5) : '#b7ab98';
    g.beginPath();
    g.ellipse(ex, eyY + fh * 0.01, fw * 0.14, fh * 0.042, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a120c';
    g.beginPath();
    g.arc(ex + turn * fw * 0.05, eyY + fh * 0.01, fw * 0.06, 0, Math.PI * 2);
    g.fill();
    // Upper lid line
    g.strokeStyle = 'rgba(30,18,12,0.85)';
    g.lineWidth = fw * 0.035;
    g.beginPath();
    g.moveTo(ex - fw * 0.16, eyY + fh * 0.01);
    g.quadraticCurveTo(ex, eyY - fh * 0.05, ex + fw * 0.16, eyY + fh * 0.005);
    g.stroke();
    if (!far) {
      g.fillStyle = 'rgba(245,240,230,0.75)';
      g.beginPath();
      g.arc(ex + L * fw * 0.025 + turn * fw * 0.05, eyY - fh * 0.005, fw * 0.016, 0, Math.PI * 2);
      g.fill();
    }
    // Brows: a stern sitter's inner ends pull down toward the nose
    const stern = o.stern ?? 0;
    soft(g, fw * 0.02, () => {
      g.strokeStyle = o.old ? mix(hair, dark, 0.3) : mix(hair, dark, 0.2);
      g.lineWidth = fw * (o.female ? 0.05 : 0.085);
      g.beginPath();
      g.moveTo(ex + sd * fw * 0.24, eyY - fh * 0.11);
      g.quadraticCurveTo(ex, eyY - fh * (0.17 - stern * 0.03), ex - sd * fw * 0.2, eyY - fh * (0.11 - stern * 0.05));
      g.stroke();
    });
  }
  // Nose: shadow on the far side, a lit tip, nostrils, the shadow beneath
  const nY = cy + fh * 0.28;
  blob(g, fx - L * fw * 0.12, cy + fh * 0.08, fw * 0.07, fh * 0.24, mix(skin, dark, 0.6), fw * 0.05);
  blob(g, fx + L * fw * 0.03, nY - fh * 0.03, fw * 0.08, fh * 0.06, lite, fw * 0.04);
  blob(g, fx - fw * 0.08, nY + fh * 0.03, fw * 0.04, fh * 0.02, '#2a160e', fw * 0.02);
  blob(g, fx + fw * 0.08, nY + fh * 0.03, fw * 0.04, fh * 0.02, '#2a160e', fw * 0.02);
  blob(g, fx - L * fw * 0.05, nY + fh * 0.09, fw * 0.16, fh * 0.035, mix(skin, dark, 0.6), fw * 0.05);
  // Mouth: no smile; a line between the lips, a darker upper lip, a lit lower lip
  const mY = cy + fh * 0.5;
  const mw = fw * (o.female ? 0.3 : 0.34);
  blob(g, fx, mY - fh * 0.03, mw, fh * 0.035, o.female ? '#8a4a40' : mix(skin, dark, 0.5), fw * 0.03);
  blob(g, fx + L * fw * 0.04, mY + fh * 0.05, mw * 0.75, fh * 0.035, o.female ? '#b0675a' : mix(skin, lite, 0.3), fw * 0.03);
  soft(g, fw * 0.015, () => {
    g.strokeStyle = '#2a120c';
    g.lineWidth = fw * 0.03;
    g.beginPath();
    g.moveTo(fx - mw, mY + (o.stern ? fh * 0.015 : 0));
    g.quadraticCurveTo(fx, mY - fh * 0.005, fx + mw, mY + (o.stern ? fh * 0.015 : 0));
    g.stroke();
  });
  // Chin light and jaw shadow
  blob(g, fx + L * fw * 0.1, cy + fh * 0.75, fw * 0.2, fh * 0.1, lite, fw * 0.1);
  blob(g, fx - L * fw * 0.5, cy + fh * 0.7, fw * 0.4, fh * 0.2, dark, fw * 0.15);
  if (o.old) {
    // Lines of age: brow furrows and the fold from nose to mouth
    g.strokeStyle = 'rgba(60,35,25,0.35)';
    g.lineWidth = fw * 0.02;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(fx - fw * 0.4, cy - fh * (0.48 + i * 0.07));
      g.quadraticCurveTo(fx, cy - fh * (0.52 + i * 0.07), fx + fw * 0.4, cy - fh * (0.48 + i * 0.07));
      g.stroke();
    }
    g.beginPath();
    g.moveTo(fx + L * fw * 0.22, nY);
    g.quadraticCurveTo(fx + L * fw * 0.36, mY - fh * 0.05, fx + L * fw * 0.3, mY + fh * 0.12);
    g.stroke();
  }
  g.restore();

  // ---- hair on top: a mass with strands catching the light
  const strand = (x0: number, y0: number, x1: number, y1: number, bend: number, col: string, wdt: number) => {
    g.strokeStyle = col;
    g.lineWidth = wdt;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2 - Math.abs(bend) * 0.5, x1, y1);
    g.stroke();
  };
  g.save();
  g.lineCap = 'round';
  if (o.female) {
    blob(g, fx, cy - fh * 0.78, fw * 1.05, fh * 0.42, hair, fw * 0.05);
    blob(g, fx, cy - fh * 1.15, fw * 0.5, fh * 0.28, hair, fw * 0.05);
    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const side = t < 0.5 ? -1 : 1;
      const a = (t < 0.5 ? t : t - 0.5) * 2;
      strand(fx, cy - fh * 0.95, fx + side * fw * (0.5 + a * 0.6), cy - fh * (0.1 + a * 0.4), side * fw * 0.3, side === L ? mix(hair, lite, 0.35) : mix(hair, '#000000', 0.2), fw * 0.025);
    }
  } else {
    const top = mix(hair, o.old ? '#d8d2c6' : hair, 0.5);
    blob(g, fx, cy - fh * 0.82, fw * 1.02, fh * 0.32, hair, fw * 0.05);
    blob(g, fx - fw * 0.95, cy - fh * 0.2, fw * 0.14, fh * 0.42, hair, fw * 0.06);
    blob(g, fx + fw * 0.95, cy - fh * 0.2, fw * 0.14, fh * 0.42, hair, fw * 0.06);
    for (let i = 0; i < 90; i++) {
      const t = i / 90;
      const x0 = fx + (t - 0.5) * fw * 1.6;
      strand(x0, cy - fh * 1.0, x0 + (t - 0.5) * fw * 0.9, cy - fh * (0.55 - Math.abs(t - 0.5) * 0.5), fw * 0.15, (t - 0.5) * L > 0 ? mix(top, lite, 0.4) : mix(hair, '#000000', 0.25), fw * (o.old ? 0.018 : 0.025));
    }
  }
  g.restore();
}

export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const gg = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bb = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((1 << 24) | (r << 16) | (gg << 8) | bb).toString(16).slice(1)}`;
}

/** One-point perspective room: returns helpers for placing things on the floor. */
export function perspectiveRoom(g: Ctx, w: number, h: number, opts: { vx: number; vy: number; back: [number, number, number, number]; wall: string; floor: string; ceiling: string; backWall: string }) {
  const [bx0, by0, bx1, by1] = opts.back;
  poly(g, [
    [0, 0],
    [w, 0],
    [bx1, by0],
    [bx0, by0],
  ], opts.ceiling);
  poly(g, [
    [0, h],
    [w, h],
    [bx1, by1],
    [bx0, by1],
  ], opts.floor);
  poly(g, [
    [0, 0],
    [bx0, by0],
    [bx0, by1],
    [0, h],
  ], opts.wall);
  poly(g, [
    [w, 0],
    [bx1, by0],
    [bx1, by1],
    [w, h],
  ], opts.wall);
  poly(g, [
    [bx0, by0],
    [bx1, by0],
    [bx1, by1],
    [bx0, by1],
  ], opts.backWall);
}
