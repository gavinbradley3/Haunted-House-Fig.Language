// Rebuild the Phase 11 haunting images from the project's own paintings (no third-party art).
// Needs sharp, which is not a game dependency:  npm i --no-save sharp  then
//   node scripts/phase11/make-images.cjs
// Writes src/assets/haunting/decor-D02/D09/D12/D14-haunted.webp.
// lady-apparition.webp and painting-ladyOfHouse-empty.webp are Astra artwork and are not made here; the old
// stand-in apparition (cut from the portrait) is only rebuilt with --stand-in, into stand-in-apparition.webp.
const sharp = require('sharp');

const P = 'src/assets/paintings/';
const OUT = 'src/assets/haunting/';
const LADY = P + 'painting-ladyOfHouse-turned.webp';

/**
 * The old stand-in apparition: the Lady cut from her portrait (768x1024) along a hand-placed outline, feathered.
 * The painting ends at her thighs, so below it her skirt continues from the last rows of fabric (the folds
 * hang straight down), darkening and fading out toward the floor. Cropped to the figure, 768 px tall.
 */
async function apparition() {
  const pts = [
    [355, 38], [405, 42], [445, 58], [470, 100], [478, 160], [468, 205], [455, 235], [440, 272], [428, 300], [432, 335], [448, 365],
    [495, 374], [540, 398], [585, 432], [622, 482], [652, 560], [680, 640], [700, 700], [704, 745], [690, 772], [640, 778], [598, 778], [578, 800],
    [566, 832], [528, 900], [492, 942], [458, 948], [438, 935], [436, 896], [446, 840], [466, 800], [468, 790],
    [458, 860], [456, 950], [462, 1024], [40, 1024], [58, 905], [100, 800], [128, 700], [148, 620], [160, 520], [176, 460], [202, 430],
    [240, 402], [274, 386], [300, 372], [322, 338], [298, 318], [280, 312], [262, 292], [250, 250], [247, 175], [262, 112], [294, 66], [324, 48],
  ];
  const W = 768, H = 1024, EXT = 700, TOTAL = H + EXT;
  const poly = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="#fff"/></svg>`;
  const mask = await sharp(Buffer.from(poly)).blur(3.5).extractChannel(0).raw().toBuffer();
  const rgb = await sharp(LADY).removeAlpha().raw().toBuffer();
  const img = Buffer.alloc(W * TOTAL * 4);
  for (let i = 0; i < W * H; i++) {
    img[i * 4] = rgb[i * 3];
    img[i * 4 + 1] = rgb[i * 3 + 1];
    img[i * 4 + 2] = rgb[i * 3 + 2];
    img[i * 4 + 3] = mask[i];
  }
  const band = 60, y0 = H - band - 4;
  for (let y = H; y < TOTAL; y++) {
    const u = (y - H) / EXT;
    const sy = y0 + Math.floor((((y - H) * band) / EXT) * 0.999);
    const dark = 1 - 0.55 * u;
    const fade = Math.max(0, 1 - Math.pow(u / 0.92, 1.6));
    for (let x = 0; x < W; x++) {
      const s = (sy * W + x) * 4, d = (y * W + x) * 4;
      img[d] = img[s] * dark;
      img[d + 1] = img[s + 1] * dark;
      img[d + 2] = img[s + 2] * dark;
      img[d + 3] = img[s + 3] * fade;
    }
  }
  // Soften the join at the canvas edge with a vertical blur, blended in and out.
  const R = 14, a = H - 60, b = H + 80, copy = Buffer.from(img);
  for (let y = a; y < b; y++)
    for (let x = 0; x < W; x++)
      for (let c = 0; c < 4; c++) {
        let sum = 0, n = 0;
        for (let k = -R; k <= R; k++) {
          const yy = y + k;
          if (yy >= 0 && yy < TOTAL) {
            sum += copy[(yy * W + x) * 4 + c];
            n++;
          }
        }
        const w = Math.min(1, Math.min(y - a, b - y) / 20);
        img[(y * W + x) * 4 + c] = copy[(y * W + x) * 4 + c] * (1 - w) + (sum / n) * w;
      }
  const cropX = 24, cropW = 700;
  const outH = 768, outW = Math.round(((cropW / (TOTAL - 20)) * outH) / 4) * 4;
  await sharp(img, { raw: { width: W, height: TOTAL, channels: 4 } })
    .extract({ left: cropX, top: 20, width: cropW, height: TOTAL - 20 })
    .resize(outW, outH)
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(OUT + 'stand-in-apparition.webp');
  console.log(`stand-in-apparition.webp ${outW}x${outH}`);
}

/**
 * Her face, faint in the darkness behind another portrait's sitter: head and hair from her portrait,
 * desaturated and darkened, with its alpha keyed on brightness (so only her pale face, the pearls and the
 * white streak in her hair show), feathered to an oval. (cx, cy): centre in the target; hgt: height in px.
 */
async function faceIn(file, out, cx, cy, hgt, alpha) {
  const box = { left: 228, top: 30, width: 262, height: 330 };
  const h = Math.round(hgt), w = Math.round((box.width / box.height) * h);
  const oval = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="50%" cy="46%" r="50%"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`;
  const m = await sharp(Buffer.from(oval)).extractChannel(0).raw().toBuffer();
  const face = await sharp(LADY).extract(box).resize(w, h).modulate({ brightness: 0.78, saturation: 0.55 }).blur(0.7).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = face[i * 3];
    rgba[i * 4 + 1] = face[i * 3 + 1];
    rgba[i * 4 + 2] = face[i * 3 + 2];
    const L = (0.3 * face[i * 3] + 0.59 * face[i * 3 + 1] + 0.11 * face[i * 3 + 2]) / 255;
    rgba[i * 4 + 3] = m[i] * alpha * Math.min(1, Math.max(0, (L - 0.16) / 0.3));
  }
  const layer = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  await sharp(P + file)
    .composite([{ input: layer, left: Math.round(cx - w / 2), top: Math.round(cy - h / 2) }])
    .webp({ quality: 88 })
    .toFile(OUT + out);
  console.log(out);
}

(async () => {
  if (process.argv.includes("--stand-in")) await apparition();
  await faceIn('decor-D02-hall-stair-portrait.webp', 'decor-D02-haunted.webp', 352, 112, 118, 0.52);
  await faceIn('decor-D09-gallery-north-portrait.webp', 'decor-D09-haunted.webp', 342, 116, 124, 0.54);
  await faceIn('decor-D12-dining-south-portrait.webp', 'decor-D12-haunted.webp', 352, 88, 104, 0.42);
  await faceIn('decor-D14-nursery-south-portrait.webp', 'decor-D14-haunted.webp', 352, 92, 112, 0.48);
})();
