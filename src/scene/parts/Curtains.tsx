/**
 * The velvet curtains in the Hall of Mirrors. Their movement is driven by the
 * sentence the class is looking at, so figurative language visibly changes the room.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CurtainMood } from '../../content/simile';
import { mats } from '../../systems/materials';
import { vnoise } from '../../systems/noise';
import { world } from '../../systems/time';
import { houseState } from './Lights';

const MOODS: CurtainMood[] = ['still', 'ordinary', 'tremble', 'flutter', 'slow', 'breathe'];

interface PanelState {
  geo: THREE.PlaneGeometry;
  base: Float32Array;
}

const SEG_X = 30;
const SEG_Y = 44;

function makePanel(w: number, h: number): PanelState {
  const geo = new THREE.PlaneGeometry(w, h, SEG_X, SEG_Y);
  geo.translate(0, -h / 2, 0); // hang from the top edge at y = 0
  return { geo, base: (geo.attributes.position.array as Float32Array).slice() };
}

export function Curtains({ mood, width = 1.55, height = 4.4, gap = 0.55 }: { mood: () => CurtainMood; width?: number; height?: number; gap?: number }) {
  const panels = useMemo(() => [makePanel(width, height), makePanel(width, height)], [width, height]);
  const weights = useRef<Record<CurtainMood, number>>({ still: 1, ordinary: 0, tremble: 0, flutter: 0, slow: 0, breathe: 0 });
  const m = mats();

  useFrame(() => {
    const dt = world.dt;
    if (dt === 0) return;
    // A sudden draught overrides stillness for a few seconds (never during a lesson cue).
    const target = mood() === 'still' && world.t < houseState.draftUntil ? 'ordinary' : mood();
    const k = 1 - Math.exp(-dt * 1.6);
    for (const md of MOODS) weights.current[md] += ((md === target ? 1 : 0) - weights.current[md]) * k;
    const W = weights.current;
    const t = world.t;
    panels.forEach((p, pi) => {
      const pos = p.geo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const side = pi === 0 ? -1 : 1; // which side of the window
      for (let i = 0; i < pos.count; i++) {
        const bx = p.base[i * 3];
        const by = p.base[i * 3 + 1];
        const u = bx / width + 0.5; // 0..1 across
        const v = -by / height; // 0 at rod .. 1 at hem
        const inner = side < 0 ? u : 1 - u; // 1 at the edge nearest the window gap
        // Pleats, deeper toward the hem, gathered toward the outer edge
        const pleat = Math.sin(u * Math.PI * 2 * 7) * (0.045 + v * 0.02);
        let x = bx;
        let y = by;
        let z = pleat;
        const hang = v * v; // the hem moves more than the top
        // ordinary breeze
        z += W.ordinary * Math.sin(t * 1.1 + v * 2.2 + u * 1.5) * 0.07 * hang;
        x += W.ordinary * Math.sin(t * 0.8 + v * 1.7) * 0.03 * hang;
        // tremble: fast, nervous shivers that gather at the hem like fingers
        const shiver = vnoise(t * 9 + u * 7, v * 5 + pi * 3) - 0.5;
        const fingers = Math.sin(u * Math.PI * 2 * 7 + 1.2) * 0.5 + 0.5;
        z += W.tremble * (shiver * 0.07 * (0.3 + hang) + Math.sin(t * 19 + u * 23) * 0.012 * hang);
        y += W.tremble * Math.pow(v, 6) * fingers * Math.sin(t * 7 + u * 11) * 0.05;
        x += W.tremble * Math.sin(t * 13 + v * 9) * 0.008 * hang;
        // flutter: lively, flag-like waves rolling down the fabric
        z += W.flutter * Math.sin(t * 6.5 - v * 7 + u * 4) * 0.15 * (0.2 + hang);
        x += W.flutter * Math.sin(t * 5 - v * 5) * 0.06 * hang * inner;
        // slow: barely-there sway
        z += W.slow * Math.sin(t * 0.45 + v * 1.4) * 0.06 * hang;
        // breathe: a slow swelling, as if something presses from behind
        const breath = Math.pow(Math.sin(t * 0.85) * 0.5 + 0.5, 1.6);
        const blob = Math.exp(-(((inner - 0.62) * 2.4) ** 2) - ((v - 0.5) * 2.4) ** 2);
        z += W.breathe * breath * blob * 0.34;
        x += W.breathe * breath * blob * 0.05 * -side;
        // still: almost nothing
        z += W.still * Math.sin(t * 0.3 + v) * 0.01 * hang;
        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = z;
      }
      pos.needsUpdate = true;
      p.geo.computeVertexNormals();
    });
  });

  const off = gap / 2 + width / 2;
  return (
    <group>
      <mesh geometry={panels[0].geo} material={m.velvetGreen} position={[-off, 0, 0]} castShadow receiveShadow />
      <mesh geometry={panels[1].geo} material={m.velvetGreen} position={[off, 0, 0]} castShadow receiveShadow />
      {/* Brass pole with finials and rings */}
      <mesh material={m.brass} position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, width * 2 + gap + 0.5, 12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.brass} position={[s * (width + gap / 2 + 0.28), 0.06, 0]}>
          <sphereGeometry args={[0.05, 16, 12]} />
        </mesh>
      ))}
    </group>
  );
}
