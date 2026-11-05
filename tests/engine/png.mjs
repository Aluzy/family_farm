/* ==========================================================================
   Lire une image PNG dans les tests (RGBA ou RGB 8 bits, sans entrelacement : comme les écrit PIL,
   scripts/…). Partagé par les tests des planches de personnages (marche, visages).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

// `chemin` : depuis la racine du dépôt. → { w, h, px(x, y) : [r, g, b, a] }
export function lirePng(chemin) {
  const b = readFileSync(new URL('../../' + chemin, import.meta.url));
  let i = 8, w = 0, h = 0, type = 0;
  const idat = [];
  while (i < b.length) {
    const n = b.readUInt32BE(i), nom = b.toString('ascii', i + 4, i + 8), d = b.subarray(i + 8, i + 8 + n);
    if (nom === 'IHDR') {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9];
      if (d[8] !== 8 || d[12] !== 0) throw new Error(`${chemin} : 8 bits par canal, sans entrelacement`);
    }
    if (nom === 'IDAT') idat.push(d);
    i += 12 + n;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!bpp) throw new Error(`${chemin} : une image RGBA ou RGB`);
  const brut = inflateSync(Buffer.concat(idat)), ligne = w * bpp, out = Buffer.alloc(h * ligne);
  for (let y = 0; y < h; y++) {
    const f = brut[y * (ligne + 1)], src = brut.subarray(y * (ligne + 1) + 1, (y + 1) * (ligne + 1));
    for (let x = 0; x < ligne; x++) {
      const a = x >= bpp ? out[y * ligne + x - bpp] : 0, up = y ? out[(y - 1) * ligne + x] : 0, c = x >= bpp && y ? out[(y - 1) * ligne + x - bpp] : 0;
      const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
      const pred = [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][f];
      out[y * ligne + x] = (src[x] + pred) & 255;
    }
  }
  return { w, h, px: (x, y) => { const k = y * ligne + x * bpp; return [out[k], out[k + 1], out[k + 2], bpp === 4 ? out[k + 3] : 255]; } };
}
