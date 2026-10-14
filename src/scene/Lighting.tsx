/**
 * Global lighting rig. Lights stay in the scene permanently (so shaders never
 * recompile mid-game); zone changes fade intensities instead of toggling lights.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { game } from '../state/store';
import { world } from '../systems/time';
import { EXTERIOR } from '../world/layout';
import { MOON_DIR } from './Sky';
import { flicker } from './parts/Lights';

function useTarget(light: React.RefObject<THREE.SpotLight | THREE.DirectionalLight | null>, target: [number, number, number]) {
  const { scene } = useThree();
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(...target);
    scene.add(l.target);
    return () => void scene.remove(l.target);
  }, [light, target, scene]);
}

const MOON_COL = '#93a8cc';

export function Lighting() {
  const extMoon = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const porch = useRef<THREE.PointLight>(null);
  const hallMoon = useRef<THREE.SpotLight>(null);
  const mirrorMoon = useRef<THREE.SpotLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();

  const extMoonPos: [number, number, number] = [MOON_DIR.x * 40, MOON_DIR.y * 40, MOON_DIR.z * 40 - 4];
  useTarget(extMoon, [0, 0, 2]);
  useTarget(fill, [0, 3, 0]);
  useTarget(hallMoon, [0.6, 0, -4.2]);
  useTarget(mirrorMoon, [-0.6, 0, -25.2]);

  const levels = useRef({ ext: 1, hall: 1, mirrors: 0 });

  useFrame(() => {
    const s = game();
    const z = s.zone;
    const want = {
      ext: z === 'exterior' ? 1 : z === 'hall' ? 0.25 : 0,
      hall: z === 'exterior' || z === 'hall' || z === 'corridor' ? 1 : 0,
      mirrors: z === 'mirrors' || z === 'corridor' ? 1 : 0,
    };
    const k = 1 - Math.exp(-(world.dt || 0.016) * 2.5);
    const L = levels.current;
    L.ext += (want.ext - L.ext) * k;
    L.hall += (want.hall - L.hall) * k;
    L.mirrors += (want.mirrors - L.mirrors) * k;
    if (extMoon.current) extMoon.current.intensity = 0.55 * L.ext;
    if (fill.current) fill.current.intensity = 0.16 * L.ext;
    if (porch.current) porch.current.intensity = 7 * flicker(world.t, 9) * Math.max(L.ext, 0.3);
    if (hallMoon.current) hallMoon.current.intensity = 160 * L.hall;
    if (mirrorMoon.current) mirrorMoon.current.intensity = 260 * L.mirrors;
    if (hemi.current) hemi.current.intensity = z === 'exterior' ? 0.6 : 0.32;
    // Night fog outside, faint dusty haze inside
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      const target = z === 'exterior' ? 0.028 : 0.012;
      fog.density += (target - fog.density) * k;
    }
  });

  return (
    <group>
      <hemisphereLight ref={hemi} args={['#3a4660', '#1d140c', 0.18]} />
      <directionalLight
        ref={extMoon}
        position={extMoonPos}
        color={MOON_COL}
        intensity={0.55}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
      />
      <directionalLight ref={fill} position={[4, 6, 30]} color="#7c8fb3" intensity={0.16} />
      <pointLight ref={porch} position={[0, 2.5, EXTERIOR.facadeZ + 0.9]} color="#ffad5c" intensity={7} distance={12} decay={2} />
      {/* Moonlight through the hall's front windows */}
      <spotLight
        ref={hallMoon}
        position={[-6.5, 8.2, 11]}
        color={MOON_COL}
        intensity={160}
        angle={0.62}
        penumbra={0.6}
        distance={40}
        decay={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={2}
        shadow-camera-far={40}
      />
      {/* Moonlight through the Hall of Mirrors window, behind the curtains */}
      <spotLight
        ref={mirrorMoon}
        position={[1.6, 6.4, -39]}
        color={MOON_COL}
        intensity={0}
        angle={0.34}
        penumbra={0.75}
        distance={40}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={4}
        shadow-camera-far={30}
      />
    </group>
  );
}
