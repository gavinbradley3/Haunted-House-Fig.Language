// Reads WebP headers (no dependencies): dimensions, codec, alpha, and a SHA-256 for duplicate checks.
// Usage: node scripts/paintings/inspect-webp.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir = process.argv[2];
const rows = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).sort()) {
  const b = fs.readFileSync(path.join(dir, f));
  const r = { file: f, bytes: b.length, ok: false };
  if (b.length >= 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    r.codec = chunk.trim();
    if (chunk === 'VP8 ') { r.w = b.readUInt16LE(26) & 0x3fff; r.h = b.readUInt16LE(28) & 0x3fff; }
    else if (chunk === 'VP8L') { const v = b.readUInt32LE(21); r.w = (v & 0x3fff) + 1; r.h = ((v >> 14) & 0x3fff) + 1; r.alpha = !!((v >> 28) & 1); }
    else if (chunk === 'VP8X') { r.w = 1 + b.readUIntLE(24, 3); r.h = 1 + b.readUIntLE(27, 3); r.alpha = !!(b[20] & 0x10); }
    r.riffSizeOk = b.readUInt32LE(4) + 8 === b.length;
    r.ok = !!(r.w && r.h && r.riffSizeOk);
  }
  r.aspect = r.w ? +(r.w / r.h).toFixed(4) : null;
  r.sha = crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
  rows.push(r);
}
console.log(JSON.stringify(rows, null, 1));
