/**
 * Phase 7 pilot assets: loading the Blender-exported GLB kits and assembling them at any size.
 *
 * Nothing in the classroom game imports this module yet; it is used by the dev-only preview pages
 * (preview/assets.html, preview/hall.html). Models load on demand from public/models, so a room's
 * assets cost nothing until that room asks for them.
 *
 * Conventions (glTF, metres, y up, front +z), set by hosl-asset-production/blender/scripts:
 *  - frame kit:   corner pivot = top-left of the sight opening; rails are unit length with UVs in metres.
 *  - door kit:    leaf pivot = hinge edge at the floor, extending +x (same as Door.tsx DoorLeaf);
 *                 architrave pieces in the wall's local frame (x along the wall, z out of it).
 *  - table:       pivot = back edge, centre, floor; stands against a wall facing +z.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * During the pilot the models live in preview/models/, which the dev server serves but
 * `npm run build` never copies, so the classroom build stays exactly as released.
 * On integration they move to public/models/ and this becomes `${import.meta.env.BASE_URL}models/`.
 */
const MODEL_ROOT = '/preview/models/';
export const MODELS = {
  console: `${MODEL_ROOT}console_table_walnut.glb`,
  door: `${MODEL_ROOT}door_kit_victorian.glb`,
  frame: `${MODEL_ROOT}frame_kit_ornate.glb`,
} as const;

// ------------------------------------------------------------------ loading

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
/** Milliseconds from request to parsed model, for the performance report. */
export const loadTimes = new Map<string, number>();

export function loadModel(url: string): Promise<GLTF> {
  let p = cache.get(url);
  if (!p) {
    const t0 = performance.now();
    p = loader.loadAsync(url).then((g) => {
      g.scene.traverse(matchHouseShaders);
      loadTimes.set(url, performance.now() - t0);
      return g;
    });
    cache.set(url, p);
  }
  return p;
}

/**
 * Pipeline rule: metalness is one constant per material (wood 0, gilt 0.6, brass 1), so the
 * packed metallic-roughness texture is only a roughness map. GLTFLoader also binds it as a
 * metalness map, which would give every kit material a shader variant the house never uses
 * (one extra program to compile each). Dropping it lets kit materials share the house's programs.
 */
function matchHouseShaders(o: THREE.Object3D) {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh) return;
  // Baked AO arrives as RGBA vertex colour; the alpha is always 1 and would add a shader variant.
  const col = mesh.geometry.attributes.color as THREE.BufferAttribute | undefined;
  if (col && col.itemSize === 4) {
    const rgb = new Float32Array(col.count * 3);
    for (let i = 0; i < col.count; i++) {
      rgb[i * 3] = col.getX(i);
      rgb[i * 3 + 1] = col.getY(i);
      rgb[i * 3 + 2] = col.getZ(i);
    }
    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
  }
  for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
    const s = m as THREE.MeshStandardMaterial;
    if (s.isMeshStandardMaterial && s.metalnessMap) {
      s.metalnessMap = null;
      s.needsUpdate = true;
    }
  }
}

/**
 * Compile the shaders and upload the textures for newly added kit objects, for the same target
 * the game draws into (the effect composer's half-float buffer, see GameCanvas Precompile).
 * Compiling against the screen instead would build variants that are never used.
 */
export async function warmUp(gl: THREE.WebGLRenderer, objects: THREE.Object3D[], camera: THREE.Camera, scene: THREE.Scene) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(target);
  const ready = Promise.all(objects.map((o) => gl.compileAsync(o, camera, scene)));
  gl.setRenderTarget(prev);
  for (const o of objects)
    o.traverse((c) => {
      const mat = (c as THREE.Mesh).material;
      for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) for (const v of Object.values(m)) if ((v as THREE.Texture)?.isTexture) gl.initTexture(v as THREE.Texture);
    });
  await ready;
  target.dispose();
}

function meshNamed(root: THREE.Object3D, name: string): THREE.Mesh {
  const o = root.getObjectByName(name);
  const mesh = (o as THREE.Mesh)?.isMesh ? (o as THREE.Mesh) : (o?.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined);
  if (!mesh) throw new Error(`model has no mesh "${name}"`);
  return mesh;
}

/**
 * Swap a kit's materials for the game's shared ones by name (e.g. M_Brass -> the house brass),
 * so hardware matches every other brass fitting and costs no new texture or shader.
 */
export function shareMaterials(root: THREE.Object3D, byName: Record<string, THREE.Material>) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const swap = (mat: THREE.Material) => byName[mat.name] ?? mat;
    m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
  });
}

// ------------------------------------------------------------------ geometry helpers

/** Apply a matrix; a mirrored (negative determinant) matrix also gets its triangle winding flipped. */
function placed(src: THREE.BufferGeometry, m: THREE.Matrix4, uScale = 1) {
  const g = src.clone();
  if (uScale !== 1) {
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * uScale);
  }
  g.applyMatrix4(m);
  if (m.determinant() < 0 && g.index) {
    const idx = g.index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
  }
  return g;
}

/** Merge geometries into one, with one draw group per material slot. */
function mergeBySlot(parts: { geo: THREE.BufferGeometry; slot: number }[]) {
  parts.sort((a, b) => a.slot - b.slot);
  const merged = mergeGeometries(
    parts.map((p) => {
      // all inputs must share the same attributes
      const g = p.geo;
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      return g;
    }),
    true,
  );
  if (!merged) throw new Error('could not merge kit geometry');
  const groups = merged.groups.slice();
  merged.clearGroups();
  let slot = -1;
  for (let i = 0; i < groups.length; i++) {
    const s = parts[i].slot;
    if (s !== slot) merged.addGroup(groups[i].start, 0, s);
    merged.groups[merged.groups.length - 1].count += groups[i].count;
    slot = s;
  }
  parts.forEach((p) => p.geo.dispose());
  return merged;
}

const M = () => new THREE.Matrix4();
const T = (x: number, y: number, z = 0) => M().makeTranslation(x, y, z);
const S = (x: number, y: number, z = 1) => M().makeScale(x, y, z);
const mul = (...ms: THREE.Matrix4[]) => ms.reduce((a, b) => a.multiply(b), M());

// ------------------------------------------------------------------ picture frames

export interface FrameKit {
  corner: THREE.Mesh;
  railH: THREE.Mesh;
  railV: THREE.Mesh;
  reachH: number;
  reachV: number;
  /** How far the frame's lip overlaps the canvas on each side (m). */
  lip: number;
  materials: THREE.Material[];
}

export async function loadFrameKit(): Promise<FrameKit> {
  const g = await loadModel(MODELS.frame);
  const corner = meshNamed(g.scene, 'FrameOrnate_Corner');
  const railH = meshNamed(g.scene, 'FrameOrnate_RailH');
  const railV = meshNamed(g.scene, 'FrameOrnate_RailV');
  const x = corner.userData as { reach_h: number; reach_v: number; lip_m: number };
  return { corner, railH, railV, reachH: x.reach_h, reachV: x.reach_v, lip: x.lip_m, materials: [corner.material as THREE.Material, railH.material as THREE.Material] };
}

export type FrameStyle = 'ornate' | 'plain';
const frameCache = new Map<string, THREE.BufferGeometry>();

/**
 * One merged geometry (two draw groups: carved corners, straight rails) for a frame whose sight
 * opening is w x h metres, centred on the origin, back against z = 0.
 * 'ornate' uses the carved corners; 'plain' mitres the same moulding (optionally slimmer by `slim`).
 */
export function frameGeometry(kit: FrameKit, w: number, h: number, style: FrameStyle = 'ornate', slim = 1) {
  const key = `${style}:${w.toFixed(3)}:${h.toFixed(3)}:${slim}`;
  const hit = frameCache.get(key);
  if (hit) return hit;
  const parts: { geo: THREE.BufferGeometry; slot: number }[] = [];
  if (style === 'ornate') {
    const L = w - 2 * kit.reachH;
    const Lv = h - 2 * kit.reachV;
    if (L <= 0 || Lv <= 0) throw new Error(`ornate frame needs a sight opening of at least ${(2 * kit.reachH).toFixed(2)} x ${(2 * kit.reachV).toFixed(2)} m`);
    for (const sx of [1, -1]) {
      for (const sy of [1, -1]) parts.push({ geo: placed(kit.corner.geometry, mul(S(sx, sy), T(-w / 2, h / 2))), slot: 0 });
      parts.push({ geo: placed(kit.railH.geometry, mul(S(1, sx), T(-w / 2 + kit.reachH, h / 2), S(L, 1)), L), slot: 1 });
      parts.push({ geo: placed(kit.railV.geometry, mul(S(sx, 1), T(-w / 2, h / 2 - kit.reachV), S(1, Lv)), Lv), slot: 1 });
    }
  } else {
    // Mitred plain moulding: each rail end is cut at 45 degrees by moving its vertices out by their
    // distance from the sight edge. UVs stay in metres, so the gilding never stretches.
    // All four rails come from the horizontal rail so the profiles meet exactly at the mitres.
    const mitre = (len: number) => {
      const g = kit.railH.geometry.clone();
      const p = g.attributes.position as THREE.BufferAttribute;
      const uv = g.attributes.uv as THREE.BufferAttribute;
      const period = 0.25;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) * slim; // distance out from the sight edge
        const x = p.getX(i) < 0.5 ? -y : len + y;
        p.setXYZ(i, x, y, p.getZ(i) * slim);
        uv.setX(i, x / period);
      }
      g.computeVertexNormals();
      return g;
    };
    // (x, y) -> (-y, -x): turns the top rail into the left rail (profile toward -x, running down)
    const toLeft = M().set(0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    const top = mitre(w);
    const side = mitre(h);
    for (const s of [1, -1]) {
      parts.push({ geo: placed(top, mul(S(1, s), T(-w / 2, h / 2))), slot: 1 });
      parts.push({ geo: placed(side, mul(S(s, 1), T(-w / 2, h / 2), toLeft)), slot: 1 });
    }
    top.dispose();
    side.dispose();
  }
  const geo = mergeBySlot(parts);
  frameCache.set(key, geo);
  return geo;
}

// ------------------------------------------------------------------ doors

export interface DoorKit {
  leaf: THREE.Mesh;
  hardware: THREE.Mesh[];
  stretchX: [number, number][];
  stretchY: [number, number][];
  base: [number, number, number];
  architrave: Record<'leg' | 'head' | 'block' | 'plinth', THREE.Mesh>;
  wood: THREE.Material;
}

export async function loadDoorKit(): Promise<DoorKit> {
  const g = await loadModel(MODELS.door);
  const leaf = meshNamed(g.scene, 'DoorLeaf_4Panel');
  const hwRoot = g.scene.getObjectByName('DoorLeaf_Hardware')!;
  const hardware: THREE.Mesh[] = [];
  hwRoot.traverse((o) => (o as THREE.Mesh).isMesh && hardware.push(o as THREE.Mesh));
  const x = leaf.userData as { stretch_x: [number, number][]; stretch_y: [number, number][]; base_size: [number, number, number] };
  return {
    leaf,
    hardware,
    stretchX: x.stretch_x,
    stretchY: x.stretch_y,
    base: x.base_size,
    architrave: {
      leg: meshNamed(g.scene, 'Architrave_Leg'),
      head: meshNamed(g.scene, 'Architrave_Head'),
      block: meshNamed(g.scene, 'Architrave_CornerBlock'),
      plinth: meshNamed(g.scene, 'Architrave_Plinth'),
    },
    wood: leaf.material as THREE.Material,
  };
}

/** Piecewise remap: only the given zones (inside the flat raised fields) absorb a size change. */
function stretch(v: number, zones: [number, number][], delta: number, weights?: number[]) {
  const w = weights ?? zones.map(() => 1 / zones.length);
  let off = 0;
  for (let i = 0; i < zones.length; i++) {
    const [a, b] = zones[i];
    const d = delta * w[i];
    if (v <= a) return v + off;
    if (v < b) return v + off + ((v - a) / (b - a)) * d;
    off += d;
  }
  return v + off;
}

/**
 * A door leaf group (wood leaf + brass hardware) for a w x h opening, built from the kit by
 * stretching only the panel fields: stiles, rails, mouldings and hardware keep their real size,
 * and the lock rail stays at hand height on taller doors.
 */
export function doorLeaf(kit: DoorKit, w: number, h: number, shared?: Record<string, THREE.Material>) {
  const [bw, bh] = kit.base;
  const remap = (src: THREE.BufferGeometry) => {
    const g = src.clone();
    if (Math.abs(w - bw) < 1e-4 && Math.abs(h - bh) < 1e-4) return g;
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      p.setX(i, stretch(p.getX(i), kit.stretchX, w - bw));
      p.setY(i, stretch(p.getY(i), kit.stretchY, h - bh));
    }
    p.needsUpdate = true;
    g.computeBoundingSphere();
    return g;
  };
  const group = new THREE.Group();
  group.name = 'KitDoorLeaf';
  const leaf = new THREE.Mesh(remap(kit.leaf.geometry), kit.leaf.material);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  group.add(leaf);
  for (const hw of kit.hardware) {
    const m = new THREE.Mesh(remap(hw.geometry), hw.material);
    m.castShadow = true;
    group.add(m);
  }
  if (shared) shareMaterials(group, shared);
  return group;
}

/**
 * Architrave around an opening of width w and height h centred at c, in the wall's local frame
 * (the same arguments as Architecture.tsx <Architrave>). One merged mesh, one draw call.
 */
export function architraveGeometry(kit: DoorKit, c: number, w: number, h: number) {
  const L = c - w / 2;
  const R = c + w / 2;
  const plinthH = 0.27;
  const a = kit.architrave;
  const parts: { geo: THREE.BufferGeometry; slot: number }[] = [];
  for (const [x, sx] of [
    [L, 1],
    [R, -1],
  ] as const) {
    const side = mul(T(x, 0), S(sx, 1));
    parts.push({ geo: placed(a.plinth.geometry, side), slot: 0 });
    parts.push({ geo: placed(a.leg.geometry, mul(side.clone(), T(0, plinthH), S(1, h - plinthH)), h - plinthH), slot: 0 });
    parts.push({ geo: placed(a.block.geometry, mul(side.clone(), T(0, h))), slot: 0 });
  }
  parts.push({ geo: placed(a.head.geometry, mul(T(L, h), S(w, 1)), w), slot: 0 });
  return mergeBySlot(parts);
}

// ------------------------------------------------------------------ furniture

export async function consoleTable() {
  const g = await loadModel(MODELS.console);
  const mesh = meshNamed(g.scene, 'ConsoleTable_Walnut');
  const m = new THREE.Mesh(mesh.geometry, mesh.material);
  m.name = 'KitConsoleTable';
  m.castShadow = true;
  m.receiveShadow = true;
  return { mesh: m, footprint: (mesh.userData.footprint_m as [number, number]) ?? [1.55, 0.6] };
}

// ------------------------------------------------------------------ statistics

/**
 * Time one model's journey on a quiet page, bypassing every cache: network fetch, glTF parse
 * (including WebP decoding), and GPU texture upload. For the performance report.
 */
export async function benchLoad(url: string, gl: THREE.WebGLRenderer) {
  const t0 = performance.now();
  const res = await fetch(`${url}?bench=${Math.random()}`, { cache: 'no-store' });
  const buf = await res.arrayBuffer();
  const t1 = performance.now();
  const gltf = await new GLTFLoader().parseAsync(buf, '');
  const t2 = performance.now();
  const texs = new Set<THREE.Texture>();
  gltf.scene.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    for (const mm of Array.isArray(m) ? m : m ? [m] : []) for (const v of Object.values(mm)) if ((v as THREE.Texture)?.isTexture) texs.add(v as THREE.Texture);
  });
  texs.forEach((t) => gl.initTexture(t));
  gl.getContext().finish();
  const t3 = performance.now();
  texs.forEach((t) => t.dispose());
  return { bytes: buf.byteLength, fetchMs: Math.round(t1 - t0), parseMs: Math.round(t2 - t1), uploadMs: Math.round(t3 - t2), textures: texs.size };
}

/** Approximate GPU bytes for a texture (RGBA8 with a full mip chain). */
export function textureBytes(t: THREE.Texture) {
  const img = t.image as { width?: number; height?: number } | undefined;
  if (!img?.width || !img.height) return 0;
  return Math.round(img.width * img.height * 4 * (t.generateMipmaps ? 4 / 3 : 1));
}

/** Triangles, draw calls (one per material group), materials and textures under a root. */
export function objectStats(root: THREE.Object3D) {
  let tris = 0;
  let draws = 0;
  const mats = new Set<THREE.Material>();
  const texs = new Set<THREE.Texture>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.visible) return;
    const g = m.geometry;
    const count = g.index ? g.index.count : g.attributes.position.count;
    tris += count / 3;
    const list = Array.isArray(m.material) ? m.material : [m.material];
    draws += Array.isArray(m.material) ? Math.max(1, g.groups.length) : 1;
    for (const mat of list) {
      mats.add(mat);
      for (const v of Object.values(mat)) if ((v as THREE.Texture)?.isTexture) texs.add(v as THREE.Texture);
    }
  });
  const texBytes = [...texs].reduce((a, t) => a + textureBytes(t), 0);
  return { tris: Math.round(tris), draws, materials: mats.size, textures: texs.size, texBytes };
}
