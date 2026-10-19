import { describe, expect, it } from 'vitest';
import { boxesFor, floorAfter, resolveCircle } from './collision';
import { HALL, inStair, stairHeight, surfaceAt, zoneAt } from './layout';

const S = HALL.stair;
const L = HALL.landing;
const midX = (S.x0 + S.x1) / 2;

describe('the entrance hall stairs and the upper landing', () => {
  it('the stairs rise from the hall floor to the landing', () => {
    expect(stairHeight(S.zStart)).toBe(0);
    expect(stairHeight(S.zEnd)).toBeCloseTo(L.y);
    expect(stairHeight((S.zStart + S.zEnd) / 2)).toBeCloseTo(L.y / 2);
  });

  it('you step onto the stairs from the bottom, and onto the landing from the top', () => {
    expect(floorAfter('ground', midX, S.zStart - 0.1)).toBe('stair');
    expect(floorAfter('stair', midX, S.zEnd - 0.1)).toBe('upper');
    expect(floorAfter('stair', midX, S.zStart + 0.1)).toBe('ground');
    expect(floorAfter('upper', midX, S.zEnd + 0.1)).toBe('stair');
    expect(floorAfter('upper', 2, -9)).toBe('upper');
  });

  it('from the ground floor the stairs cannot be entered from the side or from under the landing', () => {
    // Walking at the open side of the stairs, halfway up: the balustrade side is closed.
    const [x] = resolveCircle(S.x1 + 0.2, -4.5, undefined, boxesFor('ground'));
    expect(x).toBeGreaterThan(S.x1);
    expect(inStair(x, -4.5)).toBe(false);
    // Under the landing, by the study door, walking toward the back of the stairs.
    const [, z] = resolveCircle(midX, S.zEnd - 0.1, undefined, boxesFor('ground'));
    expect(z).toBeLessThan(S.zEnd);
  });

  it('the landing balustrade and walls keep you on the landing', () => {
    const up = boxesFor('upper');
    // Walking into the balustrade from the landing side (each frame moves at most ~17 cm).
    const [, z] = resolveCircle(2, L.zEdge - 0.15, undefined, up);
    expect(z).toBeLessThanOrEqual(L.zEdge - 0.27);
    const [, zb] = resolveCircle(2, HALL.zBack + 0.15, undefined, up);
    expect(zb).toBeGreaterThanOrEqual(HALL.zBack + 0.27);
    const [xe] = resolveCircle(HALL.x1 + 0.1, -9, undefined, up);
    expect(xe).toBeLessThan(HALL.x1);
  });

  it('upstairs, the corridor opening and the study door below do not exist', () => {
    // Straight through the back wall where the corridor arch is on the ground floor.
    const [, z] = resolveCircle(0, HALL.zBack + 0.1, undefined, boxesFor('upper'));
    expect(z).toBeGreaterThanOrEqual(HALL.zBack + 0.27);
    const [x] = resolveCircle(HALL.x0 + 0.1, -8.8, undefined, boxesFor('upper'));
    expect(x).toBeGreaterThanOrEqual(HALL.x0 + 0.27);
  });

  it('the landing is part of the entrance hall, and the stair runner is carpet', () => {
    expect(zoneAt(-9, 0)).toBe('hall');
    expect(surfaceAt(midX, -4)).toBe('carpet');
  });
});
