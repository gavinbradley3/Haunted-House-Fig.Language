/**
 * Writing on things in the world: chalk on the giant's menu board and the nursery slate,
 * ink on the Lady's letter. Each distinct text is drawn once onto a small canvas and cached.
 */
import * as THREE from 'three';

type Style = 'chalk' | 'ink';

const cache = new Map<string, THREE.CanvasTexture>();

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** A texture with a heading and a body, sized for a board of the given aspect (width / height). */
export function boardText(heading: string, body: string, aspect: number, style: Style): THREE.CanvasTexture {
  const key = `${style}|${heading}|${body}|${aspect.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  // Keep the cache small: a class may type many sentences.
  if (cache.size > 40) {
    const [k, t] = cache.entries().next().value!;
    t.dispose();
    cache.delete(k);
  }
  const W = 768;
  const H = Math.round(W / aspect);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const chalk = style === 'chalk';
  if (chalk) {
    g.fillStyle = '#1b201e';
    g.fillRect(0, 0, W, H);
    // Smudges of old chalk
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(220,220,210,${0.015 + Math.random() * 0.03})`;
      g.beginPath();
      g.ellipse(Math.random() * W, Math.random() * H, 20 + Math.random() * 90, 6 + Math.random() * 20, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.fillStyle = '#e4d7b8';
    g.fillRect(0, 0, W, H);
    const grd = g.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.75);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(90,60,20,0.35)');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
  }
  const ink = chalk ? 'rgba(236,232,218,0.92)' : 'rgba(40,26,14,0.92)';
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `600 ${Math.round(H * 0.11)}px "Cormorant Garamond", Georgia, serif`;
  g.fillText(heading, W / 2, H * 0.15);
  g.fillRect(W * 0.3, H * 0.25, W * 0.4, 2);
  let size = Math.round(H * 0.1);
  g.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
  let lines = wrap(g, body, W * 0.84);
  while (lines.length * size * 1.2 > H * 0.62 && size > 18) {
    size -= 2;
    g.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
    lines = wrap(g, body, W * 0.84);
  }
  const lh = size * 1.2;
  const y0 = H * 0.6 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => g.fillText(ln, W / 2, y0 + i * lh));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}
