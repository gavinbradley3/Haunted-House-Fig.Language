/**
 * Antique keys: the house's rewards. Each room's key is a real object that the
 * teacher walks up to and takes; it cannot be taken early or twice.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { canCollect, KEY_NAMES, type KeyId } from '../../lesson/progression';
import { game, useGame } from '../../state/store';
import { audio } from '../../systems/audio';
import { world } from '../../systems/time';
import { Interactive } from '../Interactive';

/** A warded barrel key about 11 cm long, lying along local x. */
export function BrassKeyMesh({ material, variant = 'mirror' }: { material: THREE.Material; variant?: 'mirror' | 'gallery' }) {
  const bow = useMemo(() => {
    // Mirror key: a trefoil bow. Gallery key: an oval bow with a pierced lozenge.
    const g = new THREE.Shape();
    if (variant === 'mirror') {
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const r = 0.026 + 0.008 * Math.cos(a * 3);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      const hole = new THREE.Path();
      hole.absarc(0, 0, 0.012, 0, Math.PI * 2, true);
      g.holes.push(hole);
    } else {
      g.absellipse(0, 0, 0.022, 0.03, 0, Math.PI * 2, false, 0);
      const hole = new THREE.Path();
      hole.moveTo(0, -0.014);
      hole.lineTo(0.009, 0);
      hole.lineTo(0, 0.014);
      hole.lineTo(-0.009, 0);
      hole.lineTo(0, -0.014);
      g.holes.push(hole);
    }
    const geo = new THREE.ExtrudeGeometry(g, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 32 });
    geo.translate(0, 0, -0.002);
    return geo;
  }, [variant]);
  return (
    <group>
      <mesh geometry={bow} material={material} position={[-0.055, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
      {/* Collar and barrel */}
      <mesh material={material} position={[-0.026, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0055, 0.0055, 0.008, 12]} />
      </mesh>
      <mesh material={material} position={[0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.0034, 0.0038, 0.072, 12]} />
      </mesh>
      {/* Bit with wards */}
      <mesh material={material} position={[0.038, -0.009, 0]}>
        <boxGeometry args={[0.016, 0.016, 0.003]} />
      </mesh>
      <mesh material={material} position={[0.044, -0.019, 0]}>
        <boxGeometry args={[0.004, 0.006, 0.003]} />
      </mesh>
      <mesh material={material} position={[0.033, -0.019, 0]}>
        <boxGeometry args={[0.003, 0.006, 0.003]} />
      </mesh>
    </group>
  );
}

export function useKeyMaterial(tint: string) {
  return useMemo(
    () => new THREE.MeshStandardMaterial({ color: tint, metalness: 1, roughness: 0.32, emissive: new THREE.Color('#3a2808'), emissiveIntensity: 0 }),
    [tint],
  );
}

/**
 * A key lying in the world that the teacher can take with E or a click.
 * It appears only after its room is complete, and vanishes for good once taken.
 */
/** What the house says when each key is taken: a nudge toward the lock it opens. */
const TAKEN: Record<KeyId, string> = {
  mirrorKey: 'Somewhere in the house, a lock is waiting for it.',
  galleryKey: 'In the corridor, a door with a giant’s name on its plaque is waiting.',
  diningKey: 'A key this small fits a keyhole you would never notice. Look closely at the Hall of Mirrors.',
  nurseryKey: 'It is not for a music box at all. A door in the nursery’s south wall has a keyhole this shape.',
  echoesKey: 'In the music room’s west wall, a door has a keyhole shaped like a bell.',
  pressKey: 'Back in the entrance hall, a door beside the fireplace wall is waiting for a key cast in type.',
  kitchenKey: 'In the Giant’s Dining Room, a door in the south wall has a pantry lock.',
  ballroomKey: 'Under the landing in the entrance hall, a small door has been waiting all night.',
  studyKey: 'The Lady’s writing box in the entrance hall has a keyhole just this shape.',
};

export function CollectibleKey({ keyId, variant, tint = '#b8924c', scale = 1 }: { keyId: KeyId; variant: 'mirror' | 'gallery'; tint?: string; scale?: number }) {
  const progress = useGame((s) => s.progress);
  const mat = useKeyMaterial(tint);
  const group = useRef<THREE.Group>(null!);
  const taking = useRef(0); // 0 resting, >0 lift-and-fade after being taken
  const available = canCollect(progress, keyId);
  const collected = progress.keys[keyId];

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // A faint glint so the eye finds it in a dark drawer, without any glow halo.
    mat.emissiveIntensity = available ? 0.35 + Math.max(0, Math.sin(world.t * 1.7)) * 0.5 : 0;
    if (taking.current > 0) {
      taking.current = Math.min(1, taking.current + world.dt * 1.6);
      g.position.y = taking.current * 0.12;
      g.rotation.x = -taking.current * 0.8;
      g.scale.setScalar(1 - taking.current * 0.9);
      if (taking.current >= 1) g.visible = false;
    }
  });

  if (!available && !(collected && taking.current > 0 && taking.current < 1)) return null;
  return (
    <group ref={group}>
      <Interactive
        id={`key-${keyId}`}
        maxDist={2.6}
        label={() => (canCollect(game().progress, keyId) ? `Take ${KEY_NAMES[keyId]}` : null)}
        onUse={() => {
          const s = useGame.getState();
          if (!canCollect(s.progress, keyId)) return;
          taking.current = 0.001;
          audio.keyPickup();
          s.progressDispatch({ type: 'COLLECT_KEY', key: keyId });
          s.showNotice(`You took ${KEY_NAMES[keyId]}.`, TAKEN[keyId]);
        }}
      >
        <group scale={scale}>
          <BrassKeyMesh material={mat} variant={variant} />
        </group>
        {/* Generous invisible hit area: a small key is hard to aim at on a projector */}
        <mesh visible={false}>
          <boxGeometry args={[0.2, 0.08, 0.12]} />
        </mesh>
      </Interactive>
    </group>
  );
}
