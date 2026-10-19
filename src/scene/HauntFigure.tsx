/**
 * The rarest thing the house does: a soft, dark shape crossing a doorway or the landing far away,
 * for less than a second. It is a blurred silhouette at low opacity, never close, never facing you,
 * so it reads as "was that a shadow?" rather than as a ghost. Driven by the haunting director.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { world } from '../systems/time';

type V3 = [number, number, number];

export const figureFx = {
  /** Path start and end (the figure's feet), when it started, how long it takes, how dark it is. */
  from: [0, 0, 0] as V3,
  to: [0, 0, 0] as V3,
  start: -1e9,
  dur: 0.9,
  opacity: 0.5,
};

export function showFigure(from: V3, to: V3, dur = 0.9, opacity = 0.5) {
  figureFx.from = from;
  figureFx.to = to;
  figureFx.start = world.t;
  figureFx.dur = dur;
  figureFx.opacity = opacity;
}

/** A blurred head-and-shoulders silhouette, painted once. */
function silhouette() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.filter = 'blur(7px)';
  g.fillStyle = '#fff';
  g.beginPath();
  g.ellipse(32, 26, 11, 14, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(10, 150);
  g.quadraticCurveTo(6, 64, 20, 46);
  g.lineTo(44, 46);
  g.quadraticCurveTo(58, 64, 54, 150);
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function HauntFigure() {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: silhouette(), transparent: true, opacity: 0, depthWrite: false, fog: true }), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const u = (world.t - figureFx.start) / figureFx.dur;
    // Always in the scene (so its shader is compiled with the rest of the house at the title screen);
    // invisible at zero opacity between appearances.
    if (u < 0 || u > 1) {
      mat.opacity = 0;
      return;
    }
    a.set(...figureFx.from);
    b.set(...figureFx.to);
    const e = u * u * (3 - 2 * u);
    mesh.current.position.lerpVectors(a, b, e);
    mesh.current.position.y += 0.86;
    // Face the camera around the vertical axis only.
    mesh.current.rotation.set(0, Math.atan2(camera.position.x - mesh.current.position.x, camera.position.z - mesh.current.position.z), 0);
    mat.opacity = figureFx.opacity * Math.sin(Math.PI * u);
  });
  return (
    <mesh ref={mesh} material={mat} position={[0, -20, 0]} renderOrder={5}>
      <planeGeometry args={[0.62, 1.72]} />
    </mesh>
  );
}
