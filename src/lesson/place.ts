/**
 * Where a returning student may be put back: pure, so it can be tested without the 3D scene.
 */
import type { DoorId } from '../state/store';
import type { Place } from '../state/save';
import { isUnlocked, type LockId, type Progress } from './progression';
import { boxesFor, resolveCircle } from '../world/collision';
import { EYE_HEIGHT, HALL, POSES, upstairsZoneAt, zoneAt, type Pose, type Zone } from '../world/layout';

/** The locked door a student must have opened to be in each room, and the door to leave open. */
const ZONE_ACCESS: Partial<Record<Zone, { lock: 'gallery' | LockId | null; door: DoorId }>> = {
  mirrors: { lock: null, door: 'mirror' },
  gallery: { lock: 'gallery', door: 'gallery' },
  dining: { lock: 'dining', door: 'dining' },
  nursery: { lock: 'nursery', door: 'jib' },
  echoes: { lock: 'echoes', door: 'echoes' },
  press: { lock: 'press', door: 'press' },
  kitchen: { lock: 'kitchen', door: 'kitchen' },
  ballroom: { lock: 'ballroom', door: 'ballroom' },
  study: { lock: 'study', door: 'study' },
};

export interface SafePlace {
  pose: Pose;
  zone: Zone;
  door: DoorId | null;
  /** True if the saved place was used; false if the student was put in the hall instead. */
  restored: boolean;
}

/** The Last Dance's rooms upstairs: the discovery that opened each one, and its door. */
const UPSTAIRS_ACCESS = { records: { flag: 'ldDoor1', door: 'records' }, boudoir: { flag: 'ldDoor2', door: 'boudoir' } } as const;

/** Where to put a returning student. Pure, so it can be tested. */
export function safePlace(place: Place | null, p: Progress, found: Record<string, boolean> = {}): SafePlace {
  const hall: SafePlace = { pose: POSES.hallStart, zone: 'hall', door: null, restored: false };
  if (!place) return hall;
  // Upstairs: on the landing, or in one of the Last Dance's rooms (if its door has been opened).
  if (place.upstairs) {
    const [ux, uz] = resolveCircle(place.x, place.z, undefined, boxesFor('upper'));
    if (Math.hypot(ux - place.x, uz - place.z) > 0.4) return hall;
    const room = upstairsZoneAt(uz, ux);
    if (room && !found[UPSTAIRS_ACCESS[room].flag]) return hall;
    if (!room && (uz < HALL.zBack || uz > HALL.landing.zEdge)) return hall;
    return {
      pose: { position: [ux, HALL.landing.y + EYE_HEIGHT, uz], yaw: place.yaw, pitch: 0 },
      zone: room ?? 'hall',
      door: room ? UPSTAIRS_ACCESS[room].door : null,
      restored: true,
    };
  }
  const [x, z] = resolveCircle(place.x, place.z);
  // Pushed far by a wall or furniture means the position no longer makes sense.
  if (Math.hypot(x - place.x, z - place.z) > 0.4) return hall;
  const zone = zoneAt(z, x);
  if (zone === 'exterior') return hall;
  const access = ZONE_ACCESS[zone];
  if (access?.lock && !isUnlocked(p, access.lock)) return hall;
  const upstairs = place.upstairs && zone === 'hall';
  return {
    pose: { position: [x, upstairs ? HALL.landing.y + EYE_HEIGHT : EYE_HEIGHT, z], yaw: place.yaw, pitch: 0 },
    zone,
    door: access?.door ?? null,
    restored: true,
  };
}
