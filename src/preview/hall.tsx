/**
 * Phase 7 in-game pilot: boots the real game exactly as src/main.tsx does, then substitutes the
 * three pilot models into the entrance hall at runtime, under the game's own lighting, quality
 * settings and post-processing. No game source file is modified.
 *
 *   Console table  -> walnut console GLB (the candelabrum is raised onto its taller top; collider widened)
 *   Kitchen door   -> door-kit leaf inside the existing animated, collidable, interactive Door
 *   Its architrave -> door-kit architrave (hall side)
 *   houseBreath    -> ornate frame kit around the same living painting
 *
 * Dev only: http://localhost:5180/preview/hall.html   (?pilot=0 for the unmodified baseline)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/literata/400.css';
import '@fontsource/literata/600.css';
import '@fontsource/literata/400-italic.css';
import '../index.css';
import * as THREE from 'three';
import App from '../App';
import { prewarmTextures, mats } from '../systems/materials';
import { initialQuality, probeGpuName } from '../systems/gpuTier';
import { hasSavedQuality, useGame } from '../state/store';
import { renderer } from '../systems/renderer';
import { getInteractable } from '../systems/interaction';
import { hungPaintings } from '../scene/parts/Artwork';
import { artAspect } from '../systems/paintingScenes';
import { box, setDynamicCollider } from '../world/collision';
import { HALL, KITCHEN } from '../world/layout';
import { architraveGeometry, consoleTable, doorLeaf, frameGeometry, loadDoorKit, loadFrameKit, objectStats, warmUp } from '../assets3d/pilotKits';

const PILOT = new URLSearchParams(location.search).get('pilot') !== '0';
/** A layer neither the camera, the shadow cameras nor the interaction ray draws. */
const RETIRED = 7;

// ------------------------------------------------------------------ boot (as src/main.tsx)

if (!hasSavedQuality()) useGame.getState().setQuality(initialQuality(probeGpuName()), true);
void import('../testHook').then((t) => t.installTestHook());
const fontsReady = Promise.all([document.fonts.load('600 40px "Cormorant Garamond"'), document.fonts.load('italic 500 40px "Cormorant Garamond"')]).catch(() => undefined);
const boot = document.getElementById('boot');
void Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))])
  .then(() => prewarmTextures((d, t) => boot && (boot.textContent = `The house is waking… ${Math.round((d / t) * 100)}%`)))
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    if (PILOT) void waitForHall().then(installPilots);
  });

// ------------------------------------------------------------------ substitution

const report: Record<string, unknown> = { pilot: PILOT };
(window as unknown as Record<string, unknown>).__pilot = report;

function waitForHall() {
  return new Promise<THREE.Scene>((resolve) => {
    const tick = () => {
      const s = renderer.scene;
      if (s && getInteractable('kitchen-door') && hungPaintings.get('houseBreath')) resolve(s);
      else setTimeout(tick, 200);
    };
    tick();
  });
}

/** Everything swapped out, so the benchmark can flip between old and new in one session. */
const retired: THREE.Object3D[] = [];
const retire = (o: THREE.Object3D) => {
  retired.push(o);
  o.traverse((c) => c.layers.set(RETIRED));
};
const swapState = { added: [] as THREE.Object3D[], candelabrum: null as THREE.Object3D | null, raisedY: 0 };
/** Show the pilots (true) or the original procedural assets (false), without reloading. */
function showPilots(on: boolean) {
  for (const o of retired) o.traverse((c) => c.layers.set(on ? RETIRED : 0));
  for (const o of swapState.added) o.traverse((c) => c.layers.set(on ? 0 : RETIRED));
  if (swapState.candelabrum) swapState.candelabrum.position.y = on ? swapState.raisedY : 0.84;
  report.showing = on ? 'pilot' : 'original';
}

/** Meshes entirely inside a world-space box, optionally restricted to some materials. */
function meshesWithin(root: THREE.Object3D, b: THREE.Box3, materials?: THREE.Material[], exclude?: THREE.Object3D) {
  const out: THREE.Mesh[] = [];
  const bb = new THREE.Box3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (exclude && isInside(m, exclude))) return;
    if (materials && !materials.includes(m.material as THREE.Material)) return;
    bb.setFromObject(m);
    if (b.containsBox(bb)) out.push(m);
  });
  return out;
}
function isInside(o: THREE.Object3D, ancestor: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === ancestor) return true;
  return false;
}

async function installPilots(scene: THREE.Scene) {
  const t0 = performance.now();
  const m = mats();
  const [table, door, frame] = await Promise.all([consoleTable(), loadDoorKit(), loadFrameKit()]);
  report.loadMs = Math.round(performance.now() - t0);
  const zBack = HALL.zBack;
  const added: THREE.Object3D[] = [];

  // --- A: console table under the landing ----------------------------------------------
  const oldTable = meshesWithin(scene, new THREE.Box3(new THREE.Vector3(-3.7, -0.01, zBack - 0.01), new THREE.Vector3(-2.1, 0.86, zBack + 0.45)), [m.marbleDark, m.mahogany]);
  oldTable.forEach(retire);
  table.mesh.position.set(-2.9, 0, zBack);
  scene.add(table.mesh);
  added.push(table.mesh);
  // The candelabrum stood on the old 0.84 m top; lift it onto the new one.
  const tableTop = new THREE.Box3().setFromObject(table.mesh).max.y;
  scene.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh && Math.abs(o.position.x + 3.35) < 1e-3 && Math.abs(o.position.y - 0.84) < 1e-3 && Math.abs(o.position.z - (zBack + 0.2)) < 1e-3) {
      o.position.y = tableTop - 0.004;
      swapState.candelabrum = o;
      swapState.raisedY = o.position.y;
      report.candelabrumRaisedTo = +o.position.y.toFixed(3);
    }
  });
  // Wider footprint than the old table's collider (0.5 m deep): add one that matches.
  const [fw, fd] = table.footprint;
  setDynamicCollider('pilot:console', box(-2.9 - fw / 2, -2.9 + fw / 2, zBack, zBack + fd + 0.02), true);
  report.console = { retiredMeshes: oldTable.length, top: +tableTop.toFixed(3) };

  // --- B: kitchen door leaf + hall-side architrave ---------------------------------------
  const kitchen = getInteractable('kitchen-door')!.object; // the Interactive group inside the swinging leaf
  const oldLeaf = kitchen.children.find((c) => !(c as THREE.Mesh).isMesh)!; // DoorLeaf group (the plaque is a mesh)
  retire(oldLeaf);
  const leaf = doorLeaf(door, 0.96, 2.3, { M_Brass: m.brass, M_BlackPaint: m.blackPaint });
  kitchen.add(leaf);
  added.push(leaf);
  // Hall-side architrave on the right wall (OnWall axis z, face HALL.x1, normal -1)
  const wallX = HALL.x1;
  const doorGroup = kitchen.parent!.parent!; // Door's outer group (hinge)
  const oldArch = meshesWithin(scene, new THREE.Box3(new THREE.Vector3(wallX - 0.08, -0.01, KITCHEN.doorZ - 0.68), new THREE.Vector3(wallX + 0.01, 2.5, KITCHEN.doorZ + 0.68)), [m.walnut], doorGroup);
  oldArch.forEach(retire);
  const arch = new THREE.Mesh(architraveGeometry(door, KITCHEN.doorZ, 0.96, 2.3), door.wood);
  arch.castShadow = true;
  arch.receiveShadow = true;
  const onWall = new THREE.Group();
  onWall.position.set(wallX, 0, 0);
  onWall.rotation.y = -Math.PI / 2;
  // OnWall's local x along this wall is world z (wallLocal('z', -1, z) === z)
  onWall.add(arch);
  scene.add(onWall);
  added.push(onWall);
  report.door = { retiredArchitraveMeshes: oldArch.length };

  // --- C: ornate frame around the houseBreath painting -----------------------------------
  const hung = hungPaintings.get('houseBreath')!;
  const body = hung.group.children[0].children[0]; // Interactive > body group: canvas, backing, frame
  const [canvas, backing, oldFrame] = body.children;
  retire(backing);
  retire(oldFrame);
  const width = (((canvas as THREE.Mesh).geometry as THREE.PlaneGeometry).parameters.width);
  const h = width / artAspect('houseBreath');
  const fm = new THREE.Mesh(frameGeometry(frame, width - 2 * frame.lip, h - 2 * frame.lip, 'ornate'), frame.materials);
  fm.position.set(0, -h / 2, canvas.position.z - 0.009);
  // Hung flat on the wall, a frame's shadow is a few millimetres wide: not worth ~8k triangles in every shadow pass.
  fm.castShadow = false;
  body.add(fm);
  added.push(fm);

  // New programs and textures compile on first draw; do it now rather than mid-walk.
  const tc = performance.now();
  await warmUp(renderer.gl!, added, renderer.camera!, scene);
  report.compileMs = Math.round(performance.now() - tc);
  report.installMs = Math.round(performance.now() - t0);
  report.added = Object.fromEntries(added.map((o, i) => [['console', 'doorLeaf', 'architrave', 'frame'][i], objectStats(o)]));
  report.retired = retired.map((o) => objectStats(o));
  swapState.added = added;
  report.show = showPilots;
  report.showing = 'pilot';
  report.ready = true;
  console.info('[pilot] installed', report);
}
