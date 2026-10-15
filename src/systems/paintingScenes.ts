/**
 * Compositions for the mansion's paintings, rendered through the painterly pass.
 * Each is an original image composed in code.
 */
import { bareTree, clouds, glow, lightning, linear, makeCanvas, paint, perspectiveRoom, poly, portraitHead, radial, rain, type SceneSpec } from './painterly';

export type ArtId =
  | 'houseBreath'
  | 'deafeningSilence'
  | 'caretaker'
  | 'coldFeet'
  | 'whisperingWalls'
  | 'oldManShadow'
  | 'nervousSitter'
  | 'ladyOfHouse'
  | 'ladyOfHouseTurned'
  | 'emptyCanvas';

const SPECS: Record<ArtId, SceneSpec> = {
  houseBreath: {
    w: 1024,
    h: 768,
    seed: 11,
    varnish: 0.5,
    draw(g, w, h, rnd) {
      g.fillStyle = linear(g, 0, 0, 0, h, [
        [0, '#0b1018'],
        [0.45, '#1f2a36'],
        [0.6, '#4a5258'],
        [0.66, '#2a3030'],
        [1, '#0c0f0e'],
      ]);
      g.fillRect(0, 0, w, h);
      glow(g, w * 0.55, h * 0.42, w * 0.45, 'rgba(150,165,175,0.35)');
      clouds(g, rnd, 0, h * 0.05, w, h * 0.3, '#3a4550', 30, 0.3);
      // Distant hills
      poly(g, [
        [0, h * 0.6],
        [w * 0.2, h * 0.55],
        [w * 0.45, h * 0.58],
        [w * 0.7, h * 0.54],
        [w, h * 0.59],
        [w, h * 0.66],
        [0, h * 0.66],
      ], '#1a2022');
      // The house: two faces in perspective
      const hx = w * 0.42;
      const base = h * 0.62;
      const fw = w * 0.2;
      const sw = w * 0.1;
      const H = h * 0.26;
      poly(g, [
        [hx, base],
        [hx + fw, base],
        [hx + fw, base - H],
        [hx, base - H],
      ], linear(g, hx, 0, hx + fw, 0, [
        [0, '#2a2a28'],
        [1, '#3a3834'],
      ]));
      poly(g, [
        [hx + fw, base],
        [hx + fw + sw, base - h * 0.02],
        [hx + fw + sw, base - H - h * 0.02],
        [hx + fw, base - H],
      ], '#1a1a19');
      poly(g, [
        [hx - w * 0.01, base - H],
        [hx + fw / 2, base - H - h * 0.14],
        [hx + fw + w * 0.01, base - H],
      ], '#141414');
      poly(g, [
        [hx + fw / 2, base - H - h * 0.14],
        [hx + fw / 2 + sw, base - H - h * 0.16],
        [hx + fw + sw, base - H - h * 0.02],
        [hx + fw, base - H],
      ], '#0e0e0e');
      for (const cx of [hx + fw * 0.15, hx + fw * 0.82]) g.fillRect(cx, base - H - h * 0.16, fw * 0.07, h * 0.08);
      // Dark windows: three rows, every one black
      g.fillStyle = '#060707';
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++) g.fillRect(hx + fw * (0.1 + c * 0.22), base - H + h * (0.03 + r * 0.075), fw * 0.1, h * 0.05);
      g.fillRect(hx + fw * 0.44, base - h * 0.06, fw * 0.12, h * 0.06);
      // Still bare trees
      g.save();
      bareTree(g, rnd, w * 0.18, base + h * 0.01, h * 0.12, -Math.PI / 2, 9, '#0d0f0e', 7);
      bareTree(g, rnd, w * 0.84, base + h * 0.01, h * 0.1, -Math.PI / 2 - 0.05, 7, '#0d0f0e', 7);
      g.restore();
      // Perfectly still pond: an exact, darkened reflection
      const pond = makeCanvas(w, h);
      const pg = pond.getContext('2d')!;
      pg.drawImage(g.canvas, 0, 0);
      g.save();
      g.beginPath();
      g.ellipse(w * 0.52, h * 0.82, w * 0.46, h * 0.14, 0, 0, Math.PI * 2);
      g.clip();
      g.translate(0, base * 2 + h * 0.02);
      g.scale(1, -1);
      g.globalAlpha = 0.55;
      g.drawImage(pond, 0, 0);
      g.restore();
      g.fillStyle = 'rgba(8,12,14,0.45)';
      g.beginPath();
      g.ellipse(w * 0.52, h * 0.82, w * 0.46, h * 0.14, 0, 0, Math.PI * 2);
      g.fill();
      // Mist lying flat on the ground
      clouds(g, rnd, 0, base - h * 0.03, w, h * 0.06, '#5a6266', 26, 0.22);
    },
  },

  deafeningSilence: {
    w: 768,
    h: 1024,
    seed: 23,
    draw(g, w, h, rnd) {
      const back: [number, number, number, number] = [w * 0.36, h * 0.2, w * 0.64, h * 0.56];
      perspectiveRoom(g, w, h, {
        vx: w / 2,
        vy: h * 0.42,
        back,
        wall: linear(g, 0, 0, w, 0, [
          [0, '#2b2620'],
          [0.5, '#4b443a'],
          [1, '#2b2620'],
        ]) as unknown as string,
        floor: linear(g, 0, h, 0, h * 0.56, [
          [0, '#1b1612'],
          [1, '#3d352b'],
        ]) as unknown as string,
        ceiling: '#17140f',
        backWall: '#5a5246',
      });
      // Tall arched windows on the back wall throwing pale shafts
      for (const fx of [0.4, 0.5, 0.6]) {
        const x = w * fx;
        g.fillStyle = '#c9c6b8';
        g.beginPath();
        g.moveTo(x - w * 0.025, h * 0.5);
        g.lineTo(x - w * 0.025, h * 0.3);
        g.arc(x, h * 0.3, w * 0.025, Math.PI, 0);
        g.lineTo(x + w * 0.025, h * 0.5);
        g.fill();
        g.save();
        g.globalAlpha = 0.12;
        poly(g, [
          [x - w * 0.025, h * 0.3],
          [x + w * 0.025, h * 0.3],
          [x + w * 0.16, h * 0.98],
          [x - w * 0.02, h * 0.98],
        ], '#d8d4c4');
        g.restore();
      }
      // Receding columns on both sides
      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        const lx = w * (0.02 + t * 0.32);
        const rx = w * (0.98 - t * 0.32);
        const top = h * (0.02 + t * 0.17);
        const bot = h * (0.98 - t * 0.4);
        const cw = w * (0.06 - t * 0.04);
        g.fillStyle = linear(g, lx, 0, lx + cw, 0, [
          [0, '#1a1712'],
          [0.4, '#5a5145'],
          [1, '#2a251e'],
        ]);
        g.fillRect(lx, top, cw, bot - top);
        g.fillStyle = linear(g, rx - cw, 0, rx, 0, [
          [0, '#2a251e'],
          [0.6, '#5a5145'],
          [1, '#1a1712'],
        ]);
        g.fillRect(rx - cw, top, cw, bot - top);
      }
      // A single small figure in the centre, and its long shadow
      const fx = w * 0.5;
      const fy = h * 0.74;
      g.fillStyle = 'rgba(0,0,0,0.45)';
      poly(g, [
        [fx - 4, fy],
        [fx + 4, fy],
        [fx + 60, h * 0.93],
        [fx + 40, h * 0.94],
      ], 'rgba(10,8,6,0.5)');
      g.fillStyle = '#0d0b09';
      g.beginPath();
      g.ellipse(fx, fy - 46, 6, 7, 0, 0, Math.PI * 2);
      g.fill();
      poly(g, [
        [fx - 9, fy - 38],
        [fx + 9, fy - 38],
        [fx + 11, fy],
        [fx - 11, fy],
      ], '#0d0b09');
      // Dust hanging in the light
      for (let i = 0; i < 60; i++) {
        g.fillStyle = `rgba(230,225,210,${0.08 + rnd() * 0.12})`;
        g.fillRect(w * (0.35 + rnd() * 0.35), h * (0.3 + rnd() * 0.5), 2, 2);
      }
    },
  },

  caretaker: {
    w: 768,
    h: 1024,
    seed: 37,
    brush: 1.1,
    draw(g, w, h, rnd) {
      // Dark panelled interior
      g.fillStyle = linear(g, 0, 0, w, h, [
        [0, '#1c1a16'],
        [1, '#0b0a08'],
      ]);
      g.fillRect(0, 0, w, h);
      // Window behind, left: a storm outside
      const wx = w * 0.06;
      const wy = h * 0.1;
      const ww = w * 0.3;
      const wh = h * 0.42;
      g.fillStyle = linear(g, 0, wy, 0, wy + wh, [
        [0, '#232c38'],
        [0.6, '#45505a'],
        [1, '#1a2026'],
      ]);
      g.fillRect(wx, wy, ww, wh);
      g.save();
      g.beginPath();
      g.rect(wx, wy, ww, wh);
      g.clip();
      clouds(g, rnd, wx - 40, wy, ww + 80, wh * 0.7, '#0e1218', 24, 0.6);
      lightning(g, rnd, wx + ww * 0.6, wy, wh * 0.7);
      rain(g, rnd, wx, wy, ww, wh, 0.2, 160);
      g.restore();
      g.strokeStyle = '#0a0806';
      g.lineWidth = 10;
      g.strokeRect(wx, wy, ww, wh);
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(wx + ww / 2, wy);
      g.lineTo(wx + ww / 2, wy + wh);
      g.moveTo(wx, wy + wh / 2);
      g.lineTo(wx + ww, wy + wh / 2);
      g.stroke();
      // Storm clouds boiling up behind and around the caretaker, lit at their edges
      clouds(g, rnd, w * 0.2, h * 0.12, w * 0.8, h * 0.55, '#1c2128', 60, 0.7);
      clouds(g, rnd, w * 0.3, h * 0.1, w * 0.7, h * 0.35, '#4a535e', 40, 0.45);
      clouds(g, rnd, w * 0.6, h * 0.22, w * 0.4, h * 0.25, '#7a8592', 18, 0.3);
      lightning(g, rnd, w * 0.86, h * 0.12, h * 0.28);
      glow(g, w * 0.86, h * 0.2, w * 0.2, 'rgba(170,190,215,0.35)');
      rain(g, rnd, w * 0.5, h * 0.15, w * 0.5, h * 0.75, 0.16, 260);
      // The caretaker: stern, cold light from the window on his left cheek
      portraitHead(g, w * 0.55, h * 0.36, h * 0.24, {
        light: -1,
        skin: '#b58f74',
        shadow: '#22160f',
        lightColor: '#cfd3d6',
        hair: '#6a645c',
        coat: '#121110',
        stern: 1,
        old: true,
      });
      // Wind tearing at the coat on the storm side
      g.fillStyle = '#121110';
      g.beginPath();
      g.moveTo(w * 0.78, h * 0.62);
      g.quadraticCurveTo(w * 0.92, h * 0.68, w * 0.98, h * 0.6);
      g.quadraticCurveTo(w * 0.9, h * 0.75, w * 0.8, h * 0.78);
      g.fill();
      // A heavy ring of keys in his hands
      const kx = w * 0.5;
      const ky = h * 0.84;
      g.strokeStyle = '#8a6d3a';
      g.lineWidth = 5;
      g.beginPath();
      g.ellipse(kx, ky, 34, 26, 0.2, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 6; i++) {
        const a = 1.6 + i * 0.28;
        const sx = kx + Math.cos(a) * 30;
        const sy = ky + Math.sin(a) * 22;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(a) * 46, sy + Math.sin(a) * 46);
        g.stroke();
      }
      g.fillStyle = '#9c7d62';
      g.beginPath();
      g.ellipse(kx - 30, ky + 6, 26, 18, -0.3, 0, Math.PI * 2);
      g.ellipse(kx + 34, ky - 2, 24, 17, 0.4, 0, Math.PI * 2);
      g.fill();
      // A single gust-blown strand of light across the coat
      glow(g, w * 0.32, h * 0.32, w * 0.18, 'rgba(180,195,210,0.18)');
    },
  },

  coldFeet: {
    w: 768,
    h: 1024,
    seed: 41,
    draw(g, w, h, rnd) {
      g.fillStyle = linear(g, 0, 0, 0, h, [
        [0, '#17130f'],
        [1, '#0c0a08'],
      ]);
      g.fillRect(0, 0, w, h);
      // Floor
      poly(g, [
        [0, h * 0.7],
        [w, h * 0.7],
        [w, h],
        [0, h],
      ], linear(g, 0, h * 0.7, 0, h, [
        [0, '#2a2119'],
        [1, '#120e0a'],
      ]) as unknown as string);
      // The open doorway and its cold blue light
      const dx = w * 0.52;
      const dw = w * 0.26;
      g.fillStyle = linear(g, 0, h * 0.2, 0, h * 0.7, [
        [0, '#8fa6bf'],
        [1, '#c8d6e2'],
      ]);
      g.fillRect(dx, h * 0.2, dw, h * 0.5);
      glow(g, dx + dw / 2, h * 0.5, w * 0.45, 'rgba(150,185,215,0.3)');
      // Light pooling on the floor
      g.save();
      g.globalAlpha = 0.45;
      poly(g, [
        [dx, h * 0.7],
        [dx + dw, h * 0.7],
        [dx + dw + w * 0.2, h],
        [dx - w * 0.25, h],
      ], '#7d93a8');
      g.restore();
      // Door leaf swung inward, edge-on
      poly(g, [
        [dx + dw, h * 0.2],
        [dx + dw + w * 0.09, h * 0.16],
        [dx + dw + w * 0.09, h * 0.76],
        [dx + dw, h * 0.7],
      ], '#24190f');
      // Snow drifting out of the doorway
      for (let i = 0; i < 140; i++) {
        g.fillStyle = `rgba(235,242,250,${0.25 + rnd() * 0.5})`;
        const sx = dx - w * 0.15 + rnd() * (dw + w * 0.3);
        const sy = h * (0.25 + rnd() * 0.65);
        g.beginPath();
        g.arc(sx, sy, 1 + rnd() * 2.2, 0, Math.PI * 2);
        g.fill();
      }
      // A hesitant figure seen from behind, a step back from the threshold
      const fx = w * 0.38;
      const fy = h * 0.86;
      g.fillStyle = '#0f0d0b';
      g.beginPath();
      g.ellipse(fx, fy - h * 0.42, w * 0.045, h * 0.04, 0, 0, Math.PI * 2);
      g.fill();
      poly(g, [
        [fx - w * 0.075, fy - h * 0.37],
        [fx + w * 0.075, fy - h * 0.37],
        [fx + w * 0.09, fy - h * 0.08],
        [fx - w * 0.09, fy - h * 0.08],
      ], '#141210');
      // Rim light on the figure's edge
      g.strokeStyle = 'rgba(160,190,215,0.6)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(fx + w * 0.075, fy - h * 0.37);
      g.lineTo(fx + w * 0.09, fy - h * 0.08);
      g.stroke();
      g.fillStyle = '#100e0c';
      g.fillRect(fx - w * 0.05, fy - h * 0.08, w * 0.03, h * 0.06);
      g.fillRect(fx + w * 0.02, fy - h * 0.08, w * 0.03, h * 0.06);
      // The literal joke, kept quiet: frost creeping up from the bare feet
      g.fillStyle = 'rgba(205,225,240,0.75)';
      g.beginPath();
      g.ellipse(fx, fy - h * 0.015, w * 0.11, h * 0.018, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(220,235,248,0.7)';
      g.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) {
        const sx = fx + (rnd() - 0.5) * w * 0.2;
        const sy = fy - h * 0.01;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx + (rnd() - 0.5) * 30, sy - rnd() * h * 0.05);
        g.stroke();
      }
    },
  },

  whisperingWalls: {
    w: 768,
    h: 1024,
    seed: 53,
    draw(g, w, h, rnd) {
      const back: [number, number, number, number] = [w * 0.42, h * 0.36, w * 0.58, h * 0.6];
      perspectiveRoom(g, w, h, {
        vx: w / 2,
        vy: h * 0.48,
        back,
        wall: '#3a3324',
        floor: linear(g, 0, h, 0, h * 0.6, [
          [0, '#14100c'],
          [1, '#2e261c'],
        ]) as unknown as string,
        ceiling: '#141210',
        backWall: '#1a1612',
      });
      // A faint lamp at the far end
      glow(g, w * 0.5, h * 0.45, w * 0.18, 'rgba(220,170,100,0.5)');
      // Wallpaper: a repeating ornament that, looked at long enough, is rows of parted lips
      g.save();
      for (const side of [-1, 1]) {
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 7; col++) {
            const t = col / 7; // 0 near the viewer .. 1 toward the end
            const xNear = side < 0 ? w * 0.04 : w * 0.96;
            const xFar = side < 0 ? w * 0.4 : w * 0.6;
            const x = xNear + (xFar - xNear) * t;
            const yTop = h * (0.04 + t * 0.32);
            const yBot = h * (0.96 - t * 0.36);
            const y = yTop + (yBot - yTop) * ((row + 0.5) / 9);
            const s = (1 - t * 0.8) * w * 0.035;
            g.globalAlpha = 0.5 * (1 - t * 0.6);
            g.fillStyle = '#5a4c33';
            g.beginPath();
            g.ellipse(x, y, s * 0.7, s * 1.1, 0, 0, Math.PI * 2);
            g.fill();
            // Lips: upper and lower curves with a dark gap
            g.fillStyle = '#2a1e16';
            g.beginPath();
            g.ellipse(x, y + s * 0.15, s * 0.42, s * 0.12 + (rnd() < 0.3 ? s * 0.08 : 0), 0, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#6e4a3a';
            g.beginPath();
            g.ellipse(x, y + s * 0.05, s * 0.45, s * 0.1, 0, Math.PI, Math.PI * 2);
            g.fill();
            // Faint eyes above, only on some motifs
            if ((row + col) % 3 === 0) {
              g.fillStyle = '#2a1e16';
              g.fillRect(x - s * 0.3, y - s * 0.4, s * 0.15, s * 0.06);
              g.fillRect(x + s * 0.15, y - s * 0.4, s * 0.15, s * 0.06);
            }
          }
        }
      }
      g.restore();
      // Runner down the corridor
      poly(g, [
        [w * 0.47, h * 0.6],
        [w * 0.53, h * 0.6],
        [w * 0.7, h],
        [w * 0.3, h],
      ], '#3a1a16');
    },
  },

  oldManShadow: {
    w: 768,
    h: 1024,
    seed: 61,
    draw(g, w, h, rnd) {
      g.fillStyle = linear(g, 0, 0, w, 0, [
        [0, '#4a4234'],
        [0.5, '#2e2820'],
        [1, '#100d0a'],
      ]);
      g.fillRect(0, 0, w, h);
      glow(g, w * 0.2, h * 0.3, w * 0.5, 'rgba(200,170,120,0.25)');
      // His long shadow on the wall, much taller than he is
      g.save();
      g.filter = 'blur(10px)';
      g.fillStyle = 'rgba(8,6,4,0.75)';
      g.beginPath();
      g.ellipse(w * 0.68, h * 0.2, w * 0.1, h * 0.08, 0.1, 0, Math.PI * 2);
      g.fill();
      poly(g, [
        [w * 0.55, h * 0.27],
        [w * 0.82, h * 0.27],
        [w * 0.88, h * 0.95],
        [w * 0.5, h * 0.95],
      ], 'rgba(8,6,4,0.75)');
      g.restore();
      // The old man: thin, stooped, already half shadow
      portraitHead(g, w * 0.42, h * 0.33, h * 0.16, {
        light: -1,
        skin: '#a68a72',
        shadow: '#1a120c',
        hair: '#b8b2a6',
        coat: '#16130f',
        turn: 0.3,
        old: true,
      });
      // Lower body fades into the dark rather than ending
      g.fillStyle = linear(g, 0, h * 0.5, 0, h, [
        [0, 'rgba(16,13,10,0.0)'],
        [1, 'rgba(8,6,4,0.95)'],
      ]);
      g.fillRect(0, h * 0.5, w, h * 0.5);
      // A walking stick
      g.strokeStyle = '#2a1e14';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(w * 0.28, h * 0.62);
      g.lineTo(w * 0.24, h * 0.98);
      g.stroke();
      void rnd;
    },
  },

  nervousSitter: {
    w: 768,
    h: 1024,
    seed: 71,
    draw(g, w, h, rnd) {
      g.fillStyle = linear(g, 0, 0, 0, h, [
        [0, '#1e271f'],
        [1, '#0c100c'],
      ]);
      g.fillRect(0, 0, w, h);
      // A small oil lamp on a side table: the only warm light
      glow(g, w * 0.82, h * 0.55, w * 0.4, 'rgba(230,170,90,0.35)');
      g.fillStyle = '#2a1e14';
      g.fillRect(w * 0.72, h * 0.62, w * 0.24, h * 0.03);
      g.fillStyle = '#e8c88a';
      g.beginPath();
      g.ellipse(w * 0.84, h * 0.55, w * 0.035, h * 0.05, 0, 0, Math.PI * 2);
      g.fill();
      // Chair back
      g.fillStyle = '#2a1712';
      g.beginPath();
      g.ellipse(w * 0.48, h * 0.5, w * 0.3, h * 0.3, 0, 0, Math.PI * 2);
      g.fill();
      portraitHead(g, w * 0.48, h * 0.33, h * 0.17, {
        light: 1,
        skin: '#d1ac90',
        shadow: '#2a1a12',
        hair: '#3a2416',
        coat: '#2c3a33',
        female: true,
        lightColor: '#f0cfa2',
      });
      // Hands clasped tightly in her lap
      g.fillStyle = '#c7a185';
      g.beginPath();
      g.ellipse(w * 0.46, h * 0.78, w * 0.07, h * 0.03, 0.2, 0, Math.PI * 2);
      g.ellipse(w * 0.52, h * 0.775, w * 0.065, h * 0.028, -0.3, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(80,50,35,0.6)';
      g.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(w * (0.47 + i * 0.012), h * 0.765);
        g.lineTo(w * (0.475 + i * 0.012), h * 0.79);
        g.stroke();
      }
      void rnd;
    },
  },

  ladyOfHouse: ladySpec(0),
  ladyOfHouseTurned: ladySpec(0.75),

  emptyCanvas: {
    w: 512,
    h: 640,
    seed: 83,
    varnish: 0.7,
    draw(g, w, h) {
      g.fillStyle = radial(g, w / 2, h / 2, 10, w * 0.7, [
        [0, '#2a241c'],
        [1, '#0e0c09'],
      ]);
      g.fillRect(0, 0, w, h);
    },
  },
};

function ladySpec(turn: number): SceneSpec {
  return {
    w: 768,
    h: 1024,
    seed: 91,
    draw(g, w, h, rnd) {
      g.fillStyle = linear(g, 0, 0, w, h, [
        [0, '#2b2217'],
        [1, '#0b0907'],
      ]);
      g.fillRect(0, 0, w, h);
      glow(g, w * 0.4, h * 0.3, w * 0.45, 'rgba(170,130,80,0.28)');
      // A curtain swag
      g.fillStyle = '#3a1612';
      g.beginPath();
      g.moveTo(w, 0);
      g.lineTo(w * 0.62, 0);
      g.quadraticCurveTo(w * 0.8, h * 0.25, w * 0.92, h * 0.7);
      g.lineTo(w, h * 0.72);
      g.fill();
      portraitHead(g, w * 0.46, h * 0.34, h * 0.2, {
        light: -1,
        skin: '#d4b096',
        shadow: '#24170f',
        hair: '#1a120c',
        coat: '#1d2420',
        female: true,
        turn,
      });
      // Pearls at the throat
      g.fillStyle = '#e6e0d2';
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * (0.15 + (i / 10) * 0.7);
        g.beginPath();
        g.arc(w * 0.46 + Math.cos(a) * w * 0.08, h * 0.46 + Math.sin(a) * h * 0.035, 4, 0, Math.PI * 2);
        g.fill();
      }
      void rnd;
    },
  };
}

const cache = new Map<ArtId, HTMLCanvasElement>();
export function artCanvas(id: ArtId): HTMLCanvasElement {
  let c = cache.get(id);
  if (!c) {
    c = paint(SPECS[id]);
    cache.set(id, c);
  }
  return c;
}
export function artAspect(id: ArtId) {
  return SPECS[id].w / SPECS[id].h;
}
