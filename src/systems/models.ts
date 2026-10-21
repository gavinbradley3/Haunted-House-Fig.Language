/**
 * Blender-made props (src/assets/models/*.glb, built by scripts/phase12/blender/build_props.py).
 *
 * Each model is fetched when a room first asks for it, never at start-up, and never holds up the scene: until it
 * has arrived (or if it cannot load) the room shows its own simpler, code-built version. Materials in the files
 * are named after the house's materials (walnut, gilt, linen...) and are swapped for them here, so a Blender prop
 * is lit and textured exactly like the furniture around it.
 */
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const urls = import.meta.glob('../assets/models/*.glb', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export type ModelName = 'covered_portraits' | 'ledger_stand' | 'vanity' | 'music_box';
export const modelUrl = (name: ModelName) => urls[`../assets/models/${name}.glb`];

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF | null>>();

function load(name: ModelName) {
  const url = modelUrl(name);
  if (!url) return Promise.resolve(null);
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).catch((e) => {
      console.warn(`[models] could not load ${name}`, e);
      return null;
    });
    cache.set(url, p);
  }
  return p;
}

/** Start fetching models ahead of need (a room about to be reachable). */
export function preloadModels(names: ModelName[]) {
  for (const n of names) void load(n);
}

/**
 * A copy of a model with its materials replaced by name (`materials[name]`), casting and receiving shadows.
 * Null until it has loaded (or if it never does).
 */
export function useModel(name: ModelName, materials: Record<string, THREE.Material | undefined>) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    let live = true;
    void load(name).then((gltf) => {
      if (!live || !gltf) return;
      const copy = gltf.scene.clone(true);
      copy.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const m = mesh.material as THREE.Material;
        // Blender numbers a material it has seen before ("gilt.001"): match on the name without that suffix.
        const swap = materials[m.name] ?? materials[m.name.replace(/\.\d+$/, '')];
        if (swap) mesh.material = swap;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      setObj(copy);
    });
    return () => {
      live = false;
    };
    // The materials are the house's shared ones (stable for the life of the game).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  return obj;
}
