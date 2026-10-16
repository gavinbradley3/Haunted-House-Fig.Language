/**
 * The final lesson's pieces in the Entrance Hall: the Lady's writing box on the centre
 * table (opened with the Scholar’s Key, the last key in the chain), her letter, and the reply that stands on the
 * mantel under her portrait. No new lights: the finale dims and restores the hall's own.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { openLesson } from '../lesson/director';
import { ffx } from '../lesson/finaleFx';
import { doorState, KEY_NAMES, LOCK_KEY } from '../lesson/progression';
import { CONTENT, game, unfinishedRooms, useGame } from '../state/store';
import { audio } from '../systems/audio';
import { boardText } from '../systems/boardText';
import { boxGeo } from '../systems/geometry';
import { mats } from '../systems/materials';
import { world } from '../systems/time';
import { FINALE } from '../world/layout';
import { hungPaintings } from './parts/Artwork';
import { lightMood } from './parts/Lights';
import { Interactive } from './Interactive';

/** The key that opens the box, as messages name it ("the Scholar’s Key"). */
const BOX_KEY = KEY_NAMES[LOCK_KEY.desk];

const LETTER_OPENING = 'My dear visitors, when you first came in, the stairs groaned under every visitor…';

/** Applies the finale's hall brightness and the Lady's gaze every frame. */
function FinaleTicker() {
  const turned = useRef(false);
  useFrame(() => {
    lightMood.hall += (ffx.hallTarget - lightMood.hall) * (1 - Math.exp(-(world.dt || 0.016) * 1.4));
    if (ffx.ladyTurned !== turned.current) {
      const lady = hungPaintings.get('ladyOfHouse');
      if (lady?.swapArt) {
        lady.swapArt(ffx.ladyTurned ? 'ladyOfHouseTurned' : 'ladyOfHouse');
        turned.current = ffx.ladyTurned;
      }
    }
  });
  return null;
}

/** The Lady's writing box. Locked until the class brings the last key (the Scholar’s Key); inside, her letter. */
function WritingBox() {
  const m = mats();
  const lid = useRef<THREE.Group>(null!);
  const letter = useRef<THREE.Group>(null!);
  const open = useRef(0);
  const turning = useRef(false);
  const letterMat = useMemo(() => new THREE.MeshStandardMaterial({ map: boardText('', LETTER_OPENING, 0.21 / 0.28, 'ink'), roughness: 0.85, side: THREE.DoubleSide }), []);
  useFrame(() => {
    const target = game().doors.desk ? 1 : 0;
    open.current += (target - open.current) * (1 - Math.exp(-world.dt * 1.8));
    lid.current.rotation.x = -open.current * 1.9;
    // The letter rises out of the box and turns toward whoever opened it.
    letter.current.position.y = 0.075 + open.current * 0.16;
    letter.current.rotation.x = -Math.PI / 2 + open.current * 1.15;
  });
  const { x, y, z } = FINALE.box;
  return (
    <group position={[x, y, z]} rotation={[0, -0.74, 0]}>
      <Interactive
        id="writing-box"
        maxDist={2.8}
        label={() => {
          const s = game();
          if (s.lessonActive) return null;
          const st = doorState(s.progress, 'desk');
          if (st === 'open') return 'Read the Lady’s letter';
          return st === 'unlockable' ? `Unlock the writing box with ${BOX_KEY}` : 'The Lady’s writing box (locked)';
        }}
        onUse={() => {
          const g = useGame.getState();
          if (turning.current) return;
          const st = doorState(g.progress, 'desk');
          if (st === 'open') {
            openLesson('finale');
            return;
          }
          if (st === 'locked') {
            audio.locked([x, y + 0.1, z]);
            const left = unfinishedRooms(g.progress);
            g.showNotice(
              'The Lady’s writing box is locked.',
              left.length ? `It opens only when every room is done. Still to complete: ${left.map((r) => CONTENT[r].room.replace(/^The /, '')).join(', ')}.` : `Did you take ${BOX_KEY} from the scholar’s desk?`,
            );
            return;
          }
          turning.current = true;
          const wait = audio.unlockDoor([x, y + 0.1, z]);
          g.showNotice(`${BOX_KEY.charAt(0).toUpperCase() + BOX_KEY.slice(1)} turns. The lid lifts by itself.`, 'Inside is a letter, addressed to you.');
          window.setTimeout(() => {
            const s2 = useGame.getState();
            s2.progressDispatch({ type: 'UNLOCK', lock: 'desk' });
            s2.setDoor('desk', true);
            audio.mechanism([x, y + 0.1, z]);
            turning.current = false;
            window.setTimeout(() => openLesson('finale'), 1600);
          }, wait);
        }}
      >
        <mesh geometry={boxGeo(0.4, 0.1, 0.28, 'x')} material={m.mahogany} position={[0, 0.05, 0]} castShadow />
        <mesh geometry={boxGeo(0.36, 0.004, 0.24, 'x')} material={m.velvetGreen} position={[0, 0.101, 0]} />
        <mesh geometry={boxGeo(0.04, 0.03, 0.005)} material={m.brass} position={[0, 0.07, 0.141]} />
        <group ref={lid} position={[0, 0.1, -0.14]}>
          <mesh geometry={boxGeo(0.41, 0.03, 0.285, 'x')} material={m.mahogany} position={[0, 0.015, 0.1425]} castShadow />
          <mesh geometry={boxGeo(0.3, 0.004, 0.18, 'x')} material={m.brass} position={[0, 0.032, 0.1425]} />
        </group>
        <group ref={letter} position={[0, 0.075, 0.02]}>
          <mesh material={letterMat}>
            <planeGeometry args={[0.21, 0.28]} />
          </mesh>
        </group>
      </Interactive>
    </group>
  );
}

/** The class's reply, standing on the mantel under the Lady's portrait (Prove and after). */
function MantelLetter() {
  const W = 0.36;
  const Hl = 0.46;
  const group = useRef<THREE.Group>(null!);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: boardText('Dear Lady,', '…', W / Hl, 'ink'), roughness: 0.85, emissive: new THREE.Color('#5a4630'), emissiveIntensity: 0.5 }), []);
  const last = useRef('');
  useFrame(() => {
    group.current.visible = !!ffx.mantel;
    if (!ffx.mantel || ffx.mantel === last.current) return;
    last.current = ffx.mantel;
    mat.map = boardText('Dear Lady,', ffx.mantel, W / Hl, 'ink');
    mat.needsUpdate = true;
  });
  const p = FINALE.portrait;
  return (
    <group ref={group} position={[p.x - 0.17, 1.44 + Hl / 2, p.z]} rotation={[0, -Math.PI / 2, 0]} visible={false}>
      <group rotation={[-0.12, 0, 0]}>
        <mesh material={mat} castShadow>
          <planeGeometry args={[W, Hl]} />
        </mesh>
      </group>
    </group>
  );
}

export function Finale() {
  return (
    <group>
      <FinaleTicker />
      <WritingBox />
      <MantelLetter />
    </group>
  );
}
