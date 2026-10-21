/**
 * Two point lights shared by most of the rooms.
 *
 * three.js compiles the number of lights into every material's shader, and every lit pixel
 * pays for every light, even one switched off in a room nobody can see. Instead of giving each
 * room its own lights, these two move to whichever room can be seen and change colour to suit
 * it. They light the Portrait Gallery (in place of its old ceiling area light and two candles),
 * the Hall of Mirrors' lesson glows, and every room added after the first two lessons.
 * Room directors can scale them (for example, the nursery dims at night).
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fx } from '../lesson/fx';
import { game } from '../state/store';
import { world } from '../systems/time';
import { BALLROOM, BOUDOIR, DINING, ECHOES, GALLERY, KITCHEN, MIRRORS, NURSERY, PRESS, RECORDS, STUDY, UPSTAIRS } from '../world/layout';
import { flicker, lampLevel, stutterAt } from './parts/Lights';

type Lit = 'gallery' | 'mirrors' | 'dining' | 'nursery' | 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study' | 'records' | 'boudoir';
type Rig = {
  pos: [number, number, number];
  color: string;
  intensity: number;
  distance: number;
  candle: boolean;
  /** Extra brightness factor read every frame (lesson glows); 1 when absent. */
  level?: () => number;
}[];

const GALLERY_C = { x: (GALLERY.x0 + GALLERY.x1) / 2, z: -14.1 };

const RIGS: Record<Lit, Rig> = {
  // Pale moonlight falling from the laylight, and a candle in the middle of the room.
  gallery: [
    { pos: [GALLERY_C.x, GALLERY.height - 0.6, GALLERY_C.z], color: '#a6b6cf', intensity: 26, distance: 11, candle: false },
    { pos: [GALLERY_C.x, 2.6, GALLERY_C.z], color: '#ffad5c', intensity: 5, distance: 10, candle: true },
  ],
  // The Hall of Mirrors has its own lights; these are only its lesson glows (the clock, the speaking mirror).
  mirrors: [
    { pos: [MIRRORS.x1 - 0.9, 1.75, MIRRORS.clock.z + 0.25], color: '#ffcf8a', intensity: 2.6, distance: 3, candle: false, level: () => fx.clockLight },
    { pos: [MIRRORS.x1 - 0.7, 2.6, MIRRORS.speaking.z], color: '#d8d2c4', intensity: 3.5, distance: 5, candle: false, level: () => fx.speaking.bright },
  ],
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
  // The Last Dance, upstairs. The Guest Records room: candlelight over the guest book, and the desk candle.
  records: [
    { pos: [RECORDS.ledger.x - 0.3, UPSTAIRS.y + 2.1, RECORDS.ledger.z + 0.7], color: '#ffb066', intensity: 6.5, distance: 8, candle: true },
    { pos: [RECORDS.desk.x + 0.55, UPSTAIRS.y + 1.25, RECORDS.desk.z - 0.2], color: '#ffa65a', intensity: 3.2, distance: 6, candle: true },
  ],
  // The Lady's room: the vanity candle (on the glass and on you as you look into it), and moonlight at the window.
  boudoir: [
    { pos: [BOUDOIR.vanity.x - 0.35, UPSTAIRS.y + 1.45, BOUDOIR.vanity.z + 0.85], color: '#ffb470', intensity: 5, distance: 7, candle: true },
    { pos: [BOUDOIR.x0 + 0.9, UPSTAIRS.y + 2.2, BOUDOIR.window.z], color: '#9db2d8', intensity: 6, distance: 7.5, candle: false },
  ],
};

/** Per-room brightness multiplier set by the room directors (1 = normal). */
export const roomLightLevel: Record<Lit, number> = { gallery: 1, mirrors: 1, dining: 1, nursery: 1, echoes: 1, press: 1, kitchen: 1, ballroom: 1, study: 1, records: 1, boudoir: 1 };

const forward = new THREE.Vector3();

/**
 * Which room the shared lights should light right now, if any. Where two lit rooms can be seen
 * through open doors (both side doors of the corridor or of the hall), light the one the player
 * is facing; `current` keeps the choice steady while the player looks straight ahead.
 */
function litRoom(camera: THREE.Camera, current: Lit | null): Lit | null {
  const s = game();
  const z = s.zone;
  if (z === 'gallery' || z === 'dining' || z === 'nursery' || z === 'echoes' || z === 'press' || z === 'kitchen' || z === 'ballroom' || z === 'study' || z === 'records' || z === 'boudoir') return z;
  camera.getWorldDirection(forward);
  const pick = (west: Lit, east: Lit, westOpen: boolean, eastOpen: boolean): Lit | null => {
    if (westOpen && eastOpen) {
      if (forward.x < -0.25) return west;
      if (forward.x > 0.25) return east;
      return current === west || current === east ? current : west;
    }
    return westOpen ? west : eastOpen ? east : null;
  };
  if (z === 'corridor') return pick('gallery', 'dining', s.doors.gallery, s.doors.dining);
  // On the upper landing, the open doors are the Last Dance's two rooms.
  if (z === 'hall' && s.upstairs) return pick('boudoir', 'records', s.doors.boudoir, s.doors.records);
  if (z === 'hall') return pick('study', 'kitchen', s.doors.study, s.doors.kitchen);
  if (z === 'mirrors') {
    // The mirror lesson's glows win over the view into the nursery.
    const glowing = fx.clockLight > 0.01 || fx.speaking.bright > 0.01;
    return !glowing && s.doors.jib ? 'nursery' : 'mirrors';
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
    const room = litRoom(camera, current.current);
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
      const f = r.candle ? flicker(world.t, i * 3.1 + 7) * lampLevel(world.t, i) * stutterAt(r.pos[0], r.pos[2]) : 1;
      l.intensity = r.intensity * f * (r.level ? r.level() : 1) * level.current * roomLightLevel[current.current!];
    });
  });
  return (
    <group>
      <pointLight ref={a} intensity={0} decay={2} distance={10} />
      <pointLight ref={b} intensity={0} decay={2} distance={10} />
    </group>
  );
}
