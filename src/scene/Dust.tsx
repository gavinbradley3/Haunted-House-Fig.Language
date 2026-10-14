import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { softDot } from '../systems/textures';
import { world } from '../systems/time';

/** Slowly drifting dust motes, concentrated in the moonlit hall and the mirror room. */
export function DustMotes() {
  const count = 260;
  const { geo, base } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const inMirrors = i % 3 === 0;
      p[i * 3] = inMirrors ? (Math.random() - 0.5) * 8 : -5 + Math.random() * 9;
      p[i * 3 + 1] = 0.3 + Math.random() * (inMirrors ? 4.2 : 5.5);
      p[i * 3 + 2] = inMirrors ? -19.5 - Math.random() * 11 : -0.5 - Math.random() * 9;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return { geo: g, base: p.slice() };
  }, []);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: softDot(),
        size: 0.011,
        color: new THREE.Color(1.6, 1.45, 1.2),
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [],
  );
  const ref = useRef<THREE.Points>(null!);
  useFrame(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const a = pos.array as Float32Array;
    const t = world.t;
    for (let i = 0; i < count; i++) {
      a[i * 3] = base[i * 3] + Math.sin(t * 0.07 + i) * 0.35;
      a[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.05 + i * 1.7) * 0.25;
      a[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.06 + i * 0.7) * 0.35;
    }
    pos.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
