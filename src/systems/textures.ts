/**
 * Procedural PBR textures, generated at load time.
 *
 * Every surface texture in the game is produced here from code, so there are
 * no third-party texture licences to track. Each generator writes albedo,
 * roughness and height into a buffer; height is turned into a tangent-space
 * normal map. All tiling textures are seamless.
 */
import * as THREE from 'three';
import { TEST_BUILD } from './testBuild';
import { clamp01, fbm, hash2, lerp, mulberry32, smoothstep, vnoise } from './noise';

export type RGB = [number, number, number];
export interface PBRSet {
  map: THREE.Texture;
  roughnessMap?: THREE.Texture;
  normalMap?: THREE.Texture;
}

export const hex = (h: string): RGB => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

class Buf {
  col: Float32Array;
  rough: Float32Array;
  height: Float32Array;
  constructor(public w: number, public h: number) {
    this.col = new Float32Array(w * h * 3);
    this.rough = new Float32Array(w * h).fill(0.6);
    this.height = new Float32Array(w * h);
  }
  set(i: number, c: RGB, r: number, ht: number) {
    this.col[i * 3] = c[0];
    this.col[i * 3 + 1] = c[1];
    this.col[i * 3 + 2] = c[2];
    this.rough[i] = r;
    this.height[i] = ht;
  }
}

let anisotropy = 8;
export function setMaxAnisotropy(a: number) {
  anisotropy = Math.min(8, a);
}

function dataTex(data: Uint8Array, w: number, h: number, srgb: boolean) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = anisotropy;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function finalize(b: Buf, normalStrength = 2, withRough = true, withNormal = true): PBRSet {
  const { w, h } = b;
  const n = w * h;
  const col = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    col[i * 4] = clamp01(b.col[i * 3]) * 255;
    col[i * 4 + 1] = clamp01(b.col[i * 3 + 1]) * 255;
    col[i * 4 + 2] = clamp01(b.col[i * 3 + 2]) * 255;
    col[i * 4 + 3] = 255;
  }
  const out: PBRSet = { map: dataTex(col, w, h, true) };
  if (withRough) {
    const r = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const v = clamp01(b.rough[i]) * 255;
      r[i * 4] = r[i * 4 + 1] = r[i * 4 + 2] = v;
      r[i * 4 + 3] = 255;
    }
    out.roughnessMap = dataTex(r, w, h, false);
  }
  if (withNormal) {
    const nm = new Uint8Array(n * 4);
    const H = b.height;
    for (let y = 0; y < h; y++) {
      const yu = ((y + 1) % h) * w;
      const yd = ((y - 1 + h) % h) * w;
      for (let x = 0; x < w; x++) {
        const xr = (x + 1) % w;
        const xl = (x - 1 + w) % w;
        const dx = (H[y * w + xr] - H[y * w + xl]) * normalStrength;
        const dy = (H[yu + x] - H[yd + x]) * normalStrength;
        const len = Math.hypot(dx, dy, 1);
        const i = (y * w + x) * 4;
        nm[i] = ((-dx / len) * 0.5 + 0.5) * 255;
        nm[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
        nm[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
        nm[i + 3] = 255;
      }
    }
    out.normalMap = dataTex(nm, w, h, false);
  }
  return out;
}

/** Copy a canvas into a Buf (albedo only). */
function canvasToBuf(c: HTMLCanvasElement): Buf {
  const ctx = c.getContext('2d')!;
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  const b = new Buf(c.width, c.height);
  // Canvas rows go top-down; DataTexture rows go bottom-up. Flip so v=1 is the top.
  for (let y = 0; y < c.height; y++) {
    const sy = c.height - 1 - y;
    for (let x = 0; x < c.width; x++) {
      const si = (sy * c.width + x) * 4;
      const di = y * c.width + x;
      b.col[di * 3] = img[si] / 255;
      b.col[di * 3 + 1] = img[si + 1] / 255;
      b.col[di * 3 + 2] = img[si + 2] / 255;
    }
  }
  return b;
}

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const cache = new Map<string, unknown>();
/** Milliseconds spent generating each texture (test builds only, for start-up profiling). */
export const textureTimes = new Map<string, number>();
function once<T>(key: string, fn: () => T): T {
  if (!cache.has(key)) {
    const t0 = TEST_BUILD ? performance.now() : 0;
    cache.set(key, fn());
    if (TEST_BUILD) textureTimes.set(key, performance.now() - t0);
  }
  return cache.get(key) as T;
}

// ---------------------------------------------------------------- WOOD

export interface WoodPalette {
  dark: RGB;
  mid: RGB;
  light: RGB;
}
export const WOOD = {
  floor: { dark: hex('#2e1b0f'), mid: hex('#5c3d23'), light: hex('#8a6239') },
  walnut: { dark: hex('#1e110a'), mid: hex('#3f2717'), light: hex('#6a4429') },
  mahogany: { dark: hex('#25100a'), mid: hex('#4d2216'), light: hex('#7a3a24') },
  parquet: { dark: hex('#2a180d'), mid: hex('#553620'), light: hex('#80592f') },
} satisfies Record<string, WoodPalette>;

/**
 * Wood grain at along-grain coord `a` (period pa) and across-grain coord `c` (period pc, 0 = none).
 * Returns tone t in ~[0,1] and a height contribution.
 */
function grain(a: number, c: number, pa: number, pc: number, seed: number, ringFreq: number, warp = 2.6, contrast = 0.42) {
  const w = fbm(a, c * 1.5, 3, pa, pc ? pc * 1.5 : 0, seed);
  const w2 = fbm(a * 2, c * 0.5, 2, pa * 2, pc ? pc * 0.5 : 0, seed + 5);
  const rc = c * ringFreq + (w - 0.5) * warp * 2 + w2 * warp * 0.8;
  const ring = rc - Math.floor(rc);
  const late = smoothstep(0.5, 0.82, ring) * (1 - smoothstep(0.86, 1, ring));
  const pore = vnoise(a * 48, c * 70, pa * 48, pc ? pc * 70 : 0, seed + 9);
  const fleck = vnoise(a * 12, c * 9, pa * 12, pc ? pc * 9 : 0, seed + 13);
  let t = 0.58 + (w - 0.5) * 0.7 - late * contrast + (fleck - 0.5) * 0.12;
  if (pore < 0.22) t -= 0.1;
  return { t, height: -late * 0.25 - (pore < 0.22 ? 0.12 : 0) + w * 0.1 };
}

/** Straight boards, `planks` across the tile, staggered joints. */
export function woodPlanks(key: string, pal: WoodPalette, opts: { size?: number; planks?: number; seed?: number; gloss?: number } = {}) {
  return once(`planks:${key}`, () => {
    const S = opts.size ?? 1024;
    const P = opts.planks ?? 6;
    const seed = opts.seed ?? 1;
    const gloss = opts.gloss ?? 0.42;
    const b = new Buf(S, S);
    const rnd = mulberry32(seed);
    // Joint positions (in v, 0..1) for each plank: 1–2 joints per tile.
    const joints = Array.from({ length: P }, () => {
      const n = rnd() < 0.5 ? 1 : 2;
      return Array.from({ length: n }, () => rnd()).sort();
    });
    const gap = 1.6 / S; // gap width in uv
    for (let y = 0; y < S; y++) {
      const v = y / S;
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const pf = u * P;
        const pi = Math.floor(pf);
        const across = pf - pi; // 0..1 within plank
        const js = joints[pi];
        // Which segment of the plank are we in (cyclic)?
        let seg = 0;
        for (let k = 0; k < js.length; k++) if (v >= js[k]) seg = k + 1;
        if (seg === js.length) seg = 0; // wrap: last segment continues into first
        let jointDist = 1;
        for (const j of js) {
          const d = Math.abs(v - j);
          jointDist = Math.min(jointDist, d, 1 - d);
        }
        const sSeed = seed * 31 + pi * 7 + seg * 101;
        const tint = hash2(pi, seg, seed);
        const g = grain(v * 4, across * 1.3 + tint * 9, 4, 0, sSeed, 3.2 + tint * 2.5);
        let t = g.t + (tint - 0.5) * 0.35;
        // Edges: slight bevel and dark gap
        const edge = Math.min(across, 1 - across) / P; // in uv
        const inGap = edge < gap || jointDist < gap * 0.8;
        const bevel = smoothstep(0, gap * 3, Math.min(edge, jointDist * 1.2));
        // Wear: lighter, rougher patches (foot traffic)
        const wear = fbm(u * 3, v * 3, 3, 3, 3, seed + 77);
        t += (wear - 0.5) * 0.18;
        let c = t < 0.5 ? mix(pal.dark, pal.mid, clamp01(t * 2)) : mix(pal.mid, pal.light, clamp01((t - 0.5) * 2));
        let r = gloss + (1 - bevel) * 0.2 + smoothstep(0.55, 0.8, wear) * 0.18 + (0.5 - g.t) * 0.08;
        let ht = g.height * 0.6 + bevel * 0.8;
        if (inGap) {
          c = mix(pal.dark, [0.02, 0.012, 0.008], 0.7);
          r = 0.9;
          ht = -0.6;
        }
        b.set(y * S + x, c, r, ht);
      }
    }
    return finalize(b, 3.5);
  });
}

/** Seamless veneer for panelling, doors and furniture. Grain runs along v. */
export function veneer(key: string, pal: WoodPalette, opts: { size?: number; seed?: number; gloss?: number } = {}) {
  return once(`veneer:${key}`, () => {
    const S = opts.size ?? 512;
    const seed = opts.seed ?? 3;
    const b = new Buf(S, S);
    for (let y = 0; y < S; y++) {
      const v = y / S;
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const g = grain(v * 2, u * 4, 2, 4, seed, 7.0, 0.7, 0.22);
        const t = g.t;
        const c = t < 0.5 ? mix(pal.dark, pal.mid, clamp01(t * 2)) : mix(pal.mid, pal.light, clamp01((t - 0.5) * 2));
        b.set(y * S + x, c, (opts.gloss ?? 0.38) + (0.5 - t) * 0.12, g.height);
      }
    }
    return finalize(b, 2.2);
  });
}

/** Herringbone parquet, plank length = 4 × width, 8 widths per tile (seamless). */
export function herringbone(key: string, pal: WoodPalette, opts: { size?: number; seed?: number } = {}) {
  return once(`herring:${key}`, () => {
    const S = opts.size ?? 1024;
    const seed = opts.seed ?? 5;
    const n = 4;
    const cells = 8; // must be a multiple of 2n
    const b = new Buf(S, S);
    const gap = 0.022;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const gx = (x / S) * cells;
        const gy = (y / S) * cells;
        const cx = Math.floor(gx);
        const cy = Math.floor(gy);
        const d = cy - cx;
        const chain = Math.floor((d + (n - 1)) / (2 * n));
        // Shift into chain 0
        const sx = gx + n * chain;
        const sy = gy - n * chain;
        const dd = Math.floor(sy) - Math.floor(sx);
        let along: number, across: number, ox: number, oy: number, horizontal: boolean;
        if (dd <= 0) {
          const k = Math.floor(sy);
          along = sx - k; // 0..n
          across = sy - k; // 0..1
          ox = k - n * chain;
          oy = k + n * chain;
          horizontal = true;
        } else {
          const k = Math.floor(sx);
          along = sy - (k + 1);
          across = sx - k;
          ox = k - n * chain;
          oy = k + 1 + n * chain;
          horizontal = false;
        }
        const id = hash2(((ox % cells) + cells) % cells, ((oy % cells) + cells) % cells, seed + (horizontal ? 1 : 2));
        // Grain within a plank: not tiled across planks, so use plank-local coords
        const g = grain(along * 0.6 + id * 50, across * 0.35 + id * 13, 0, 0, seed + Math.floor(id * 1000), 3.5, 1.1, 0.3);
        let t = g.t + (id - 0.5) * 0.4;
        const edge = Math.min(across, 1 - across, along / n, 1 - along / n);
        const wear = fbm((x / S) * 2, (y / S) * 2, 3, 2, 2, seed + 21);
        t += (wear - 0.5) * 0.15;
        let c = t < 0.5 ? mix(pal.dark, pal.mid, clamp01(t * 2)) : mix(pal.mid, pal.light, clamp01((t - 0.5) * 2));
        let r = 0.46 + (1 - smoothstep(0, 0.05, edge)) * 0.25 + (0.5 - g.t) * 0.06;
        let ht = g.height * 0.5 + smoothstep(0, 0.06, edge) * 0.6;
        if (edge < gap) {
          c = [0.03, 0.018, 0.01];
          r = 0.9;
          ht = -0.5;
        }
        b.set(y * S + x, c, r, ht);
      }
    }
    return finalize(b, 3);
  });
}

// ---------------------------------------------------------------- WALLPAPER

function drawDamaskMotif(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  for (const side of [1, -1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    // Outer ogee medallion
    ctx.moveTo(0, -200);
    ctx.bezierCurveTo(40, -160, 120, -120, 110, -40);
    ctx.bezierCurveTo(100, 40, 30, 80, 60, 150);
    ctx.bezierCurveTo(80, 190, 30, 215, 0, 240);
    ctx.lineTo(0, 205);
    ctx.bezierCurveTo(25, 185, 40, 165, 25, 140);
    ctx.bezierCurveTo(0, 90, 70, 30, 75, -40);
    ctx.bezierCurveTo(80, -100, 30, -140, 0, -165);
    ctx.closePath();
    ctx.fill();
    // Leaves
    for (const [x, y, rx, ry, rot] of [
      [45, -60, 14, 42, -0.5],
      [38, 40, 12, 36, 0.6],
      [85, 170, 10, 30, 0.9],
      [95, -150, 9, 26, -1.0],
    ]) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }
    // Scrolls
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(130, 60, 34, Math.PI * 0.9, Math.PI * 2.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(120, -110, 22, Math.PI * 1.2, Math.PI * 2.6);
    ctx.stroke();
    ctx.restore();
  }
  // Central fleur
  ctx.beginPath();
  ctx.ellipse(0, -30, 18, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 60, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function damask(key: string, base: string, motif: string, opts: { seed?: number } = {}) {
  return once(`damask:${key}`, () => {
    const W = 512;
    const H = 1024;
    const c = canvas(W, H);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    // Mask canvas for the motif (drives sheen + relief)
    const m = canvas(W, H);
    const mctx = m.getContext('2d')!;
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, W, H);
    for (const g of [ctx, mctx]) {
      g.fillStyle = g === ctx ? motif : '#fff';
      g.strokeStyle = g === ctx ? motif : '#fff';
      const s = 0.95;
      drawDamaskMotif(g, W / 2, H / 2 - 30, s);
      for (const [x, y] of [
        [0, -30],
        [W, -30],
        [0, H - 30],
        [W, H - 30],
      ])
        drawDamaskMotif(g, x, y, s);
    }
    const b = canvasToBuf(c);
    const mask = canvasToBuf(m);
    const seed = opts.seed ?? 11;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const u = x / W;
        const v = y / H;
        const mk = mask.col[i * 3];
        const age = fbm(u * 4, v * 8, 4, 4, 8, seed);
        const stripe = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 24);
        const fibre = vnoise(u * 300, v * 600, 300, 600, seed + 3);
        const k = 0.86 + (age - 0.5) * 0.28 + stripe * 0.025 + (fibre - 0.5) * 0.05;
        b.col[i * 3] *= k;
        b.col[i * 3 + 1] *= k;
        b.col[i * 3 + 2] *= k * 0.97;
        b.rough[i] = 0.82 - mk * 0.32 + (age - 0.5) * 0.1;
        b.height[i] = mk * 0.4 + fibre * 0.05;
      }
    }
    return finalize(b, 1.4);
  });
}

// ---------------------------------------------------------------- STONE & PLASTER

export function plaster(key: string, base: string, opts: { seed?: number; size?: number; rough?: number } = {}) {
  return once(`plaster:${key}`, () => {
    const S = opts.size ?? 512;
    const b = new Buf(S, S);
    const bc = hex(base);
    const seed = opts.seed ?? 21;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const n = fbm(u * 6, v * 6, 5, 6, 6, seed);
        const stain = smoothstep(0.55, 0.8, fbm(u * 2, v * 2, 3, 2, 2, seed + 4));
        const k = 0.93 + (n - 0.5) * 0.14 - stain * 0.08;
        b.set(y * S + x, [bc[0] * k, bc[1] * k, bc[2] * k * 0.96], (opts.rough ?? 0.88) + (n - 0.5) * 0.08, n * 0.6);
      }
    return finalize(b, 1.2);
  });
}

export function marble(key: string, base: string, vein: string, opts: { seed?: number; gloss?: number } = {}) {
  return once(`marble:${key}`, () => {
    const S = 512;
    const b = new Buf(S, S);
    const bc = hex(base);
    const vc = hex(vein);
    const seed = opts.seed ?? 31;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const t = fbm(u * 3, v * 3, 5, 3, 3, seed);
        const t2 = fbm(u * 5, v * 5, 4, 5, 5, seed + 7);
        const vein1 = 1 - smoothstep(0.0, 0.035, Math.abs(Math.sin((u * 2 + v * 1 + t * 2.4) * Math.PI * 2)));
        const vein2 = 1 - smoothstep(0.0, 0.02, Math.abs(Math.sin((u * 3 - v * 2 + t2 * 3) * Math.PI * 2)));
        const cloud = (t2 - 0.5) * 0.3;
        let c = mix(bc, vc, clamp01(vein1 * 0.85 + vein2 * 0.45));
        c = [c[0] * (1 + cloud), c[1] * (1 + cloud), c[2] * (1 + cloud)];
        b.set(y * S + x, c, (opts.gloss ?? 0.18) + vein1 * 0.12, -vein1 * 0.05);
      }
    return finalize(b, 0.6);
  });
}

export function stone(key: string, base: string, opts: { seed?: number; blocks?: [number, number] } = {}) {
  return once(`stone:${key}`, () => {
    const S = 512;
    const b = new Buf(S, S);
    const bc = hex(base);
    const seed = opts.seed ?? 41;
    const [bx, by] = opts.blocks ?? [0, 0];
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const n = fbm(u * 8, v * 8, 5, 8, 8, seed);
        const speck = vnoise(u * 160, v * 160, 160, 160, seed + 1);
        const grime = fbm(u * 2, v * 4, 3, 2, 4, seed + 9);
        let k = 0.9 + (n - 0.5) * 0.3 + (speck > 0.85 ? 0.08 : speck < 0.12 ? -0.08 : 0) - smoothstep(0.5, 0.85, grime) * 0.25;
        let ht = n * 0.8;
        let r = 0.82 + (n - 0.5) * 0.1;
        if (bx > 0) {
          const fu = (u * bx) % 1;
          const row = Math.floor(v * by);
          const fv = (v * by) % 1;
          const fu2 = (u * bx + (row % 2) * 0.5) % 1;
          const joint = Math.min(fv, 1 - fv) * (S / by) < 2 || Math.min(fu2, 1 - fu2) * (S / bx) < 2;
          if (joint) {
            k *= 0.55;
            ht = -0.6;
            r = 0.95;
          }
          void fu;
        }
        b.set(y * S + x, [bc[0] * k, bc[1] * k, bc[2] * k], r, ht);
      }
    return finalize(b, 2);
  });
}

/** Running-bond brick, 4 bricks × 12 courses per tile. */
export function brick() {
  return once('brick', () => {
    const S = 1024;
    const b = new Buf(S, S);
    const cols = 4;
    const rows = 12;
    const mortarC = hex('#77705f');
    const seed = 51;
    const shades = [hex('#5a2b20'), hex('#6e3626'), hex('#4b241b'), hex('#7a4431'), hex('#3d1f17')];
    for (let y = 0; y < S; y++) {
      const v = y / S;
      const row = Math.floor(v * rows);
      const fv = v * rows - row;
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const bu = u * cols + (row % 2) * 0.5;
        const col = Math.floor(bu);
        const fu = bu - col;
        const id = hash2(((col % cols) + cols) % cols, row, seed);
        const mx = Math.min(fu, 1 - fu) * (S / cols);
        const my = Math.min(fv, 1 - fv) * (S / rows);
        const m = Math.min(mx, my);
        const n = fbm(u * 16, v * 16, 4, 16, 16, seed + 3);
        const streak = fbm(u * 6, v * 1, 3, 6, 1, seed + 8);
        let c: RGB;
        let ht: number;
        let r: number;
        if (m < 5) {
          const k = 0.8 + n * 0.3;
          c = [mortarC[0] * k, mortarC[1] * k, mortarC[2] * k];
          ht = -0.5 + smoothstep(0, 5, m) * 0.3;
          r = 0.95;
        } else {
          const base = shades[Math.floor(id * shades.length)];
          const k = 0.85 + (n - 0.5) * 0.5 - smoothstep(0.55, 0.8, streak) * 0.25;
          c = [base[0] * k, base[1] * k, base[2] * k];
          ht = 0.2 + n * 0.3 - smoothstep(4, 9, m) * 0 + (hash2(x, y, 9) > 0.97 ? -0.2 : 0);
          r = 0.86;
        }
        b.set(y * S + x, c, r, ht);
      }
    }
    return finalize(b, 3);
  });
}

export function slate() {
  return once('slate', () => {
    const S = 512;
    const b = new Buf(S, S);
    const rows = 8;
    const cols = 4;
    const seed = 61;
    for (let y = 0; y < S; y++) {
      const v = y / S;
      const row = Math.floor(v * rows);
      const fv = v * rows - row;
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const bu = u * cols + (row % 2) * 0.5;
        const col = Math.floor(bu);
        const fu = bu - col;
        const id = hash2(((col % cols) + cols) % cols, row, seed);
        const n = fbm(u * 10, v * 10, 4, 10, 10, seed);
        const k = 0.75 + id * 0.35 + (n - 0.5) * 0.2;
        const edgeX = Math.min(fu, 1 - fu) * (S / cols) < 1.5;
        let c: RGB = [0.16 * k, 0.17 * k, 0.19 * k];
        let ht = fv * 0.8 + n * 0.1; // each slate overlaps the one below
        if (edgeX) {
          c = [0.04, 0.04, 0.05];
          ht = 0;
        }
        b.set(y * S + x, c, 0.7 + (n - 0.5) * 0.2, ht);
      }
    }
    return finalize(b, 3);
  });
}

export function ground(key: 'grass' | 'gravel') {
  return once(`ground:${key}`, () => {
    const S = 512;
    const b = new Buf(S, S);
    const seed = key === 'grass' ? 71 : 73;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const n = fbm(u * 8, v * 8, 5, 8, 8, seed);
        const f = vnoise(u * 200, v * 200, 200, 200, seed + 1);
        let c: RGB;
        if (key === 'grass') {
          const g = 0.5 + (n - 0.5) * 0.8 + (f - 0.5) * 0.4;
          c = mix(hex('#1b2014'), hex('#3a4128'), clamp01(g));
          b.set(y * S + x, c, 0.92, f * 0.5 + n * 0.3);
        } else {
          const pebble = vnoise(u * 90, v * 90, 90, 90, seed + 4);
          const k = 0.5 + (pebble - 0.5) * 1.2 + (n - 0.5) * 0.3;
          c = mix(hex('#3a3631'), hex('#8a8173'), clamp01(k));
          b.set(y * S + x, c, 0.85, pebble * 0.9);
        }
      }
    return finalize(b, 2.5);
  });
}

// ---------------------------------------------------------------- FABRICS & METALS

export function velvet() {
  return once('velvet', () => {
    const S = 256;
    const b = new Buf(S, S);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const crush = fbm(u * 6, v * 2, 4, 6, 2, 81);
        const f = vnoise(u * 128, v * 128, 128, 128, 82);
        const k = 0.85 + (crush - 0.5) * 0.4 + (f - 0.5) * 0.08;
        b.set(y * S + x, [k, k, k], 0.75 + (crush - 0.5) * 0.2, crush * 0.6 + f * 0.1);
      }
    return finalize(b, 1.5);
  });
}

/** Brass/gilt variation: colour grime in recesses is approximated with patina noise. */
export function brass(key: string, base: string, opts: { patina?: number } = {}) {
  return once(`brass:${key}`, () => {
    const S = 256;
    const b = new Buf(S, S);
    const bc = hex(base);
    const pat = hex('#3b3220');
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const n = fbm(u * 4, v * 4, 4, 4, 4, 91);
        const s = vnoise(u * 64, v * 64, 64, 64, 92);
        const p = smoothstep(0.55, 0.8, n) * (opts.patina ?? 0.5);
        b.set(y * S + x, mix(bc, pat, p), 0.28 + p * 0.4 + (s - 0.5) * 0.1, n * 0.2);
      }
    return finalize(b, 0.8);
  });
}

// ---------------------------------------------------------------- RUGS

export function persianRug(key: string, opts: { field: string; border: string; accent: string; cream: string; seed?: number }) {
  return once(`rug:${key}`, () => {
    const W = 1024;
    const H = 1536;
    const c = canvas(W, H);
    const g = c.getContext('2d')!;
    const rnd = mulberry32(opts.seed ?? 7);
    g.fillStyle = opts.border;
    g.fillRect(0, 0, W, H);
    // Border bands
    const bands: [number, string][] = [
      [20, opts.cream],
      [34, opts.border],
      [120, opts.accent],
      [136, opts.cream],
      [148, opts.field],
    ];
    for (const [inset, col] of bands) {
      g.fillStyle = col;
      g.fillRect(inset, inset, W - inset * 2, H - inset * 2);
    }
    // Border motif: repeating lozenges on the accent band
    g.fillStyle = opts.cream;
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      for (const [x, y] of [
        [t * W, 77],
        [t * W, H - 77],
      ]) {
        g.beginPath();
        g.moveTo(x, y - 22);
        g.lineTo(x + 14, y);
        g.lineTo(x, y + 22);
        g.lineTo(x - 14, y);
        g.fill();
      }
    }
    for (let i = 0; i < 60; i++) {
      const t = i / 60;
      for (const [x, y] of [
        [77, t * H],
        [W - 77, t * H],
      ]) {
        g.beginPath();
        g.moveTo(x, y - 18);
        g.lineTo(x + 18, y);
        g.lineTo(x, y + 18);
        g.lineTo(x - 18, y);
        g.fill();
      }
    }
    // Field: small boteh-like motifs on a lattice
    for (let yy = 200; yy < H - 180; yy += 70) {
      for (let xx = 200; xx < W - 180; xx += 70) {
        g.save();
        g.translate(xx + ((yy / 70) % 2) * 35, yy);
        g.rotate(rnd() * 0.3 - 0.15);
        g.fillStyle = rnd() < 0.5 ? opts.accent : opts.border;
        g.globalAlpha = 0.7;
        g.beginPath();
        g.ellipse(0, 0, 9, 15, 0.5, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        g.restore();
      }
    }
    // Central medallion
    g.save();
    g.translate(W / 2, H / 2);
    const layers: [number, string][] = [
      [300, opts.border],
      [270, opts.cream],
      [252, opts.accent],
      [190, opts.field],
      [150, opts.cream],
      [130, opts.border],
      [70, opts.accent],
      [36, opts.cream],
    ];
    for (const [r, col] of layers) {
      g.fillStyle = col;
      g.beginPath();
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const rr = r * (k % 2 ? 0.82 : 1);
        g.lineTo(Math.sin(a) * rr * 0.75, Math.cos(a) * rr);
      }
      g.fill();
    }
    g.restore();
    // Corner spandrels
    g.fillStyle = opts.border;
    for (const [x, y, sx, sy] of [
      [148, 148, 1, 1],
      [W - 148, 148, -1, 1],
      [148, H - 148, 1, -1],
      [W - 148, H - 148, -1, -1],
    ]) {
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + sx * 260, y, x + sx * 220, y + sy * 70);
      g.quadraticCurveTo(x + sx * 70, y + sy * 220, x, y + sy * 260);
      g.fill();
    }
    const b = canvasToBuf(c);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const u = x / W;
        const v = y / H;
        const knot = vnoise(x * 0.5, y * 0.5, 0, 0, 3);
        const wear = 1 - Math.hypot(u - 0.5, (v - 0.5) * 0.9) * 1.6;
        const fade = fbm(u * 3, v * 4, 4, 0, 0, 5);
        const w = clamp01(wear) * smoothstep(0.4, 0.75, fade) * 0.35;
        const k = 0.82 + (knot - 0.5) * 0.25;
        for (let ch = 0; ch < 3; ch++) {
          const val = b.col[i * 3 + ch] * k;
          b.col[i * 3 + ch] = lerp(val, 0.42, w);
        }
        b.rough[i] = 0.95;
        b.height[i] = knot * 0.7;
      }
    const set = finalize(b, 2);
    for (const t of [set.map, set.roughnessMap, set.normalMap]) if (t) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return set;
  });
}

/** Long corridor runner, tiles along v. */
export function runner() {
  return once('runner', () => {
    const W = 256;
    const H = 1024;
    const c = canvas(W, H);
    const g = c.getContext('2d')!;
    g.fillStyle = '#2a1d1c';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#8f7a55';
    g.fillRect(14, 0, W - 28, H);
    g.fillStyle = '#4a1f1d';
    g.fillRect(24, 0, W - 48, H);
    g.fillStyle = '#20283a';
    g.fillRect(52, 0, W - 104, H);
    for (let y = 0; y < H; y += 128) {
      for (const [r, col] of [
        [60, '#4a1f1d'],
        [44, '#8f7a55'],
        [28, '#2a1d1c'],
        [12, '#a08a62'],
      ] as [number, string][]) {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(W / 2, y + 64 - r);
        g.lineTo(W / 2 + r * 0.9, y + 64);
        g.lineTo(W / 2, y + 64 + r);
        g.lineTo(W / 2 - r * 0.9, y + 64);
        g.fill();
      }
    }
    const b = canvasToBuf(c);
    for (let i = 0; i < W * H; i++) {
      const x = i % W;
      const y = Math.floor(i / W);
      const knot = vnoise(x * 0.5, y * 0.5, W / 2, H / 2, 4);
      const k = 0.8 + (knot - 0.5) * 0.25;
      b.col[i * 3] *= k;
      b.col[i * 3 + 1] *= k;
      b.col[i * 3 + 2] *= k;
      b.rough[i] = 0.95;
      b.height[i] = knot * 0.6;
    }
    return finalize(b, 2);
  });
}

// ---------------------------------------------------------------- SPECIAL

/** Aged-silver "foxing" mask for antique mirrors (R channel = amount). */
export function foxing(seed = 1) {
  return once(`foxing:${seed}`, () => {
    const S = 512;
    const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        const edge = Math.min(u, 1 - u, v, 1 - v);
        const n = fbm(u * 5, v * 5, 5, 0, 0, seed);
        const spots = smoothstep(0.72, 0.8, vnoise(u * 40, v * 40, 0, 0, seed + 3));
        const edgeFox = (1 - smoothstep(0.0, 0.16, edge + (n - 0.5) * 0.12)) * 0.9;
        const cloud = smoothstep(0.6, 0.85, n) * 0.35;
        const amt = clamp01(edgeFox + cloud + spots * 0.4);
        const i = (y * S + x) * 4;
        data[i] = amt * 255;
        data[i + 1] = n * 255;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  });
}

export function clockFace() {
  return once('clockface', () => {
    const S = 512;
    const c = canvas(S, S);
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S / 2);
    grad.addColorStop(0, '#e2d6b6');
    grad.addColorStop(0.8, '#cbbb93');
    grad.addColorStop(1, '#8c7a55');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    g.translate(S / 2, S / 2);
    g.strokeStyle = '#1b1610';
    g.fillStyle = '#1b1610';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 230, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 214, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r0 = i % 5 === 0 ? 200 : 208;
      g.lineWidth = i % 5 === 0 ? 4 : 1.5;
      g.beginPath();
      g.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0);
      g.lineTo(Math.sin(a) * 214, -Math.cos(a) * 214);
      g.stroke();
    }
    const numerals = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    g.font = '600 40px "Cormorant Garamond", Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    numerals.forEach((n, i) => {
      const a = (i / 12) * Math.PI * 2;
      g.save();
      g.translate(Math.sin(a) * 165, -Math.cos(a) * 165);
      g.rotate(a);
      g.fillText(n, 0, 0);
      g.restore();
    });
    g.font = 'italic 18px "Cormorant Garamond", Georgia, serif';
    g.fillText('J. Harrow', 0, 70);
    g.font = '13px "Cormorant Garamond", Georgia, serif';
    g.fillText('LONDON', 0, 92);
    // Aging
    const img = g.getImageData(0, 0, S, S);
    for (let i = 0; i < S * S; i++) {
      const n = fbm((i % S) / 64, Math.floor(i / S) / 64, 3, 0, 0, 2);
      const k = 0.85 + n * 0.2;
      img.data[i * 4] *= k;
      img.data[i * 4 + 1] *= k;
      img.data[i * 4 + 2] *= k * 0.95;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
  });
}

export type PaintingKind = 'moonhouse' | 'sea' | 'forest' | 'portrait' | 'stilllife';

/** Small oil paintings: layered silhouettes, varnish and craquelure. */
export function painting(kind: PaintingKind, seed = 1) {
  return once(`painting:${kind}:${seed}`, () => {
    const W = 512;
    const H = 640;
    const c = canvas(W, H);
    const g = c.getContext('2d')!;
    const rnd = mulberry32(seed * 97 + kind.length);
    const sky = g.createLinearGradient(0, 0, 0, H);
    if (kind === 'portrait' || kind === 'stilllife') {
      sky.addColorStop(0, '#1b1a14');
      sky.addColorStop(1, '#0d0c09');
    } else if (kind === 'sea') {
      sky.addColorStop(0, '#2b3238');
      sky.addColorStop(0.55, '#7d7a66');
      sky.addColorStop(0.62, '#3c4441');
      sky.addColorStop(1, '#151a19');
    } else {
      sky.addColorStop(0, '#141c22');
      sky.addColorStop(0.5, '#3d4a4a');
      sky.addColorStop(0.68, '#8c7a52');
      sky.addColorStop(1, '#1a1a12');
    }
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    const hills = (yBase: number, amp: number, col: string, freq: number) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const y = yBase + Math.sin(x * freq + seed) * amp + (fbm(x / 60, seed, 3, 0, 0, seed) - 0.5) * amp * 1.5;
        g.lineTo(x, y);
      }
      g.lineTo(W, H);
      g.fill();
    };
    if (kind === 'moonhouse' || kind === 'forest') {
      g.fillStyle = 'rgba(230,220,180,0.9)';
      g.beginPath();
      g.arc(W * 0.72, H * 0.2, 22, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(230,220,180,0.08)';
      g.beginPath();
      g.arc(W * 0.72, H * 0.2, 70, 0, Math.PI * 2);
      g.fill();
      hills(H * 0.62, 18, '#2a2e24', 0.01);
      hills(H * 0.72, 14, '#1b1e17', 0.016);
      if (kind === 'moonhouse') {
        g.fillStyle = '#0e0f0c';
        g.fillRect(W * 0.38, H * 0.5, 90, 70);
        g.beginPath();
        g.moveTo(W * 0.38 - 8, H * 0.5);
        g.lineTo(W * 0.38 + 45, H * 0.42);
        g.lineTo(W * 0.38 + 98, H * 0.5);
        g.fill();
        g.fillStyle = '#d9a95a';
        g.fillRect(W * 0.38 + 58, H * 0.5 + 20, 9, 12);
      } else {
        for (let i = 0; i < 9; i++) {
          const x = rnd() * W;
          g.fillStyle = '#0c0d0a';
          g.fillRect(x, H * 0.35, 6 + rnd() * 6, H * 0.5);
        }
      }
      hills(H * 0.86, 10, '#0f100c', 0.02);
    } else if (kind === 'sea') {
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(200,200,180,${0.05 + rnd() * 0.1})`;
        g.lineWidth = 2;
        const y = H * 0.64 + rnd() * H * 0.3;
        g.beginPath();
        g.moveTo(rnd() * W, y);
        g.quadraticCurveTo(rnd() * W, y - 8, rnd() * W, y);
        g.stroke();
      }
      g.fillStyle = '#121513';
      g.beginPath();
      g.moveTo(W * 0.6, H * 0.6);
      g.lineTo(W * 0.66, H * 0.48);
      g.lineTo(W * 0.68, H * 0.6);
      g.fill();
    } else if (kind === 'portrait') {
      const light = g.createRadialGradient(W * 0.45, H * 0.38, 10, W * 0.45, H * 0.45, 260);
      light.addColorStop(0, 'rgba(120,96,60,0.55)');
      light.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = light;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#0a0907';
      g.beginPath();
      g.ellipse(W * 0.5, H * 0.36, 70, 92, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(W * 0.18, H);
      g.quadraticCurveTo(W * 0.22, H * 0.56, W * 0.5, H * 0.52);
      g.quadraticCurveTo(W * 0.78, H * 0.56, W * 0.82, H);
      g.fill();
      g.strokeStyle = 'rgba(160,130,80,0.35)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(W * 0.5, H * 0.36, 70, 92, 0, -1.2, 0.4);
      g.stroke();
    } else {
      g.fillStyle = '#2a2318';
      g.fillRect(0, H * 0.68, W, H * 0.32);
      g.fillStyle = '#4d3a22';
      g.beginPath();
      g.ellipse(W * 0.42, H * 0.6, 60, 90, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#5a5a3a';
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.arc(W * (0.55 + i * 0.05), H * 0.66 - (i % 2) * 14, 22, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Brush texture, varnish and craquelure
    const img = g.getImageData(0, 0, W, H);
    const d = img.data;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const brush = vnoise(x / 3, y / 14, 0, 0, seed) - 0.5;
        const crack = Math.abs(vnoise(x / 18, y / 18, 0, 0, seed + 2) - 0.5) < 0.012 ? 0.6 : 1;
        const vign = 1 - Math.hypot(x / W - 0.5, y / H - 0.5) * 0.9;
        const k = (1 + brush * 0.12) * crack * vign;
        d[i] = Math.min(255, d[i] * k * 1.04 + 4);
        d[i + 1] = Math.min(255, d[i + 1] * k * 0.98 + 2);
        d[i + 2] = Math.min(255, d[i + 2] * k * 0.8);
      }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
  });
}

/** Engraved brass name plate for a door. */
export function plaque(title: string, sub: string) {
  return once(`plaque:${title}`, () => {
    const W = 512;
    const H = 192;
    const c = canvas(W, H);
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#7a5f2c');
    grad.addColorStop(0.5, '#a88a4c');
    grad.addColorStop(1, '#6a5126');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#3a2b12';
    g.lineWidth = 6;
    g.strokeRect(12, 12, W - 24, H - 24);
    g.fillStyle = '#2a1d0a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '600 46px "Cormorant Garamond", Georgia, serif';
    g.fillText(title, W / 2, H * 0.42);
    g.font = 'italic 30px "Cormorant Garamond", Georgia, serif';
    g.fillText(sub, W / 2, H * 0.72);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
  });
}

/** Soft round sprite for dust motes and glows. */
export function softDot() {
  return once('softdot', () => {
    const S = 64;
    const c = canvas(S, S);
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  });
}
