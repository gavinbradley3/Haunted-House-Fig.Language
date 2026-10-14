/** Pausable world clock. Animations read `world.t` so the teacher's Pause freezes the house. */
export const world = { t: 0, dt: 0 };

/** Shadow refresh bookkeeping (see ShadowScheduler). Doors bump `doorsMoving` while swinging. */
export const shadowClock = { t: 0, doorsMoving: 0 };

/** Live camera pose, published by the Player each frame for cinematics to start from. */
export const liveCamera = { position: [0, 1.65, 0] as [number, number, number], forward: [0, 0, -1] as [number, number, number] };
