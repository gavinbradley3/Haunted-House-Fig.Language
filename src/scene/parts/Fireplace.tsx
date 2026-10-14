import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { boxGeo, latheGeo, LATHES } from '../../systems/geometry';
import { mats } from '../../systems/materials';
import { world } from '../../systems/time';
import { flicker } from './Lights';
import { Painting } from './Furnishings';

/**
 * Marble fireplace on a chimney breast, local wall frame (centred at x).
 * The chimney breast projects 0.35 m from the wall and rises to the ceiling.
 */
export function Fireplace({ x, ceiling }: { x: number; ceiling: number }) {
  const m = mats();
  const breast = 0.35;
  const embers = useRef<THREE.Group>(null!);
  const emberMat = useMemo(() => m.ember.clone(), [m]);
  const urn = latheGeo('urn', LATHES.urn);
  const coals = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (let i = 0; i < 26; i++) out.push([(Math.random() - 0.5) * 0.5, 0.18 + Math.random() * 0.1, (Math.random() - 0.5) * 0.18, 0.03 + Math.random() * 0.035]);
    return out;
  }, []);
  useFrame(() => {
    emberMat.emissiveIntensity = 1.6 + (flicker(world.t * 0.7, 3) - 0.95) * 8;
  });
  return (
    <group position={[x, 0, 0]}>
      {/* Chimney breast */}
      <mesh geometry={boxGeo(2.3, ceiling, breast)} material={m.wallHall} position={[0, ceiling / 2, breast / 2]} castShadow receiveShadow />
      <group position={[0, 0, breast]}>
        {/* Hearth slab */}
        <mesh geometry={boxGeo(2.1, 0.05, 0.55)} material={m.marbleDark} position={[0, 0.025, 0.27]} receiveShadow castShadow />
        {/* Pilasters */}
        {[-0.72, 0.72].map((px) => (
          <group key={px}>
            <mesh geometry={boxGeo(0.28, 1.12, 0.17)} material={m.marbleDark} position={[px, 0.56 + 0.05, 0.085]} castShadow receiveShadow />
            <mesh geometry={boxGeo(0.32, 0.1, 0.2)} material={m.marbleDark} position={[px, 0.1, 0.1]} castShadow />
            <mesh geometry={boxGeo(0.32, 0.06, 0.21)} material={m.marbleDark} position={[px, 1.1, 0.105]} castShadow />
          </group>
        ))}
        {/* Frieze and mantel shelf */}
        <mesh geometry={boxGeo(1.72, 0.26, 0.15, 'x')} material={m.marbleDark} position={[0, 1.25, 0.075]} castShadow />
        <mesh geometry={boxGeo(1.98, 0.055, 0.3, 'x')} material={m.marbleDark} position={[0, 1.41, 0.14]} castShadow receiveShadow />
        <mesh geometry={boxGeo(1.9, 0.03, 0.27, 'x')} material={m.marbleDark} position={[0, 1.37, 0.13]} />
        {/* Cast-iron insert with arched opening */}
        <mesh geometry={boxGeo(1.16, 1.06, 0.04)} material={m.iron} position={[0, 0.58, 0.02]} />
        <mesh material={m.soot} position={[0, 0.5, 0.045]}>
          <shapeGeometry args={[archShape(0.36, 0.78)]} />
        </mesh>
        {/* Basket grate with embers, standing in the arched opening */}
        <group ref={embers} position={[0, 0.05, 0.16]}>
          <mesh geometry={boxGeo(0.62, 0.02, 0.22)} material={m.iron} position={[0, 0.14, 0]} />
          {[-0.28, 0.28].map((gx) => (
            <mesh key={gx} geometry={boxGeo(0.03, 0.18, 0.03)} material={m.iron} position={[gx, 0.07, 0.1]} />
          ))}
          {coals.map(([cx, cy, cz, r], i) => (
            <mesh key={i} material={i % 3 === 0 ? m.soot : emberMat} position={[cx, cy, cz]}>
              <dodecahedronGeometry args={[r, 0]} />
            </mesh>
          ))}
          {[0, 1].map((i) => (
            <mesh key={i} material={m.walnut} position={[0, 0.27 + i * 0.05, (i - 0.5) * 0.06]} rotation={[0, 0, Math.PI / 2 + i * 0.2]}>
              <cylinderGeometry args={[0.04, 0.045, 0.5, 8]} />
            </mesh>
          ))}
        </group>
        {/* Fender */}
        <mesh geometry={boxGeo(1.3, 0.07, 0.02)} material={m.brass} position={[0, 0.09, 0.42]} castShadow />
        {[-0.65, 0.65].map((fx) => (
          <mesh key={fx} geometry={boxGeo(0.02, 0.07, 0.36)} material={m.brass} position={[fx, 0.09, 0.25]} />
        ))}
        {/* Mantel garniture */}
        <group position={[0, 1.44, 0.15]}>
          <mesh geometry={urn} material={m.ceramic} position={[-0.7, 0, 0]} castShadow />
          <mesh geometry={urn} material={m.ceramic} position={[0.7, 0, 0]} castShadow />
          <mesh geometry={latheGeo('candlestick', LATHES.candlestick)} material={m.brass} position={[-0.38, 0, 0]} castShadow />
          <mesh geometry={latheGeo('candlestick', LATHES.candlestick)} material={m.brass} position={[0.38, 0, 0]} castShadow />
        </group>
        {/* Overmantel portrait */}
        <Painting x={0} y={2.55} w={1.0} h={1.3} kind="portrait" seed={9} />
      </group>
    </group>
  );
}

function archShape(halfW: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-halfW, -h / 2 + 0.05);
  s.lineTo(halfW, -h / 2 + 0.05);
  s.lineTo(halfW, h / 2 - halfW);
  s.absarc(0, h / 2 - halfW, halfW, 0, Math.PI, false);
  s.lineTo(-halfW, -h / 2 + 0.05);
  return s;
}
