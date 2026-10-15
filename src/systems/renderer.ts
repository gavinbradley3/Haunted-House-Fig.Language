import type * as THREE from 'three';

/** The live renderer, for code outside the React tree (texture uploads, test hooks). */
export const renderer: { gl: THREE.WebGLRenderer | null } = { gl: null };
