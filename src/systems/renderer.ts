import type * as THREE from 'three';

/** The live renderer and scene, for code outside the React tree (texture uploads, test hooks). */
export const renderer: { gl: THREE.WebGLRenderer | null; scene: THREE.Scene | null; camera: THREE.Camera | null } = { gl: null, scene: null, camera: null };
