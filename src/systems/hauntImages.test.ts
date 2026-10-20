import { describe, expect, it } from 'vitest';
import { HAUNT_IMAGES, hauntImagePresent, paintingUrl } from './paintingImages';
import { CLIP_SLOTS } from './clips';

// The haunting's images exactly as Vite bundles them (inlined for the test only).
const inlined = import.meta.glob('../assets/haunting/*', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>;
const files = new Map(
  Object.entries(inlined).map(([p, dataUrl]) => {
    const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return [p.replace(/^.*\//, ''), bytes] as const;
  }),
);
const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));

/** Width, height and whether it has alpha, from a WebP header (VP8, VP8L or VP8X). */
function webpInfo(b: Uint8Array) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  expect(ascii(b, 0, 4)).toBe('RIFF');
  expect(ascii(b, 8, 4)).toBe('WEBP');
  expect(v.getUint32(4, true) + 8, 'truncated').toBe(b.length);
  const chunk = ascii(b, 12, 4);
  if (chunk === 'VP8 ') return { w: v.getUint16(26, true) & 0x3fff, h: v.getUint16(28, true) & 0x3fff, alpha: false };
  if (chunk === 'VP8L') {
    const bits = v.getUint32(21, true);
    return { w: (bits & 0x3fff) + 1, h: ((bits >>> 14) & 0x3fff) + 1, alpha: !!((bits >>> 28) & 1) };
  }
  const u24 = (at: number) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);
  return { w: 1 + u24(24), h: 1 + u24(27), alpha: !!(b[20] & 0x10) };
}

describe('the haunting’s images', () => {
  it('has the apparition, the empty portrait and the altered portraits; nothing unlisted', () => {
    for (const k of ['apparition', 'ladyGone', 'D02', 'D09', 'D12', 'D14'] as const) expect(hauntImagePresent(k), k).toBe(true);
    const listed = new Set<string>(Object.values(HAUNT_IMAGES).map((s) => s.file));
    for (const f of files.keys()) expect(listed.has(f), `${f} is not in HAUNT_IMAGES`).toBe(true);
  });

  it.each(Object.entries(HAUNT_IMAGES).filter(([, s]) => files.has(s.file)))('%s is a WebP of its recorded size', (k, spec) => {
    const info = webpInfo(files.get(spec.file)!);
    expect({ w: info.w, h: info.h }).toEqual({ w: spec.w, h: spec.h });
    expect(paintingUrl(spec.file), 'bundled').toBeTruthy();
    // The apparition is a cut-out; the paintings are opaque canvases.
    if (k === 'apparition') expect(info.alpha).toBe(true);
    if (k === 'ladyGone') expect(info.alpha).toBe(false);
  });

  it('altered portraits are exactly the size of the paintings they stand in for', () => {
    expect(HAUNT_IMAGES.D02).toMatchObject({ w: 404, h: 512 });
    expect(HAUNT_IMAGES.D09).toMatchObject({ w: 402, h: 512 });
    expect(HAUNT_IMAGES.D12).toMatchObject({ w: 410, h: 512 });
    expect(HAUNT_IMAGES.D14).toMatchObject({ w: 402, h: 512 });
    expect(HAUNT_IMAGES.ladyGone).toMatchObject({ w: 768, h: 1024 });
  });

  it('the Lady’s voice loads on demand; the knocks in the background', () => {
    for (const s of ['whisper', 'giggle', 'sigh', 'hum'] as const) expect(CLIP_SLOTS[s].tier).toBe('demand');
    expect(CLIP_SLOTS.knock.tier).toBe('idle');
  });
});
