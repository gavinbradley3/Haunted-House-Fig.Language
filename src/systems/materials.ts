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
  hex,
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

/**
 * Every generated texture the materials use. They are slow to make (several seconds in all),
 * so prewarmTextures() makes them one at a time before the game starts, keeping the page
 * responsive; build() then finds them already cached.
 */
const TEX = {
  floorDark: () => woodPlanks('gallery', { dark: hex('#1a100a'), mid: hex('#3a2416'), light: hex('#5c3c24') }, { planks: 8, seed: 9, gloss: 0.36 }),
  floorHall: () => woodPlanks('hall', WOOD.floor, { planks: 7, seed: 3 }),
  parquet: () => herringbone('mirror', WOOD.parquet),
  walnut: () => veneer('walnut', WOOD.walnut),
  walnutPanel: () => veneer('walnutPanel', WOOD.walnut, { seed: 8, gloss: 0.32 }),
  mahogany: () => veneer('mahogany', WOOD.mahogany, { seed: 4, gloss: 0.42 }),
  wallHall: () => damask('hall', '#3d3f2b', '#4e5036'),
  wallMirror: () => damask('mirror', '#1f2b25', '#2c3b32', { seed: 5 }),
  wallGallery: () => damask('gallery', '#3a2422', '#4a2e2a', { seed: 14 }),
  wallCorridor: () => damask('corridor', '#40372a', '#4f4532', { seed: 9 }),
  ceiling: () => plaster('ceiling', '#cbbf9f'),
  plasterWarm: () => plaster('wall', '#b8aa88', { seed: 22 }),
  marbleDark: () => marble('dark', '#1d2420', '#7d877a'),
  marbleCream: () => marble('cream', '#c9bfa8', '#7b7466', { seed: 33 }),
  brassSet: () => brass('brass', '#b08a45'),
  giltSet: () => brass('gilt', '#a8823c', { patina: 0.8 }),
  velvetSet: () => velvet(),
  rugHall: () => persianRug('hall', { field: '#56221f', border: '#1f2633', accent: '#2e4038', cream: '#b29c72' }),
  rugMirror: () => persianRug('mirror', { field: '#24302b', border: '#3b1d1b', accent: '#5d4a2c', cream: '#a8956d', seed: 12 }),
  runnerMat: () => runner(),
  brickMat: () => brick(),
  stoneTrim: () => stone('trim', '#8b8474'),
  stoneSteps: () => stone('steps', '#77716a', { seed: 44, blocks: [2, 1] }),
  slateMat: () => slate(),
  grass: () => ground('grass'),
  gravel: () => ground('gravel'),
  clockDial: () => clockFace(),
};

/** Generate every texture ahead of time, yielding between them so the loading screen can update. */
export async function prewarmTextures(onProgress?: (done: number, total: number) => void) {
  const steps = Object.values(TEX);
  for (let i = 0; i < steps.length; i++) {
    steps[i]();
    onProgress?.(i + 1, steps.length);
    await new Promise((r) => setTimeout(r, 0));
  }
}

function build() {
  const floorDark = std(tile(TEX.floorDark(), 1.4, 2.8), {}, 0.8);
  const floorHall = std(tile(TEX.floorHall(), 1.25, 2.6), {}, 0.8);
  const parquet = std(tile(TEX.parquet(), 0.62), {}, 0.7);
  const walnut = std(tile(TEX.walnut(), 0.7), {}, 0.6);
  const walnutPanel = std(tile(TEX.walnutPanel(), 0.9), {}, 0.5);
  const mahogany = std(tile(TEX.mahogany(), 0.6), {}, 0.5);
  const wallHall = std(tile(TEX.wallHall(), 0.56, 1.12), {}, 0.6);
  const wallMirror = std(tile(TEX.wallMirror(), 0.5, 1.0), {}, 0.6);
  const wallGallery = std(tile(TEX.wallGallery(), 0.6, 1.2), {}, 0.6);
  const wallCorridor = std(tile(TEX.wallCorridor(), 0.56, 1.12), {}, 0.6);
  const ceiling = std(tile(TEX.ceiling(), 2.5), {}, 0.4);
  const plasterWarm = std(tile(TEX.plasterWarm(), 2.0), {}, 0.4);
  const marbleDark = std(tile(TEX.marbleDark(), 0.9), {}, 0.5);
  const marbleCream = std(tile(TEX.marbleCream(), 0.8), {}, 0.5);
  const brassSet = tile(TEX.brassSet(), 0.25);
  const brassMat = std(brassSet, { metalness: 1, color: '#ffffff' }, 0.3);
  const giltSet = tile(TEX.giltSet(), 0.3);
  const gilt = std(giltSet, { metalness: 1 }, 0.4);
  const iron = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.55, metalness: 0.8 });
  const blackPaint = new THREE.MeshStandardMaterial({ color: '#0f1110', roughness: 0.45 });
  const velvetSet = tile(TEX.velvetSet(), 0.4);
  const velvetGreen = new THREE.MeshPhysicalMaterial({
    map: velvetSet.map,
    roughnessMap: velvetSet.roughnessMap,
    normalMap: velvetSet.normalMap,
    color: '#26372b',
    roughness: 1,
    sheen: 1,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color('#5f7a62'),
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
  // HouseEvents scales this colour when the lights sink; keep the two in step.
  const flame = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3, 1.2), toneMapped: true });
  const ember = new THREE.MeshStandardMaterial({ color: '#1a0c06', emissive: '#ff5a1a', emissiveIntensity: 2.2, roughness: 1 });
  const soot = new THREE.MeshStandardMaterial({ color: '#0b0a09', roughness: 0.95 });
  const rugHall = std(TEX.rugHall(), {}, 0.9);
  const rugMirror = std(TEX.rugMirror(), {}, 0.9);
  const runnerMat = std(tile(TEX.runnerMat(), 0.9, 3.6), {}, 0.9);
  const brickMat = std(tile(TEX.brickMat(), 0.9, 0.9), {}, 1.0);
  const stoneTrim = std(tile(TEX.stoneTrim(), 1.2), {}, 0.8);
  const stoneSteps = std(tile(TEX.stoneSteps(), 1.6, 0.8), {}, 0.8);
  const slateMat = std(tile(TEX.slateMat(), 1.2, 1.2), {}, 1.2);
  const grass = std(tile(TEX.grass(), 3), {}, 1);
  const gravel = std(tile(TEX.gravel(), 1.5), {}, 1);
  const paintCream = new THREE.MeshStandardMaterial({ color: '#c9c0a8', roughness: 0.55 });
  const paintTrim = new THREE.MeshStandardMaterial({ color: '#ddd5bf', roughness: 0.5 });
  const darkInterior = new THREE.MeshBasicMaterial({ color: '#050505' });
  const clockDial = new THREE.MeshStandardMaterial({ map: TEX.clockDial(), roughness: 0.5 });
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
  // Rooms 3 and 4 reuse the existing texture maps with a tint, so nothing new is generated at load.
  const tinted = (base: THREE.MeshStandardMaterial, color: string) => {
    const t = base.clone();
    t.color = new THREE.Color(color);
    return t;
  };
  const wallDining = tinted(wallMirror, '#a9bccd');
  const wallNursery = tinted(plasterWarm, '#d9b3ad');
  const silver = new THREE.MeshStandardMaterial({ color: '#c9c9c4', metalness: 1, roughness: 0.28 });
  const porcelain = new THREE.MeshStandardMaterial({ color: '#e9e3d6', roughness: 0.3 });
  const pastry = new THREE.MeshStandardMaterial({ color: '#b07a3c', roughness: 0.7 });
  const slateBoard = new THREE.MeshStandardMaterial({ color: '#1c201f', roughness: 0.9 });
  const toyRed = new THREE.MeshStandardMaterial({ color: '#7a2a22', roughness: 0.55 });
  const toyCream = new THREE.MeshStandardMaterial({ color: '#d8c8a4', roughness: 0.6 });
  const toyBlue = new THREE.MeshStandardMaterial({ color: '#2f4660', roughness: 0.55 });
  const fur = new THREE.MeshStandardMaterial({ color: '#7a5634', roughness: 1 });
  // The five later rooms: again only tints of existing maps, plus a few plain colours.
  const wallEchoes = tinted(wallMirror, '#c3b2d2');
  const wallPress = tinted(plasterWarm, '#8f8a80');
  const wallKitchen = tinted(plasterWarm, '#c4cfb4');
  const wallBallroom = tinted(wallHall, '#e2cfa8');
  const wallStudy = tinted(wallCorridor, '#b0a08a');
  const copper = new THREE.MeshStandardMaterial({ color: '#a8643a', metalness: 1, roughness: 0.38 });
  const ice = new THREE.MeshStandardMaterial({ color: '#cfe4ee', roughness: 0.12, emissive: new THREE.Color('#2a4a5a'), emissiveIntensity: 0.4 });
  // Cold blue flames (the ballroom's "frozen fire"). Kept separate from the shared warm flame.
  const coldFlame = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 2.6, 4.2), toneMapped: true });
  const bean = new THREE.MeshStandardMaterial({ color: '#6e3b22', roughness: 0.55 });
  const sacking = new THREE.MeshStandardMaterial({ color: '#8a7350', roughness: 1 });
  const dressFabric = new THREE.MeshStandardMaterial({ color: '#3a2c2a', roughness: 0.85 });
  const cloud = new THREE.MeshStandardMaterial({ color: '#8d96a0', roughness: 1, emissive: new THREE.Color('#20262c'), emissiveIntensity: 0.6 });
  const paper = new THREE.MeshStandardMaterial({ color: '#e4d9bf', roughness: 0.9, side: THREE.DoubleSide });
  const leadType = new THREE.MeshStandardMaterial({ color: '#55585c', metalness: 0.8, roughness: 0.5 });
  return {
    floorHall,
    floorDark,
    wallGallery,
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
    wallDining,
    wallNursery,
    silver,
    porcelain,
    pastry,
    slateBoard,
    toyRed,
    toyCream,
    toyBlue,
    fur,
    wallEchoes,
    wallPress,
    wallKitchen,
    wallBallroom,
    wallStudy,
    copper,
    ice,
    coldFlame,
    bean,
    sacking,
    dressFabric,
    cloud,
    paper,
    leadType,
  };
}

/** Build (once) and return the shared material library. Call after the renderer exists. */
export function mats() {
  if (!built) built = build();
  return built;
}
export type Mats = ReturnType<typeof build>;
