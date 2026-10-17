/** Registry of things the player can interact with (doors, mirrors, objects). */
import * as THREE from 'three';

export interface Interactable {
  id: string;
  object: THREE.Object3D;
  /** Prompt text, e.g. "Open the door". Return null to hide the prompt. */
  label: () => string | null;
  onUse: () => void;
  maxDist: number;
}

const registry = new Map<string, Interactable>();

export function registerInteractable(i: Interactable) {
  registry.set(i.id, i);
}
export function unregisterInteractable(id: string) {
  registry.delete(id);
}
export function getInteractable(id: string) {
  return registry.get(id);
}

/** Walls and other solid surfaces that block interaction rays. */
const occluders = new Set<THREE.Object3D>();
export function registerOccluder(o: THREE.Object3D) {
  occluders.add(o);
  return () => occluders.delete(o);
}

const hits: THREE.Intersection[] = [];
const objs: THREE.Object3D[] = [];

/** Ray-pick the closest interactable along `ray` that is within its max distance. */
export function pickInteractable(raycaster: THREE.Raycaster): Interactable | null {
  objs.length = 0;
  // Reach as far as the farthest-reaching interactable (paintings high in the hall); each one still
  // enforces its own maxDist below, so nothing else becomes usable from further away.
  let far = 4;
  for (const i of registry.values()) {
    objs.push(i.object);
    if (i.maxDist > far) far = i.maxDist;
  }
  for (const o of occluders) objs.push(o);
  hits.length = 0;
  raycaster.far = far;
  raycaster.intersectObjects(objs, true, hits);
  for (const h of hits) {
    let o: THREE.Object3D | null = h.object;
    while (o) {
      const id = o.userData.interactId as string | undefined;
      if (id) {
        const it = registry.get(id);
        if (it && h.distance <= it.maxDist && it.label() !== null) return it;
        return null; // nearest interactable is out of range: don't pick something behind it
      }
      if (occluders.has(o)) return null; // a wall is in the way
      o = o.parent;
    }
  }
  return null;
}
