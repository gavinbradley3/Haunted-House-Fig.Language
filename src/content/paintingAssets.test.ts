import { describe, expect, it } from 'vitest';
import { ART_IMAGES, DECOR_IMAGES, paintingUrl } from '../systems/paintingImages';
import { PAINTINGS } from './paintings';

// The files exactly as Vite bundles them (inlined as data URLs for the test only).
const inlined = import.meta.glob('../assets/paintings/*', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>;
const files = new Map(
  Object.entries(inlined).map(([p, dataUrl]) => {
    const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return [p.replace(/^.*\//, ''), bytes] as const;
  }),
);

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));

/** Width and height from a WebP header (VP8, VP8L or VP8X). */
function webpSize(file: string) {
  const b = files.get(file)!;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  expect(ascii(b, 0, 4), `${file} is not RIFF`).toBe('RIFF');
  expect(ascii(b, 8, 4), `${file} is not WebP`).toBe('WEBP');
  expect(v.getUint32(4, true) + 8, `${file} is truncated`).toBe(b.length);
  const chunk = ascii(b, 12, 4);
  if (chunk === 'VP8 ') return { w: v.getUint16(26, true) & 0x3fff, h: v.getUint16(28, true) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = v.getUint32(21, true);
    return { w: (bits & 0x3fff) + 1, h: ((bits >>> 14) & 0x3fff) + 1 };
  }
  const u24 = (at: number) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);
  return { w: 1 + u24(24), h: 1 + u24(27) };
}

const specs = [...Object.values(ART_IMAGES), ...Object.values(DECOR_IMAGES)].map((s) => s!);

describe('final painting collection', () => {
  it('has exactly the 25 manifest files, nothing extra', () => {
    expect([...files.keys()].sort()).toEqual(specs.map((s) => s.file).sort());
    expect(files.size).toBe(25);
  });

  it.each(specs.map((s) => [s.file, s] as const))('%s is a non-empty WebP of the recorded size', (file, spec) => {
    expect(files.get(file)?.length ?? 0).toBeGreaterThan(1000);
    expect(webpSize(file)).toEqual({ w: spec.w, h: spec.h });
    expect(paintingUrl(file), 'bundled by Vite').toBeTruthy();
  });

  it('every catalogued painting has its artwork, except the students’ blank canvas', () => {
    for (const p of Object.values(PAINTINGS)) {
      if (p.art === 'emptyCanvas') expect(ART_IMAGES.emptyCanvas).toBeUndefined();
      else expect(ART_IMAGES[p.art], p.id).toBeDefined();
    }
  });

  it('installs both Lady of the House gaze states at the same size (swapped in place)', () => {
    const a = ART_IMAGES.ladyOfHouse!;
    const b = ART_IMAGES.ladyOfHouseTurned!;
    expect(webpSize(a.file)).toEqual(webpSize(b.file));
    const A = files.get(a.file)!;
    const B = files.get(b.file)!;
    expect(A.length === B.length && A.every((x, i) => x === B[i])).toBe(false);
  });

  it('keeps the original canvas proportions the rooms and effects were built for', () => {
    // 1024x768 landscape for the house, 768x1024 for the portraits: shader effects (moths, text) use these UVs.
    expect(ART_IMAGES.houseBreath).toMatchObject({ w: 1024, h: 768 });
    for (const id of ['deafeningSilence', 'caretaker', 'coldFeet', 'whisperingWalls', 'oldManShadow', 'nervousSitter', 'ladyOfHouse', 'ladyOfHouseTurned'] as const)
      expect(ART_IMAGES[id], id).toMatchObject({ w: 768, h: 1024 });
  });
});
