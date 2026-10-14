import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { boxGeo, latheGeo, LATHES } from '../../systems/geometry';
import { mats } from '../../systems/materials';
import { plaque } from '../../systems/textures';
import { shadowClock, world } from '../../systems/time';
import { box, removeDynamicCollider, setDynamicCollider } from '../../world/collision';
import { Interactive } from '../Interactive';

/** A four-panel Victorian door leaf. Hinge at the local origin, leaf extends along +x. */
export function DoorLeaf({ width, height, material, handleSide = 1 }: { width: number; height: number; material?: THREE.Material; handleSide?: 1 | -1 }) {
  const m = material ?? mats().walnut;
  const t = 0.052;
  const st = Math.min(0.13, width * 0.13);
  const panels = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number }[] = [];
    const pw = (width - st * 3) / 2;
    const bottom = 0.24;
    const mid = height * 0.36;
    const midH = 0.17;
    const top = 0.14;
    const lowH = mid - bottom;
    const upH = height - top - (mid + midH);
    for (let c = 0; c < 2; c++) {
      const x = st + c * (pw + st) + pw / 2;
      out.push({ x, y: bottom + lowH / 2, w: pw, h: lowH });
      out.push({ x, y: mid + midH + upH / 2, w: pw, h: upH });
    }
    return out;
  }, [width, height, st]);
  const knob = latheGeo('knob', LATHES.knob);
  const hx = handleSide > 0 ? width - 0.075 : 0.075;
  return (
    <group>
      <mesh geometry={boxGeo(width, height, t)} material={m} position={[width / 2, height / 2, 0]} castShadow receiveShadow />
      {panels.map((p, i) => (
        <group key={i}>
          {[1, -1].map((side) => (
            <group key={side} position={[p.x, p.y, (side * t) / 2]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
              <RaisedPanel w={p.w} h={p.h} material={m} />
            </group>
          ))}
        </group>
      ))}
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh geometry={knob} material={mats().brass} position={[hx, 1.0, (side * t) / 2]} rotation={[(side * Math.PI) / 2, 0, 0]} castShadow />
          <mesh geometry={boxGeo(0.05, 0.2, 0.006)} material={mats().brass} position={[hx, 0.98, (side * (t + 0.006)) / 2]} />
          <mesh geometry={boxGeo(0.008, 0.02, 0.008)} material={mats().blackPaint} position={[hx, 0.92, (side * (t + 0.012)) / 2]} />
        </group>
      ))}
      {[0.25, height / 2, height - 0.25].map((y, i) => (
        <mesh key={i} geometry={boxGeo(0.02, 0.11, 0.06)} material={mats().brass} position={[0, y, 0]} />
      ))}
    </group>
  );
}

const rpCache = new Map<string, THREE.BufferGeometry>();
function RaisedPanel({ w, h, material }: { w: number; h: number; material: THREE.Material }) {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}`;
  let g = rpCache.get(key);
  if (!g) {
    const bevel = Math.min(0.05, w * 0.18);
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + bevel, -h / 2 + bevel);
    s.lineTo(w / 2 - bevel, -h / 2 + bevel);
    s.lineTo(w / 2 - bevel, h / 2 - bevel);
    s.lineTo(-w / 2 + bevel, h / 2 - bevel);
    s.closePath();
    g = new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: true, bevelThickness: 0.01, bevelSize: bevel, bevelSegments: 2 });
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
    g.computeVertexNormals();
    rpCache.set(key, g);
  }
  return <mesh geometry={g} material={material} position={[0, 0, -0.006]} castShadow={false} receiveShadow />;
}

interface DoorProps {
  id: string;
  /** World position of the hinge at floor level. */
  hinge: [number, number, number];
  /** Rotation of the closed leaf about Y (0 = leaf extends along +x). */
  rotationY: number;
  width: number;
  height: number;
  open: boolean;
  /** +1 swings toward local −z (away from the viewer standing on +z), −1 the other way. */
  swing?: 1 | -1;
  maxAngle?: number;
  label: () => string | null;
  onUse: () => void;
  handleSide?: 1 | -1;
  plaqueText?: [string, string];
  material?: THREE.Material;
}

/** Animated, collidable, interactive door. */
export function Door({ id, hinge, rotationY, width, height, open, swing = 1, maxAngle = 1.65, label, onUse, handleSide = 1, plaqueText, material }: DoorProps) {
  const leaf = useRef<THREE.Group>(null!);
  const angle = useRef(0);
  const angVel = useRef(0);

  // Closed-door collider (axis-aligned bounds of the leaf).
  const collider = useMemo(() => {
    const dx = Math.cos(rotationY) * width;
    const dz = -Math.sin(rotationY) * width;
    const x0 = hinge[0];
    const z0 = hinge[2];
    const pad = 0.06;
    return box(Math.min(x0, x0 + dx) - pad, Math.max(x0, x0 + dx) + pad, Math.min(z0, z0 + dz) - pad, Math.max(z0, z0 + dz) + pad);
  }, [hinge, rotationY, width]);

  useEffect(() => {
    setDynamicCollider(`door:${id}`, collider, true);
    return () => removeDynamicCollider(`door:${id}`);
  }, [id, collider]);

  useFrame(() => {
    const dt = world.dt;
    if (dt === 0) return;
    const target = open ? maxAngle : 0;
    // Damped spring: heavy door with a little settle.
    const k = 9;
    const c = 5.2;
    const acc = (target - angle.current) * k - angVel.current * c;
    angVel.current += acc * dt;
    angle.current += angVel.current * dt;
    leaf.current.rotation.y = swing * angle.current;
    if (Math.abs(angVel.current) > 0.005) shadowClock.doorsMoving = 3;
    setDynamicCollider(`door:${id}`, collider, angle.current < 0.5);
  });

  return (
    <group position={hinge} rotation={[0, rotationY, 0]}>
      <group ref={leaf}>
        <Interactive id={id} label={label} onUse={onUse} maxDist={3}>
          <DoorLeaf width={width} height={height} handleSide={handleSide} material={material} />
          {plaqueText && (
            <mesh position={[width / 2, 1.62, 0.04]}>
              <planeGeometry args={[0.36, 0.135]} />
              <meshStandardMaterial map={plaque(plaqueText[0], plaqueText[1])} metalness={0.8} roughness={0.35} />
            </mesh>
          )}
        </Interactive>
      </group>
    </group>
  );
}
