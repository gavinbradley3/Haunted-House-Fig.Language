// Phase 7: dependency-free GLB validation. Reads each GLB's JSON chunk and reports nodes, bounds
// (glTF Y-up metres), triangles, vertex attributes, materials, images, extensions and extras.
// Usage: node scripts/phase7/validate-glb.mjs public/models/*.glb
import fs from 'node:fs';
import path from 'node:path';

const files = process.argv.slice(2);
let failed = false;
for (const file of files) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const problems = [];
  console.log(`\n${path.basename(file)}  ${(buf.length / 1024).toFixed(0)} KB  glTF ${gltf.asset.version} (${gltf.asset.generator})`);
  console.log(`  extensionsUsed: ${(gltf.extensionsUsed ?? []).join(', ') || '-'}  required: ${(gltf.extensionsRequired ?? []).join(', ') || '-'}`);
  let tris = 0;
  for (const node of gltf.nodes) {
    if (node.mesh === undefined) continue;
    const mesh = gltf.meshes[node.mesh];
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    let nt = 0;
    const attrs = new Set();
    for (const p of mesh.primitives) {
      const pos = gltf.accessors[p.attributes.POSITION];
      pos.min.forEach((v, i) => (min[i] = Math.min(min[i], v)));
      pos.max.forEach((v, i) => (max[i] = Math.max(max[i], v)));
      nt += (p.indices !== undefined ? gltf.accessors[p.indices].count : pos.count) / 3;
      Object.keys(p.attributes).forEach((a) => attrs.add(a));
      if (!p.attributes.NORMAL) problems.push(`${node.name}: missing normals`);
      if (!p.attributes.TEXCOORD_0) problems.push(`${node.name}: missing UVs`);
      if (p.material === undefined) problems.push(`${node.name}: primitive without material`);
    }
    tris += nt;
    const size = max.map((v, i) => (v - min[i]).toFixed(3));
    const t = node.translation ? ` t=[${node.translation.map((v) => v.toFixed(3))}]` : '';
    const parent = gltf.nodes.findIndex((n) => n.children?.includes(gltf.nodes.indexOf(node)));
    console.log(`  ${node.name.padEnd(24)} tris ${String(nt).padStart(5)}  size ${size.join(' x ')}  min [${min.map((v) => v.toFixed(3))}]${t}${parent >= 0 ? ` parent=${gltf.nodes[parent].name}` : ''}`);
    console.log(`    attributes: ${[...attrs].join(' ')}  materials: ${mesh.primitives.map((p) => gltf.materials[p.material]?.name).join(', ')}`);
    if (node.extras) console.log(`    extras: ${JSON.stringify(node.extras)}`);
  }
  for (const m of gltf.materials ?? []) {
    const pbr = m.pbrMetallicRoughness ?? {};
    const tex = (t) => (t ? `img${gltf.textures[t.index].source ?? gltf.textures[t.index].extensions?.EXT_texture_webp?.source}` : '-');
    console.log(`  material ${m.name}: base ${tex(pbr.baseColorTexture)} mr ${tex(pbr.metallicRoughnessTexture)} nrm ${tex(m.normalTexture)} metal ${pbr.metallicFactor ?? 1} rough ${pbr.roughnessFactor ?? 1}`);
    // A textured surface that silently defaults to metal is a common export mistake (bare metals are fine).
    if (pbr.metallicFactor === undefined && !pbr.metallicRoughnessTexture && pbr.baseColorTexture) problems.push(`${m.name}: textured but defaults to fully metallic`);
  }
  (gltf.images ?? []).forEach((im, i) => {
    const bv = gltf.bufferViews[im.bufferView];
    console.log(`  img${i} ${im.name} ${im.mimeType} ${(bv.byteLength / 1024).toFixed(0)} KB`);
    if (!im.bufferView) problems.push(`${im.name}: external image reference`);
  });
  console.log(`  total triangles ${tris}`);
  if (problems.length) {
    failed = true;
    console.log('  PROBLEMS:\n   - ' + problems.join('\n   - '));
  } else console.log('  OK');
}
process.exit(failed ? 1 : 0);
