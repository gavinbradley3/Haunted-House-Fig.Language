/** Light fixtures: candle flames, wall sconces, chandeliers, lanterns. All flicker gently. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { boxGeo, latheGeo, LATHES } from '../../systems/geometry';
import { mats } from '../../systems/materials';
import { softDot } from '../../systems/textures';
import { world } from '../../systems/time';

/** Smooth, organic candle flicker in ~[0.82, 1.08]. */
export function flicker(t: number, seed: number) {
  return (
    0.95 +
    Math.sin(t * 7.3 + seed) * 0.035 +
    Math.sin(t * 13.1 + seed * 2.1) * 0.025 +
    Math.sin(t * 23.7 + seed * 3.7) * 0.015 +
    (Math.sin(t * 2.1 + seed) > 0.97 ? -0.08 : 0)
  );
}

/** Global multiplier so lesson moments can dim or brighten all candles in a room. */
export const lightMood = { hall: 1, mirrors: 1, mirrorsTarget: 1 };

const flameGeo = new THREE.SphereGeometry(0.012, 10, 8);
flameGeo.scale(1, 2.6, 1);
flameGeo.translate(0, 0.026, 0);

export function Flame({ seed = 0, scale = 1, halo = true }: { seed?: number; scale?: number; halo?: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const spriteMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: new THREE.Color('#ffb05a'),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useFrame(() => {
    const f = flicker(world.t, seed);
    ref.current.scale.set(scale * (0.9 + (f - 0.95) * 1.5), scale * f, scale * (0.9 + (f - 0.95) * 1.5));
    ref.current.rotation.z = Math.sin(world.t * 3 + seed) * 0.06;
  });
  return (
    <group ref={ref}>
      <mesh geometry={flameGeo} material={mats().flame} />
      {halo && <sprite material={spriteMat} scale={[0.16, 0.16, 0.16]} position={[0, 0.03, 0]} />}
    </group>
  );
}

function Candle({ seed, height = 0.12 }: { seed: number; height?: number }) {
  return (
    <group>
      <mesh material={mats().wax} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.011, 0.012, height, 12]} />
      </mesh>
      <group position={[0, height + 0.004, 0]}>
        <Flame seed={seed} />
      </group>
    </group>
  );
}

/** Flickering point light that follows the global room mood. */
export function CandleLight({
  position,
  intensity,
  distance = 7,
  color = '#ffad5c',
  seed = 0,
  room = 'hall',
  castShadow = false,
}: {
  position: [number, number, number];
  intensity: number;
  distance?: number;
  color?: string;
  seed?: number;
  room?: 'hall' | 'mirrors';
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(() => {
    ref.current.intensity = intensity * flicker(world.t, seed) * lightMood[room];
  });
  return (
    <pointLight
      ref={ref}
      position={position}
      intensity={intensity}
      distance={distance}
      decay={2}
      color={color}
      castShadow={castShadow}
      shadow-mapSize={[512, 512]}
      shadow-bias={-0.002}
      shadow-radius={6}
    />
  );
}

/** Brass wall sconce with two candles and a light. Place in an OnWall frame. */
export function Sconce({ x, y = 1.85, seed = 0, intensity = 2.2, room = 'hall', light = true }: { x: number; y?: number; seed?: number; intensity?: number; room?: 'hall' | 'mirrors'; light?: boolean }) {
  const m = mats();
  const armCurve = useMemo(() => {
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.06, 0.08), new THREE.Vector3(0.0, 0.0, 0.16), new THREE.Vector3(0, 0.05, 0.18)];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.008, 8, false);
  }, []);
  const cup = latheGeo('sconceCup', [
    [0, 0],
    [0.03, 0],
    [0.04, 0.015],
    [0.03, 0.03],
    [0.014, 0.035],
    [0, 0.035],
  ]);
  const shade = latheGeo('sconceShade', [
    [0.03, 0],
    [0.045, 0.04],
    [0.05, 0.09],
    [0.04, 0.13],
    [0.036, 0.135],
  ]);
  return (
    <group position={[x, y, 0]}>
      <mesh geometry={boxGeo(0.09, 0.26, 0.02)} material={m.brass} position={[0, 0, 0.01]} castShadow />
      <mesh geometry={latheGeo('sconceBoss', LATHES.knob)} material={m.brass} position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.1, 0, 0]} rotation={[0, 0, 0]}>
          <group rotation={[0, 0, (-s * Math.PI) / 9]}>
            <mesh geometry={armCurve} material={m.brass} position={[-s * 0.05, 0, 0.02]} castShadow />
          </group>
          <group position={[0, 0.06, 0.19]}>
            <mesh geometry={cup} material={m.brass} />
            <group position={[0, 0.03, 0]}>
              <Candle seed={seed + s} height={0.08} />
            </group>
            <mesh geometry={shade} material={m.lampGlass} position={[0, 0.03, 0]} />
          </group>
        </group>
      ))}
      {light && <CandleLight position={[0, 0.15, 0.3]} intensity={intensity} distance={6} seed={seed} room={room} />}
    </group>
  );
}

/** Brass chandelier with candle arms. Position is the ceiling attachment point. */
export function Chandelier({
  position,
  drop = 1.4,
  arms = 8,
  radius = 0.55,
  intensity = 18,
  seed = 0,
  room = 'hall',
  castShadow = false,
}: {
  position: [number, number, number];
  drop?: number;
  arms?: number;
  radius?: number;
  intensity?: number;
  seed?: number;
  room?: 'hall' | 'mirrors';
  castShadow?: boolean;
}) {
  const m = mats();
  const body = latheGeo('chandBody', [
    [0, 0],
    [0.05, 0],
    [0.09, 0.05],
    [0.12, 0.12],
    [0.1, 0.18],
    [0.05, 0.22],
    [0.03, 0.3],
    [0.05, 0.36],
    [0.035, 0.42],
    [0.02, 0.5],
    [0, 0.52],
  ]);
  const arm = useMemo(() => {
    const pts = [
      new THREE.Vector3(0.05, 0.14, 0),
      new THREE.Vector3(radius * 0.5, 0.0, 0),
      new THREE.Vector3(radius * 0.9, 0.06, 0),
      new THREE.Vector3(radius, 0.2, 0),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 8, false);
  }, [radius]);
  const cup = latheGeo('chandCup', [
    [0, 0],
    [0.025, 0],
    [0.045, 0.02],
    [0.05, 0.03],
    [0.02, 0.03],
    [0, 0.03],
  ]);
  const crystal = useMemo(() => new THREE.OctahedronGeometry(0.018, 0), []);
  return (
    <group position={position}>
      <mesh material={m.brass} position={[0, -drop / 2 + 0.1, 0]}>
        <cylinderGeometry args={[0.007, 0.007, drop - 0.2, 6]} />
      </mesh>
      <group position={[0, -drop, 0]}>
        <mesh geometry={body} material={m.brass} castShadow />
        {Array.from({ length: arms }, (_, i) => {
          const a = (i / arms) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh geometry={arm} material={m.brass} castShadow />
              <group position={[radius, 0.2, 0]}>
                <mesh geometry={cup} material={m.brass} />
                <group position={[0, 0.03, 0]}>
                  <Candle seed={seed + i * 1.3} height={0.1} />
                </group>
                <mesh geometry={crystal} material={m.glass} position={[0, -0.05, 0]} scale={[1, 1.8, 1]} />
              </group>
            </group>
          );
        })}
      </group>
      <CandleLight position={[0, -drop + 0.35, 0]} intensity={intensity} distance={14} seed={seed} room={room} castShadow={castShadow} />
    </group>
  );
}

/** Exterior carriage lantern with a warm glow. */
export function Lantern({ position, intensity = 3, seed = 0 }: { position: [number, number, number]; intensity?: number; seed?: number }) {
  const m = mats();
  return (
    <group position={position}>
      <mesh geometry={boxGeo(0.06, 0.06, 0.25)} material={m.iron} position={[0, 0.12, -0.12]} />
      <mesh geometry={boxGeo(0.22, 0.03, 0.22)} material={m.iron} position={[0, 0, 0]} />
      <mesh geometry={boxGeo(0.18, 0.3, 0.18)} material={m.lampGlass} position={[0, 0.16, 0]} />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([a, b], i) => (
        <mesh key={i} geometry={boxGeo(0.012, 0.32, 0.012)} material={m.iron} position={[a * 0.095, 0.16, b * 0.095]} />
      ))}
      <mesh material={m.iron} position={[0, 0.36, 0]}>
        <coneGeometry args={[0.17, 0.12, 4]} />
      </mesh>
      {intensity > 0 && <CandleLight position={[0, 0.18, 0.15]} intensity={intensity} distance={8} seed={seed} />}
    </group>
  );
}
