import { describe, expect, it } from 'vitest';
import { box, removeDynamicCollider, resolveCircle, setDynamicActive, setDynamicCollider } from './collision';
import { BALLROOM, CORRIDOR, DINING, ECHOES, HALL, KITCHEN, MIRRORS, NURSERY, POSES, PRESS, STUDY, zoneAt } from './layout';

describe('collision', () => {
  it('pushes the player out of a wall', () => {
    const b = [box(-1, 1, -0.1, 0.1)];
    const [, z] = resolveCircle(0, 0.2, 0.3, b);
    expect(z).toBeCloseTo(0.4, 5);
  });

  it('resolves a centre that is fully inside a box', () => {
    const b = [box(-1, 1, -1, 1)];
    const [x, z] = resolveCircle(0.9, 0, 0.3, b);
    expect(x).toBeCloseTo(1.3, 5);
    expect(z).toBe(0);
  });

  it('cannot walk through the hall side wall', () => {
    // A step that would put the player's body into the wall gets pushed back.
    const [x] = resolveCircle(HALL.x1 - 0.1, -8);
    expect(x).toBeCloseTo(HALL.x1 - 0.28, 5);
  });

  it('lets the player pass through the corridor opening', () => {
    const [x, z] = resolveCircle(0, HALL.zBack - 0.15);
    expect(x).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(HALL.zBack - 0.15, 5);
  });

  it('a closed door blocks and an open door does not', () => {
    const z = CORRIDOR.zEnd;
    setDynamicCollider('test-door', box(-0.7, 0.7, z - 0.05, z + 0.05), true);
    const [, zBlocked] = resolveCircle(0, z + 0.1);
    expect(zBlocked).toBeGreaterThan(z + 0.2);
    setDynamicActive('test-door', false);
    const [, zFree] = resolveCircle(0, z + 0.1);
    expect(zFree).toBeCloseTo(z + 0.1, 5);
    removeDynamicCollider('test-door');
  });

  it('spawn poses are not inside geometry', () => {
    for (const p of Object.values(POSES)) {
      const [x, z] = resolveCircle(p.position[0], p.position[2]);
      expect(x).toBeCloseTo(p.position[0], 5);
      expect(z).toBeCloseTo(p.position[2], 5);
    }
  });
});

describe('zones', () => {
  it('maps z positions to rooms', () => {
    expect(zoneAt(4)).toBe('exterior');
    expect(zoneAt(-3)).toBe('hall');
    expect(zoneAt(-14)).toBe('corridor');
    expect(zoneAt(MIRRORS.zStart - 1)).toBe('mirrors');
    expect(zoneAt(-14, -6)).toBe('gallery');
    expect(zoneAt(-14, 0)).toBe('corridor');
    expect(zoneAt(-14, 6)).toBe('dining');
    expect(zoneAt(-23, -8)).toBe('nursery');
    expect(zoneAt(-23, 0)).toBe('mirrors');
  });

  it('every room entry pose is inside its own zone', () => {
    expect(zoneAt(POSES.diningEntry.position[2], POSES.diningEntry.position[0])).toBe('dining');
    expect(zoneAt(POSES.nurseryEntry.position[2], POSES.nurseryEntry.position[0])).toBe('nursery');
    expect(zoneAt(POSES.finaleEntry.position[2], POSES.finaleEntry.position[0])).toBe('hall');
  });
});

describe('new doorways', () => {
  it('the dining room doorway and the hidden door are passable when their doors are open', () => {
    const [x] = resolveCircle(CORRIDOR.x1 + 0.15, DINING.doorZ);
    expect(x).toBeCloseTo(CORRIDOR.x1 + 0.15, 5);
    const [x2] = resolveCircle(MIRRORS.x0 - 0.15, MIRRORS.jibDoor.z);
    expect(x2).toBeCloseTo(MIRRORS.x0 - 0.15, 5);
  });
});

describe('the five later rooms', () => {
  const rooms = [
    ['echoes', ECHOES],
    ['press', PRESS],
    ['kitchen', KITCHEN],
    ['ballroom', BALLROOM],
    ['study', STUDY],
  ] as const;

  it('the middle of each room is in its own zone', () => {
    for (const [id, r] of rooms) expect(zoneAt((r.zN + r.zS) / 2, (r.x0 + r.x1) / 2)).toBe(id);
  });

  it('entry and key poses are inside their own rooms', () => {
    for (const [id] of rooms) {
      for (const p of [POSES[`${id}Entry` as keyof typeof POSES], POSES[`${id}Key` as keyof typeof POSES]]) {
        expect(zoneAt(p.position[2], p.position[0])).toBe(id);
      }
    }
  });

  it('each doorway can be walked through (doors open)', () => {
    // A line of steps straight through each doorway, from one room into the next.
    const paths: [number, number, number, number][] = [
      [HALL.x0 + 0.6, STUDY.doorZ, STUDY.x1 - 0.6, STUDY.doorZ], // hall -> study
      [HALL.x1 - 0.6, KITCHEN.doorZ, KITCHEN.x0 + 0.6, KITCHEN.doorZ], // hall -> kitchen
      [ECHOES.doorX, NURSERY.zS + 0.6, ECHOES.doorX, ECHOES.zN - 0.6], // nursery -> echoes
      [ECHOES.x0 + 0.6, PRESS.doorZ, PRESS.x1 - 0.6, PRESS.doorZ], // echoes -> press
      [BALLROOM.doorX, DINING.zS + 0.6, BALLROOM.doorX, BALLROOM.zN - 0.6], // dining -> ballroom
    ];
    for (const [ax, az, bx, bz] of paths) {
      for (let i = 0; i <= 12; i++) {
        const x = ax + ((bx - ax) * i) / 12;
        const z = az + ((bz - az) * i) / 12;
        const [rx, rz] = resolveCircle(x, z);
        expect([x, z, Math.hypot(rx - x, rz - z) < 1e-6]).toEqual([x, z, true]);
      }
    }
  });

  it('the shared walls are solid away from the doorways', () => {
    const [x] = resolveCircle(HALL.x0 + 0.1, -9.75);
    expect(x).toBeGreaterThan(HALL.x0 + 0.2);
    const [, z] = resolveCircle(-7.4, NURSERY.zS + 0.1);
    expect(z).toBeGreaterThan(NURSERY.zS + 0.2);
    const [, z2] = resolveCircle(3.0, DINING.zS + 0.1);
    expect(z2).toBeGreaterThan(DINING.zS + 0.2);
  });
});
