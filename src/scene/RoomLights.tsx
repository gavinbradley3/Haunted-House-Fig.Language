/**
 * Two point lights shared by the rooms added after the first two lessons.
 *
 * three.js compiles the number of lights into every material's shader, and every lit pixel
 * pays for every light. Instead of giving each new room its own lights (which would slow
 * the whole house), these two move to whichever new room can be seen and change colour to
 * suit it. Room directors can scale them (for example, the nursery dims at night).
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { game } from '../state/store';
import { world } from '../systems/time';
import { BALLROOM, DINING, ECHOES, KITCHEN, NURSERY, PRESS, STUDY } from '../world/layout';
import { flicker, lampLevel } from './parts/Lights';

type Lit = 'dining' | 'nursery' | 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study';
type Rig = { pos: [number, number, number]; color: string; intensity: number; distance: number; candle: boolean }[];

const RIGS: Record<Lit, Rig> = {
  dining: [
    { pos: [4.4, 1.75, DINING.table.z + 0.3], color: '#ffb066', intensity: 7, distance: 10, candle: true },
    { pos: [9.2, 2.0, DINING.table.z - 0.2], color: '#ffa65a', intensity: 9, distance: 11, candle: true },
  ],
  nursery: [
    { pos: [NURSERY.bed.x + 1.0, 1.3, NURSERY.bed.z + 0.7], color: '#ffb470', intensity: 5.5, distance: 8, candle: true },
    { pos: [NURSERY.x0 + 1.4, 2.3, NURSERY.window.z + 1.0], color: '#9db2d8', intensity: 11, distance: 11, candle: false },
  ],
  // A candle on the piano, and cold moonlight from the east window.
  echoes: [
    { pos: [ECHOES.piano.x + 0.6, 1.7, ECHOES.piano.z + 0.4], color: '#ffb36a', intensity: 7, distance: 10, candle: true },
    { pos: [ECHOES.x1 - 1.0, 2.4, -34.0], color: '#9fb0d6', intensity: 10, distance: 11, candle: false },
  ],
  // A hanging lamp over the press, and a lamp over the type cases.
  press: [
    { pos: [PRESS.press.x, 2.7, PRESS.press.z + 0.6], color: '#ffbe78', intensity: 9, distance: 11, candle: true },
    { pos: [PRESS.cases.x, 2.2, PRESS.cases.z + 1.0], color: '#ffad62', intensity: 5, distance: 8, candle: true },
  ],
  // A lamp over the table, and the glow of the range.
  kitchen: [
    { pos: [KITCHEN.table.x, 2.3, KITCHEN.table.z], color: '#ffc27a', intensity: 8, distance: 10, candle: true },
    { pos: [KITCHEN.pot.x - 0.4, 0.9, KITCHEN.pot.z], color: '#ff8a3a', intensity: 5, distance: 7, candle: true },
  ],
  // Two pools of light in a tall room: warm under the first chandelier, cold under the second.
  ballroom: [
    { pos: [BALLROOM.dancers.x, 3.6, -22.6], color: '#ffc58a', intensity: 13, distance: 14, candle: true },
    { pos: [BALLROOM.dancers.x, 3.6, -28.4], color: '#a9b8e0', intensity: 12, distance: 14, candle: false },
  ],
  // The desk lamp, and moonlight from the west window.
  study: [
    { pos: [STUDY.desk.x + 0.7, 1.35, STUDY.desk.z + 0.3], color: '#ffb86e', intensity: 6, distance: 9, candle: true },
    { pos: [STUDY.x0 + 1.2, 2.5, -9.0], color: '#9db2d8', intensity: 8, distance: 10, candle: false },
  ],
};

/** Per-room brightness multiplier set by the room directors (1 = normal). */
export const roomLightLevel: Record<Lit, number> = { dining: 1, nursery: 1, echoes: 1, press: 1, kitchen: 1, ballroom: 1, study: 1 };

/** Which new room the shared lights should light right now, if any. */
function litRoom(cameraX: number): Lit | null {
  const s = game();
  const z = s.zone;
  if (z === 'dining' || z === 'nursery' || z === 'echoes' || z === 'press' || z === 'kitchen' || z === 'ballroom' || z === 'study') return z;
  if (z === 'corridor' && s.doors.dining) return 'dining';
  if (z === 'mirrors' && s.doors.jib) return 'nursery';
  if (z === 'hall') {
    // Both side doors may be open: light the one on the player's side of the hall.
    if (s.doors.study && (cameraX < 0 || !s.doors.kitchen)) return 'study';
    if (s.doors.kitchen) return 'kitchen';
  }
  return null;
}

export function RoomLights() {
  const camera = useThree((s) => s.camera);
  const a = useRef<THREE.PointLight>(null!);
  const b = useRef<THREE.PointLight>(null!);
  const level = useRef(0);
  const current = useRef<Lit | null>(null);
  useFrame(() => {
    const room = litRoom(camera.position.x);
    // Fade out before moving, fade in after, so the lights never jump visibly.
    if (room !== current.current && (level.current < 0.05 || !current.current)) current.current = room;
    const target = room && room === current.current ? 1 : 0;
    level.current += (target - level.current) * (1 - Math.exp(-(world.dt || 0.016) * 4));
    const rig = current.current ? RIGS[current.current] : null;
    [a.current, b.current].forEach((l, i) => {
      if (!rig) {
        l.intensity = 0;
        return;
      }
      const r = rig[i];
      l.position.set(...r.pos);
      l.color.set(r.color);
      l.distance = r.distance;
      const f = r.candle ? flicker(world.t, i * 3.1 + 7) * lampLevel(world.t, i) : 1;
      l.intensity = r.intensity * f * level.current * roomLightLevel[current.current!];
    });
  });
  return (
    <group>
      <pointLight ref={a} intensity={0} decay={2} distance={10} />
      <pointLight ref={b} intensity={0} decay={2} distance={10} />
    </group>
  );
}
