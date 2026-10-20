/**
 * The rarest thing the house does: the Lady in Green, seen far away for a moment. She stands in a
 * doorway or at the landing rail, or crosses it, and is gone. She is a single flat billboard of a full-length
 * painting of her (src/assets/haunting/lady-apparition.webp, by Astra, from her portrait), dimmed to the light where she
 * stands, with a faint contact shadow under her hem so she stands on the floor rather than floating over it;
 * never close, never moving toward the student. Driven by the haunting director (HouseEvents).
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HAUNT_IMAGES, hauntTexture } from '../systems/paintingImages';
import { world } from '../systems/time';

type V3 = [number, number, number];

/** Her height in the house (metres), and the billboard's width from the image's own aspect ratio. */
const HEIGHT = 1.68;
const WIDTH = (HEIGHT * HAUNT_IMAGES.apparition.w) / HAUNT_IMAGES.apparition.h;

export const figureFx = {
  /**
   * `stand`: she is there (fading in over half a second), stays, then steps aside toward `to` as she fades.
   * `cross`: she passes from `from` to `to` (the older, quicker sighting).
   */
  mode: 'cross' as 'stand' | 'cross',
  /** Path start and end (her feet). */
  from: [0, 0, 0] as V3,
  to: [0, 0, 0] as V3,
  start: -1e9,
  dur: 0.9,
  /** How solid she looks at most (0-1). */
  opacity: 0.5,
  /** How much light reaches her where she stands (multiplies the painting's colours). */
  light: 0.6,
};

/** Is she showing right now? */
export const figureVisible = () => world.t >= figureFx.start && world.t <= figureFx.start + figureFx.dur;

export function showFigure(from: V3, to: V3, dur = 0.9, opacity = 0.5, mode: 'stand' | 'cross' = 'cross', light = 0.6) {
  Object.assign(figureFx, { from, to, start: world.t, dur, opacity, mode, light });
}

const smooth = (u: number) => u * u * (3 - 2 * u);

/** A soft oval of shade, painted once: the contact shadow under her skirt. */
function shade() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  r.addColorStop(0, '#fff');
  r.addColorStop(0.55, '#888');
  r.addColorStop(1, '#000');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function HauntFigure() {
  const mesh = useRef<THREE.Mesh>(null!);
  const shadow = useRef<THREE.Mesh>(null!);
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: shade(), transparent: true, opacity: 0, depthWrite: false, fog: true }), []);
  const mat = useMemo(() => {
    const map = hauntTexture('apparition');
    return new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, depthWrite: false, fog: true, color: '#999999' });
  }, []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const f = figureFx;
    const t = world.t - f.start;
    const u = t / f.dur;
    // Both always in the scene (so their shaders are compiled with the rest of the house at the title screen),
    // under the floor at zero opacity between appearances.
    if (u < 0 || u > 1) {
      mat.opacity = 0;
      shadowMat.opacity = 0;
      mesh.current.position.y = -20;
      shadow.current.position.y = -20;
      return;
    }
    a.set(...f.from);
    b.set(...f.to);
    let k: number;
    if (f.mode === 'stand') {
      // In over 0.5 s, hold, then out over the last 0.7 s while drifting a step toward `to`.
      const out = Math.max(0, (t - (f.dur - 0.7)) / 0.7);
      k = smooth(Math.min(1, t / 0.5)) * (1 - smooth(Math.min(1, out)));
      mesh.current.position.lerpVectors(a, b, smooth(Math.min(1, out)));
    } else {
      k = Math.sin(Math.PI * u);
      mesh.current.position.lerpVectors(a, b, smooth(u));
    }
    // The shade on the floor under her hem (just above it, so it never flickers into the boards).
    shadow.current.position.set(mesh.current.position.x, mesh.current.position.y + 0.012, mesh.current.position.z);
    shadowMat.opacity = 0.5 * f.opacity * k;
    mesh.current.position.y += HEIGHT / 2;
    // Face the camera around the vertical axis only.
    mesh.current.rotation.set(0, Math.atan2(camera.position.x - mesh.current.position.x, camera.position.z - mesh.current.position.z), 0);
    mat.color.setScalar(f.light);
    mat.opacity = f.opacity * k;
  });
  return (
    <>
      <mesh ref={mesh} material={mat} position={[0, -20, 0]} renderOrder={5}>
        <planeGeometry args={[WIDTH, HEIGHT]} />
      </mesh>
      <mesh ref={shadow} material={shadowMat} position={[0, -20, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
        <planeGeometry args={[WIDTH * 1.25, WIDTH * 0.7]} />
      </mesh>
    </>
  );
}
