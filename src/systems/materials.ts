/**
 * Shared physically based materials. Created once, reused everywhere so the
 * look stays consistent and the GPU only compiles each shader once.
 * Texture repeats assume geometry UVs are in metres (see geometry.ts).
 */
import * as THREE from 'three';
import {
  brass,
  brick,
  clockFace,
  damask,
  ground,
  herringbone,
  marble,
  persianRug,
  plaster,
  runner,
  slate,
  stone,
  velvet,
  veneer,
  WOOD,
  woodPlanks,
  type PBRSet,
} from './textures';

function tile(set: PBRSet, metresU: number, metresV = metresU) {
  for (const t of [set.map, set.roughnessMap, set.normalMap]) t?.repeat.set(1 / metresU, 1 / metresV);
  return set;
}

function std(set: PBRSet, extra: THREE.MeshStandardMaterialParameters = {}, normalScale = 1) {
  return new THREE.MeshStandardMaterial({
    map: set.map,
    roughnessMap: set.roughnessMap,
    normalMap: set.normalMap,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughness: 1,
    metalness: 0,
    ...extra,
  });
}

let built: ReturnType<typeof build> | null = null;

function build() {
  const floorHall = std(tile(woodPlanks('hall', WOOD.floor, { planks: 7, seed: 3 }), 1.25, 2.6), {}, 0.8);
  const parquet = std(tile(herringbone('mirror', WOOD.parquet), 0.62), {}, 0.7);
  const walnut = std(tile(veneer('walnut', WOOD.walnut), 0.7), {}, 0.6);
  const walnutPanel = std(tile(veneer('walnutPanel', WOOD.walnut, { seed: 8, gloss: 0.32 }), 0.9), {}, 0.5);
  const mahogany = std(tile(veneer('mahogany', WOOD.mahogany, { seed: 4, gloss: 0.42 }), 0.6), {}, 0.5);
  const wallHall = std(tile(damask('hall', '#3d3f2b', '#4e5036'), 0.56, 1.12), {}, 0.6);
  const wallMirror = std(tile(damask('mirror', '#1f2b25', '#2c3b32', { seed: 5 }), 0.5, 1.0), {}, 0.6);
  const wallCorridor = std(tile(damask('corridor', '#40372a', '#4f4532', { seed: 9 }), 0.56, 1.12), {}, 0.6);
  const ceiling = std(tile(plaster('ceiling', '#cbbf9f'), 2.5), {}, 0.4);
  const plasterWarm = std(tile(plaster('wall', '#b8aa88', { seed: 22 }), 2.0), {}, 0.4);
  const marbleDark = std(tile(marble('dark', '#1d2420', '#7d877a'), 0.9), {}, 0.5);
  const marbleCream = std(tile(marble('cream', '#c9bfa8', '#7b7466', { seed: 33 }), 0.8), {}, 0.5);
  const brassSet = tile(brass('brass', '#b08a45'), 0.25);
  const brassMat = std(brassSet, { metalness: 1, color: '#ffffff' }, 0.3);
  const giltSet = tile(brass('gilt', '#a8823c', { patina: 0.8 }), 0.3);
  const gilt = std(giltSet, { metalness: 1 }, 0.4);
  const iron = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.55, metalness: 0.8 });
  const blackPaint = new THREE.MeshStandardMaterial({ color: '#0f1110', roughness: 0.45 });
  const velvetSet = tile(velvet(), 0.4);
  const velvetGreen = new THREE.MeshPhysicalMaterial({
    map: velvetSet.map,
    roughnessMap: velvetSet.roughnessMap,
    normalMap: velvetSet.normalMap,
    color: '#2b4234',
    roughness: 1,
    sheen: 1,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color('#6f8f74'),
    side: THREE.DoubleSide,
  });
  const velvetOx = new THREE.MeshPhysicalMaterial({
    map: velvetSet.map,
    normalMap: velvetSet.normalMap,
    color: '#4a1f1c',
    roughness: 0.9,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#9a5a4a'),
  });
  const leather = new THREE.MeshStandardMaterial({ color: '#3a2216', roughness: 0.55 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#9fb0b4',
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.18,
    envMapIntensity: 1.5,
    depthWrite: false,
  });
  const lampGlass = new THREE.MeshStandardMaterial({
    color: '#f1dcb0',
    emissive: '#ffb763',
    emissiveIntensity: 1.6,
    roughness: 0.6,
    transparent: true,
    opacity: 0.92,
  });
  const wax = new THREE.MeshStandardMaterial({ color: '#e8dfc8', roughness: 0.6, emissive: '#3a2a12', emissiveIntensity: 0.4 });
  const flame = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3, 1.2), toneMapped: true });
  const ember = new THREE.MeshStandardMaterial({ color: '#1a0c06', emissive: '#ff5a1a', emissiveIntensity: 2.2, roughness: 1 });
  const soot = new THREE.MeshStandardMaterial({ color: '#0b0a09', roughness: 0.95 });
  const rugHall = std(persianRug('hall', { field: '#56221f', border: '#1f2633', accent: '#2e4038', cream: '#b29c72' }), {}, 0.9);
  const rugMirror = std(persianRug('mirror', { field: '#24302b', border: '#3b1d1b', accent: '#5d4a2c', cream: '#a8956d', seed: 12 }), {}, 0.9);
  const runnerMat = std(tile(runner(), 0.9, 3.6), {}, 0.9);
  const brickMat = std(tile(brick(), 0.9, 0.9), {}, 1.0);
  const stoneTrim = std(tile(stone('trim', '#8b8474'), 1.2), {}, 0.8);
  const stoneSteps = std(tile(stone('steps', '#77716a', { seed: 44, blocks: [2, 1] }), 1.6, 0.8), {}, 0.8);
  const slateMat = std(tile(slate(), 1.2, 1.2), {}, 1.2);
  const grass = std(tile(ground('grass'), 3), {}, 1);
  const gravel = std(tile(ground('gravel'), 1.5), {}, 1);
  const paintCream = new THREE.MeshStandardMaterial({ color: '#c9c0a8', roughness: 0.55 });
  const paintTrim = new THREE.MeshStandardMaterial({ color: '#ddd5bf', roughness: 0.5 });
  const darkInterior = new THREE.MeshBasicMaterial({ color: '#050505' });
  const clockDial = new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.5 });
  const linen = new THREE.MeshStandardMaterial({ color: '#d9cfb8', roughness: 0.9 });
  const parchment = new THREE.MeshStandardMaterial({ color: '#cdbb92', roughness: 0.85 });
  const bookCloth = [
    new THREE.MeshStandardMaterial({ color: '#3a1c18', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#1f2b24', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#40331f', roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: '#232532', roughness: 0.8 }),
  ];
  const foliage = new THREE.MeshStandardMaterial({ color: '#2a3322', roughness: 0.85 });
  const driedFlower = new THREE.MeshStandardMaterial({ color: '#6a4a3a', roughness: 0.85 });
  const ceramic = new THREE.MeshStandardMaterial({ color: '#2e3c3a', roughness: 0.25 });
  return {
    floorHall,
    parquet,
    walnut,
    walnutPanel,
    mahogany,
    wallHall,
    wallMirror,
    wallCorridor,
    ceiling,
    plasterWarm,
    marbleDark,
    marbleCream,
    brass: brassMat,
    gilt,
    iron,
    blackPaint,
    velvetGreen,
    velvetOx,
    leather,
    glass,
    lampGlass,
    wax,
    flame,
    ember,
    soot,
    rugHall,
    rugMirror,
    runner: runnerMat,
    brick: brickMat,
    stoneTrim,
    stoneSteps,
    slate: slateMat,
    grass,
    gravel,
    paintCream,
    paintTrim,
    darkInterior,
    clockDial,
    linen,
    parchment,
    bookCloth,
    foliage,
    driedFlower,
    ceramic,
  };
}

/** Build (once) and return the shared material library. Call after the renderer exists. */
export function mats() {
  if (!built) built = build();
  return built;
}
export type Mats = ReturnType<typeof build>;
