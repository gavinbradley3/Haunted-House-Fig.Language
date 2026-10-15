import { useEffect, useRef, type ReactNode } from 'react';
import type * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { registerInteractable, unregisterInteractable } from '../systems/interaction';
import { game, useGame } from '../state/store';

interface Props {
  id: string;
  label: () => string | null;
  onUse: () => void;
  maxDist?: number;
  children: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

/** Can the player interact right now (not in a cutscene, not paused, game running)? */
export function canInteract() {
  const s = game();
  return s.phase === 'play' && !s.cinematic && !s.paused && !s.inspecting;
}

/**
 * Wraps scene content so it can be used with E / click (pointer locked, via the
 * centre ray in Player) or clicked directly with the mouse when the pointer is free.
 */
export function Interactive({ id, label, onUse, maxDist = 2.8, children, position, rotation }: Props) {
  const ref = useRef<THREE.Group>(null!);
  const labelRef = useRef(label);
  const useRefFn = useRef(onUse);
  labelRef.current = label;
  useRefFn.current = onUse;

  useEffect(() => {
    ref.current.userData.interactId = id;
    registerInteractable({
      id,
      object: ref.current,
      label: () => labelRef.current(),
      onUse: () => useRefFn.current(),
      maxDist,
    });
    return () => unregisterInteractable(id);
  }, [id, maxDist]);

  const pointerFree = () => !document.pointerLockElement;

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (!pointerFree() || !canInteract() || game().shot) return;
        e.stopPropagation();
        const text = labelRef.current();
        if (text) {
          useGame.getState().setHover({ id, label: text });
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        if (game().hover?.id === id) useGame.getState().setHover(null);
        document.body.style.cursor = '';
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!pointerFree() || !canInteract()) return;
        if (e.delta > 6) return; // was a drag-to-look, not a click
        if (labelRef.current() === null) return;
        e.stopPropagation();
        useRefFn.current();
      }}
    >
      {children}
    </group>
  );
}
