/**
 * The final painting collection (src/assets/paintings, WebP, exact filenames from the painting manifest).
 *
 * Lesson paintings keep their ArtIds; decorative paintings are named by their manifest id (D01-D16).
 * Each entry records the file's exact pixel size, so frames are sized by the image's own aspect ratio
 * and nothing is stretched or cropped. The blank student canvas (emptyCanvas) stays procedural.
 */
import * as THREE from 'three';
import type { ArtId } from './paintingScenes';
import { renderer } from './renderer';

const urls = import.meta.glob('../assets/paintings/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

// The haunting's images (src/assets/haunting): the Lady's apparition and the altered states of paintings.
const hauntUrls = import.meta.glob('../assets/haunting/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** URL of a painting file by its exact filename (undefined if the file is not in the build). */
export function paintingUrl(file: string): string | undefined {
  return urls[`../assets/paintings/${file}`] ?? hauntUrls[`../assets/haunting/${file}`];
}

// Close-inspection copies at the artwork's native resolution (src/assets/paintings/inspect, same filenames).
// Only their URLs are bundled here; each file is downloaded when a student opens that painting.
const inspectUrls = import.meta.glob('../assets/paintings/inspect/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** The sharpest image of a painting for the viewer: the native-size copy, else the in-game texture. */
export function inspectionUrl(file: string): string | undefined {
  return inspectUrls[`../assets/paintings/inspect/${file}`] ?? paintingUrl(file);
}

interface ImageSpec {
  file: string;
  w: number;
  h: number;
}

/** Lesson and story paintings. Both Lady of the House gaze states are the same size, swapped in place. */
export const ART_IMAGES: Partial<Record<ArtId, ImageSpec>> = {
  houseBreath: { file: 'painting-houseBreath.webp', w: 1024, h: 768 },
  deafeningSilence: { file: 'painting-deafeningSilence.webp', w: 768, h: 1024 },
  caretaker: { file: 'painting-caretaker.webp', w: 768, h: 1024 },
  coldFeet: { file: 'painting-coldFeet.webp', w: 768, h: 1024 },
  whisperingWalls: { file: 'painting-whisperingWalls.webp', w: 768, h: 1024 },
  oldManShadow: { file: 'painting-oldManShadow.webp', w: 768, h: 1024 },
  nervousSitter: { file: 'painting-nervousSitter.webp', w: 768, h: 1024 },
  ladyOfHouse: { file: 'painting-ladyOfHouse.webp', w: 768, h: 1024 },
  ladyOfHouseTurned: { file: 'painting-ladyOfHouse-turned.webp', w: 768, h: 1024 },
  // emptyCanvas: intentionally absent. The students' sentence is painted onto the procedural blank.
};

/** Decorative paintings by manifest id, with the room and placement they were painted for. */
export const DECOR_IMAGES = {
  D01: { file: 'decor-D01-hall-landing.webp', w: 512, h: 372 },
  D02: { file: 'decor-D02-hall-stair-portrait.webp', w: 404, h: 512 },
  D03: { file: 'decor-D03-hall-stair-landscape.webp', w: 512, h: 392 },
  D04: { file: 'decor-D04-hall-east-stilllife.webp', w: 420, h: 512 },
  D05: { file: 'decor-D05-hall-east-sea.webp', w: 512, h: 384 },
  D06: { file: 'decor-D06-gallery-south-sea.webp', w: 512, h: 378 },
  D07: { file: 'decor-D07-gallery-south-stilllife.webp', w: 410, h: 512 },
  D08: { file: 'decor-D08-gallery-north-landscape.webp', w: 512, h: 396 },
  D09: { file: 'decor-D09-gallery-north-portrait.webp', w: 402, h: 512 },
  D10: { file: 'decor-D10-dining-west-stilllife.webp', w: 512, h: 398 },
  D11: { file: 'decor-D11-dining-north-landscape.webp', w: 512, h: 368 },
  D12: { file: 'decor-D12-dining-south-portrait.webp', w: 410, h: 512 },
  D13: { file: 'decor-D13-dining-south-sea.webp', w: 512, h: 398 },
  D14: { file: 'decor-D14-nursery-south-portrait.webp', w: 402, h: 512 },
  D15: { file: 'decor-D15-nursery-east-landscape.webp', w: 512, h: 384 },
  D16: { file: 'decor-D16-nursery-east-house.webp', w: 426, h: 512 },
} as const satisfies Record<string, ImageSpec>;
export type DecorId = keyof typeof DECOR_IMAGES;

export const decorAspect = (id: DecorId) => DECOR_IMAGES[id].w / DECOR_IMAGES[id].h;

/**
 * The haunting's images (src/assets/haunting). Each altered painting is the same size as the painting it
 * replaces for a while. An entry whose file is not in the build simply never happens (see docs/phase11).
 */
export const HAUNT_IMAGES = {
  /** The Lady in Green, full length (Astra, from her portrait): the apparition. */
  apparition: { file: 'lady-apparition.webp', w: 400, h: 1024 },
  /** The Builder's portrait (D02) with the Lady's face in the darkness behind him. */
  D02: { file: 'decor-D02-haunted.webp', w: 404, h: 512 },
  /** The Young Man in Mourning (D09) with the Lady's face in the darkness behind him. */
  D09: { file: 'decor-D09-haunted.webp', w: 402, h: 512 },
  /** The Host (D12, dining room), with her face in the dark panelling behind him. */
  D12: { file: 'decor-D12-haunted.webp', w: 410, h: 512 },
  /** The Girl with a China Doll (D14, nursery), with her face in the darkness behind them. */
  D14: { file: 'decor-D14-haunted.webp', w: 402, h: 512 },
  /** The Lady's portrait with her gone, only the chair and curtain left (Astra). */
  ladyGone: { file: 'painting-ladyOfHouse-empty.webp', w: 768, h: 1024 },
} as const satisfies Record<string, ImageSpec>;
export type HauntImage = keyof typeof HAUNT_IMAGES;

/** Is this haunting image in the build? */
export const hauntImagePresent = (k: HauntImage) => !!paintingUrl(HAUNT_IMAGES[k].file);
/** The texture for a haunting image (starts loading on first use), or null if the file is not in the build. */
export const hauntTexture = (k: HauntImage) => paintingTexture(HAUNT_IMAGES[k], (t) => renderer.gl?.initTexture(t));

// ------------------------------------------------------------------ loading

const textures = new Map<string, THREE.Texture>();
/** Files whose loaded size did not match the table (reported once each). */
export const sizeMismatches: string[] = [];

/**
 * A texture for a painting file. It starts as a dark 4x4 placeholder and becomes the painting once
 * the file has decoded; `onReady` lets the caller upload it to the GPU straight away.
 */
export function paintingTexture(spec: ImageSpec, onReady?: (t: THREE.Texture) => void): THREE.Texture | null {
  const url = paintingUrl(spec.file);
  if (!url) return null;
  let t = textures.get(spec.file);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 4;
  const g = c.getContext('2d')!;
  g.fillStyle = '#16120d';
  g.fillRect(0, 0, 4, 4);
  const tex = new THREE.Texture<HTMLCanvasElement | HTMLImageElement>(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  tex.name = spec.file;
  textures.set(spec.file, tex);
  t = tex;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  img
    .decode()
    .then(() => {
      if (img.naturalWidth !== spec.w || img.naturalHeight !== spec.h) {
        sizeMismatches.push(`${spec.file}: ${img.naturalWidth}x${img.naturalHeight}, expected ${spec.w}x${spec.h}`);
        console.warn(`[paintings] ${spec.file} is ${img.naturalWidth}x${img.naturalHeight}, expected ${spec.w}x${spec.h}`);
      }
      // WebGL texture storage cannot change size: release the placeholder's GPU copy first.
      tex.dispose();
      tex.image = img;
      tex.needsUpdate = true;
      tex.userData.loaded = true;
      onReady?.(tex);
    })
    .catch((e) => console.error(`[paintings] could not load ${spec.file}`, e));
  return t;
}

/** Every painting file the build knows about, with whether its texture has finished loading. */
export function paintingLoadState() {
  const all = [...Object.values(ART_IMAGES), ...Object.values(DECOR_IMAGES)].map((s) => s!.file);
  return all.map((file) => ({ file, inBuild: !!paintingUrl(file), requested: textures.has(file), loaded: !!textures.get(file)?.userData.loaded }));
}
