import { describe, expect, it } from 'vitest';
import { box, removeDynamicCollider, resolveCircle, setDynamicActive, setDynamicCollider } from './collision';
import { CORRIDOR, HALL, MIRRORS, POSES, zoneAt } from './layout';

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
  });
});
