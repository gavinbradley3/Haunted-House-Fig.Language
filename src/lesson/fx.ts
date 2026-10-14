/**
 * Mutable effect state for the Hall of Mirrors, written by the LessonDirector
 * and read every frame by mirror shaders, curtains and lights.
 */
export interface MirrorFx {
  bright: number;
  brightTarget: number;
  mist: number;
  mistTarget: number;
  tunnel: number;
  tunnelTarget: number;
  ripple: number;
  text: string;
  textAmt: number;
}

const mk = (): MirrorFx => ({
  bright: 0,
  brightTarget: 0,
  mist: 0,
  mistTarget: 0,
  tunnel: 0,
  tunnelTarget: 0,
  ripple: 0,
  text: '',
  textAmt: 0,
});

export const fx = {
  speaking: mk(),
  tunnel: mk(),
  /** Spotlight on the mantel clock (0..1). */
  clockLight: 0,
  clockLightTarget: 0,
  /** Drawer with the key (0 closed .. 1 open). */
  drawer: 0,
  drawerTarget: 0,
  /** Hidden door opening amount 0..1. */
  jib: 0,
  jibTarget: 0,
  /** Warm light glowing behind the hidden door. */
  jibGlow: 0,
};

export function pulseRipple(m: MirrorFx, amount = 1) {
  m.ripple = Math.max(m.ripple, amount);
}

export function resetFx() {
  Object.assign(fx.speaking, mk());
  Object.assign(fx.tunnel, mk());
  fx.clockLight = fx.clockLightTarget = 0;
  fx.drawer = fx.drawerTarget = 0;
  fx.jib = fx.jibTarget = 0;
  fx.jibGlow = 0;
}
