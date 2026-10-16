/**
 * A board on an easel that shows a line of text: chalk on a slate, or ink on paper.
 * The later rooms show the class's Prove sentence on one of these.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { boardText } from '../../systems/boardText';
import { boxGeo } from '../../systems/geometry';
import { mats } from '../../systems/materials';

interface Props {
  position: [number, number, number];
  /** Which way the board faces (radians about y; 0 faces +z). */
  rotationY: number;
  heading: string;
  /** Read every frame; the texture is redrawn only when it changes. */
  text: () => string;
  style?: 'chalk' | 'ink';
  width?: number;
  height?: number;
}

export function Easel({ position, rotationY, heading, text, style = 'chalk', width = 1.0, height = 0.74 }: Props) {
  const m = mats();
  const mat = useMemo(() => {
    const t = boardText(heading, text() || ' ', width / height, style);
    // The writing glows faintly so the class can read it across a dark room.
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: style === 'chalk' ? 0.55 : 0.3, roughness: 0.9 });
  }, [heading, style, width, height]);
  const last = useRef('');
  useFrame(() => {
    const t = text() || ' ';
    if (t === last.current) return;
    last.current = t;
    mat.map = mat.emissiveMap = boardText(heading, t, width / height, style);
    mat.needsUpdate = true;
  });
  const y = 1.45;
  const frame = style === 'chalk' ? m.walnut : m.paintCream;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[-width * 0.4, width * 0.4].map((x) => (
        <mesh key={x} geometry={boxGeo(0.04, 1.85, 0.04)} material={frame} position={[x, 0.92, 0.02]} rotation={[-0.06, 0, x > 0 ? -0.06 : 0.06]} castShadow />
      ))}
      <mesh geometry={boxGeo(0.04, 1.85, 0.04)} material={frame} position={[0, 0.9, -0.3]} rotation={[-0.25, 0, 0]} />
      <mesh geometry={boxGeo(width + 0.08, height + 0.08, 0.03)} material={frame} position={[0, y, 0.1]} castShadow />
      <mesh material={mat} position={[0, y, 0.117]}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh geometry={boxGeo(width, 0.03, 0.06)} material={frame} position={[0, y - height / 2 - 0.05, 0.13]} />
    </group>
  );
}
