/** Geometry helpers: metre-scaled UVs, swept moulding profiles, lathe profiles. */
import * as THREE from 'three';

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached<T extends THREE.BufferGeometry>(key: string, fn: () => T): T {
  let g = geoCache.get(key);
  if (!g) {
    g = fn();
    geoCache.set(key, g);
  }
  return g as T;
}

/**
 * Box whose UVs are in metres, so tiling textures keep a constant scale.
 * `grain` chooses whether texture v (grain) runs along y (default) or along the longest horizontal axis.
 */
export function boxGeo(w: number, h: number, d: number, grain: 'y' | 'x' | 'z' = 'y'): THREE.BufferGeometry {
  const key = `box:${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}:${grain}`;
  return cached(key, () => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    // Face order: +x, -x, +y, -y, +z, -z; 4 vertices each.
    const dims: [number, number][] = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    for (let f = 0; f < 6; f++) {
      const [du, dv] = dims[f];
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        let u = uv.getX(i) * du;
        let v = uv.getY(i) * dv;
        // Rotate grain so it runs along the long axis of rails and shelves.
        const swap = (grain === 'x' && f >= 2) || (grain === 'z' && f < 4);
        if (swap) [u, v] = [v, u];
        uv.setXY(i, u, v);
      }
    }
    uv.needsUpdate = true;
    return g;
  });
}

export function planeGeo(w: number, h: number, uvScale = 1): THREE.BufferGeometry {
  return cached(`plane:${w}:${h}:${uvScale}`, () => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * uvScale, uv.getY(i) * h * uvScale);
    return g;
  });
}

export type Profile = [number, number][];

/** Extrude a 2D profile (x = out from wall, y = lateral) along +z for `length` metres. */
export function profileGeo(name: string, profile: Profile, length: number): THREE.BufferGeometry {
  return cached(`profile:${name}:${length.toFixed(3)}`, () => {
    const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 6, steps: 1 });
    // Make UVs metre-scale along the run so wood grain follows the moulding.
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, pos.getX(i) + pos.getY(i), pos.getZ(i));
    }
    g.computeVertexNormals();
    return g;
  });
}

/**
 * Transform that places a profile run from a to b on a surface with the given outward normal.
 * The profile's +y ends up pointing toward `up`.
 */
export function runTransform(a: THREE.Vector3, b: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3) {
  let start = a.clone();
  let dir = b.clone().sub(a);
  const length = dir.length();
  dir.normalize();
  let lat = new THREE.Vector3().crossVectors(dir, normal);
  if (lat.dot(up) < 0) {
    start = b.clone();
    dir = dir.negate();
    lat = lat.negate();
  }
  const m = new THREE.Matrix4().makeBasis(normal.clone().normalize(), lat, dir);
  m.setPosition(start);
  return { matrix: m, length };
}

// ------------------------------------------------------------- PROFILES

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 6): Profile {
  const out: Profile = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

export const PROFILES: Record<string, Profile> = {
  // Tall Victorian skirting with ogee top
  skirting: [
    [0, 0],
    [0.024, 0],
    [0.024, 0.16],
    ...arc(0.024, 0.18, 0.02, -Math.PI / 2, 0, 4).map(([x, y]) => [x - 0.02, y] as [number, number]),
    [0.012, 0.2],
    [0.012, 0.215],
    [0.006, 0.225],
    [0, 0.225],
  ],
  dado: [
    [0, -0.035],
    [0.012, -0.035],
    ...arc(0.012, -0.018, 0.017, -Math.PI / 2, Math.PI / 2, 6),
    [0.022, 0.0],
    [0.03, 0.006],
    [0.03, 0.022],
    [0.018, 0.035],
    [0, 0.035],
  ],
  // Cornice: y = 0 at the ceiling, negative downward
  cornice: [
    [0, -0.3],
    [0.016, -0.3],
    [0.02, -0.285],
    [0.03, -0.28],
    [0.03, -0.26],
    ...arc(0.23, -0.26, 0.2, Math.PI, Math.PI / 2, 10),
    [0.23, -0.05],
    [0.25, -0.05],
    [0.25, -0.03],
    [0.29, -0.03],
    [0.29, 0],
    [0, 0],
  ],
  architrave: [
    [0, 0],
    [0.032, 0],
    [0.04, 0.012],
    [0.04, 0.03],
    [0.03, 0.042],
    [0.028, 0.1],
    [0.022, 0.12],
    [0.016, 0.13],
    [0.012, 0.15],
    [0, 0.15],
  ],
  pictureRail: [
    [0, -0.02],
    [0.012, -0.02],
    [0.022, -0.01],
    [0.022, 0.012],
    [0.012, 0.02],
    [0, 0.02],
  ],
  handrail: [
    [-0.035, -0.03],
    [0.035, -0.03],
    [0.04, -0.01],
    [0.032, 0.02],
    [0.015, 0.035],
    [-0.015, 0.035],
    [-0.032, 0.02],
    [-0.04, -0.01],
  ],
  // Picture frame: x out of wall, y toward the outside of the frame
  frame: [
    [0, -0.01],
    [0.018, -0.01],
    [0.03, 0.01],
    [0.04, 0.03],
    [0.05, 0.05],
    [0.046, 0.07],
    [0.034, 0.08],
    [0.022, 0.09],
    [0, 0.09],
  ],
  ornateFrame: [
    [0, -0.015],
    [0.02, -0.015],
    [0.034, 0.0],
    [0.03, 0.02],
    [0.045, 0.035],
    [0.07, 0.06],
    [0.075, 0.085],
    [0.064, 0.11],
    [0.05, 0.12],
    [0.05, 0.14],
    [0.035, 0.16],
    [0, 0.16],
  ],
};

// ------------------------------------------------------------- LATHE

/** Lathe from (radius, height) pairs. UVs: u around, v = height in metres. */
export function latheGeo(name: string, pts: [number, number][], segments = 24): THREE.BufferGeometry {
  return cached(`lathe:${name}:${segments}`, () => {
    const g = new THREE.LatheGeometry(
      pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)),
      segments,
    );
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.3, pos.getY(i));
    return g;
  });
}

export const LATHES: Record<string, [number, number][]> = {
  baluster: [
    [0, 0],
    [0.028, 0],
    [0.028, 0.06],
    [0.022, 0.07],
    [0.02, 0.1],
    [0.03, 0.18],
    [0.034, 0.26],
    [0.026, 0.36],
    [0.016, 0.44],
    [0.014, 0.6],
    [0.02, 0.64],
    [0.014, 0.68],
    [0.016, 0.74],
    [0.024, 0.76],
    [0.024, 0.8],
    [0, 0.8],
  ],
  newelCap: [
    [0, 0],
    [0.09, 0],
    [0.1, 0.02],
    [0.08, 0.05],
    [0.06, 0.07],
    [0.07, 0.1],
    [0.05, 0.14],
    [0.03, 0.17],
    [0, 0.19],
  ],
  tableLeg: [
    [0, 0],
    [0.025, 0],
    [0.03, 0.03],
    [0.022, 0.06],
    [0.02, 0.2],
    [0.03, 0.32],
    [0.034, 0.4],
    [0.026, 0.48],
    [0.024, 0.6],
    [0.03, 0.64],
    [0.032, 0.7],
    [0, 0.7],
  ],
  pedestal: [
    [0, 0],
    [0.3, 0],
    [0.3, 0.03],
    [0.18, 0.08],
    [0.1, 0.16],
    [0.07, 0.3],
    [0.09, 0.42],
    [0.06, 0.52],
    [0.07, 0.62],
    [0.12, 0.68],
    [0.12, 0.7],
    [0, 0.7],
  ],
  knob: [
    [0, 0],
    [0.012, 0],
    [0.012, 0.03],
    [0.025, 0.045],
    [0.03, 0.06],
    [0.025, 0.075],
    [0, 0.078],
  ],
  candlestick: [
    [0, 0],
    [0.06, 0],
    [0.06, 0.01],
    [0.03, 0.03],
    [0.014, 0.06],
    [0.012, 0.16],
    [0.02, 0.18],
    [0.012, 0.2],
    [0.012, 0.26],
    [0.022, 0.27],
    [0.022, 0.28],
    [0, 0.28],
  ],
  vase: [
    [0, 0],
    [0.07, 0],
    [0.08, 0.02],
    [0.06, 0.05],
    [0.1, 0.16],
    [0.12, 0.26],
    [0.09, 0.36],
    [0.05, 0.42],
    [0.045, 0.5],
    [0.07, 0.54],
    [0.068, 0.55],
    [0.04, 0.52],
    [0, 0.5],
  ],
  lampBase: [
    [0, 0],
    [0.08, 0],
    [0.08, 0.02],
    [0.05, 0.04],
    [0.03, 0.08],
    [0.06, 0.18],
    [0.07, 0.24],
    [0.04, 0.3],
    [0.015, 0.34],
    [0.015, 0.42],
    [0, 0.42],
  ],
  lampShade: [
    [0.06, 0],
    [0.17, -0.0],
    [0.17, 0.01],
    [0.075, 0.2],
    [0.07, 0.2],
  ],
  column: [
    [0, 0],
    [0.24, 0],
    [0.24, 0.08],
    [0.2, 0.12],
    [0.19, 0.16],
    [0.17, 0.2],
    [0.16, 2.6],
    [0.18, 2.66],
    [0.2, 2.72],
    [0.24, 2.8],
    [0.24, 2.88],
    [0, 2.88],
  ],
  finial: [
    [0, 0],
    [0.03, 0],
    [0.04, 0.02],
    [0.02, 0.05],
    [0.035, 0.09],
    [0.012, 0.15],
    [0, 0.18],
  ],
  urn: [
    [0, 0],
    [0.08, 0],
    [0.06, 0.05],
    [0.04, 0.08],
    [0.12, 0.2],
    [0.14, 0.3],
    [0.1, 0.38],
    [0.12, 0.4],
    [0, 0.42],
  ],
};
