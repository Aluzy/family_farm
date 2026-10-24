#!/usr/bin/env node
// L'aperçu du plan du grand monde (js/engine/monde-gen.js, docs/grand-monde.md, étape 4) : une
// image PNG, une couleur par biome (ombrée d'après le relief), les rivières et les lacs, les
// chemins, les lieux (hameaux en rouge, entrées de grotte en noir, coins de pêche en blanc
// cerclé de bleu) et le rectangle de la ferme. Pour relire un plan ; l'image ne va pas dans le
// dépôt.
//
// Usage, depuis la racine du dépôt (après npm run build:data) :
//   node scripts/monde/apercu.mjs <graine> [fichier.png] [--zoom 1|2]
// (sans fichier : apercu_monde.png à la racine, que les conventions des fiches font supprimer
// avant un commit). Le PNG est écrit sans dépendance (zlib de Node).

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { genererMonde } from '../../js/engine/monde.js';

const args = process.argv.slice(2);
let zoom = 2;
const libres = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--zoom') zoom = Math.max(1, Math.min(4, Number(args[++i]) || 1));
  else libres.push(args[i]);
}
const [graine, fichier = 'apercu_monde.png'] = libres;
if (graine === undefined) {
  console.error('Usage : node scripts/monde/apercu.mjs <graine> [fichier.png] [--zoom 1|2]');
  process.exit(1);
}

// (la ferme d'abord : le temps du plan seul)
let debut = performance.now();
const monde = genererMonde(graine);
const dureeFerme = performance.now() - debut;
debut = performance.now();
const plan = monde.plan;
const duree = performance.now() - debut;
const { LARGEUR: W, HAUTEUR: H, BIOMES } = plan;

// les couleurs des biomes (l'aperçu seulement : les tuiles du jeu viendront à l'étape 5)
const COULEURS = {
  mer: [38, 92, 158], plage: [232, 214, 158], falaise: [128, 110, 96], prairie: [128, 190, 88],
  foret: [42, 108, 56], marais: [96, 120, 86], lande: [176, 150, 112], montagne: [130, 124, 118],
  sommet: [240, 244, 250], lac: [64, 136, 204], riviere: [70, 150, 220],
};
const couleur = BIOMES.map((b) => COULEURS[b] || [255, 0, 255]);

const L = W * zoom, Hp = H * zoom, px = new Uint8Array(L * Hp * 3);
const pose = (x, y, [r, g, b]) => {
  if (x < 0 || y < 0 || x >= L || y >= Hp) return;
  const k = (y * L + x) * 3;
  px[k] = r; px[k + 1] = g; px[k + 2] = b;
};
const tuile = (c, r, rgb) => { for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) pose(c * zoom + dx, r * zoom + dy, rgb); };

// le sol : la couleur du biome, ombrée par la pente du relief (la lumière vient du nord-ouest) ;
// la mer, plus foncée au large
for (let r = 0; r < H; r++) {
  for (let c = 0; c < W; c++) {
    const i = r * W + c, b = BIOMES[plan.biome[i]], e = plan.relief[i];
    const amont = plan.relief[Math.max(0, r - 1) * W + Math.max(0, c - 1)];
    let f = 1 + (e - amont) / 255 * 6;
    if (b === 'mer') f = 0.55 + (e / 255) * 2.2;
    f = Math.max(0.6, Math.min(1.3, f));
    tuile(c, r, couleur[plan.biome[i]].map((v) => Math.max(0, Math.min(255, Math.round(v * f)))));
  }
}
// les chemins
for (const ch of plan.chemins) for (const i of ch) tuile(i % W, Math.floor(i / W), [110, 64, 28]);
// la ferme : son rectangle
const F = plan.FERME;
for (let c = F.X; c < F.X + F.LARGEUR; c++) { tuile(c, F.Y, [255, 240, 80]); tuile(c, F.Y + F.HAUTEUR - 1, [255, 240, 80]); }
for (let r = F.Y; r < F.Y + F.HAUTEUR; r++) { tuile(F.X, r, [255, 240, 80]); tuile(F.X + F.LARGEUR - 1, r, [255, 240, 80]); }
// les lieux : un carré (hameau), un triangle (grotte), un rond (pêche)
const autour = (i, rayon, f) => {
  const c = i % W, r = Math.floor(i / W);
  for (let dy = -rayon * zoom; dy <= rayon * zoom; dy++) for (let dx = -rayon * zoom; dx <= rayon * zoom; dx++) {
    const rgb = f(dx / zoom, dy / zoom);
    if (rgb) pose(c * zoom + dx, r * zoom + dy, rgb);
  }
};
for (const h of plan.lieux.hameaux) autour(h.case, 4, (x, y) => (Math.max(Math.abs(x), Math.abs(y)) > 3 ? [60, 0, 0] : [220, 40, 40]));
for (const g of plan.lieux.grottes) autour(g.case, 4, (x, y) => (y >= -3 && Math.abs(x) <= (y + 3) / 2 ? [20, 20, 20] : null));
for (const p of plan.lieux.peche) autour(p.case, 3, (x, y) => { const d = Math.hypot(x, y); return d <= 1.6 ? [255, 255, 255] : d <= 3 ? [20, 60, 160] : null; });

// le PNG : RGB 8 bits, sans filtre
const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const morceau = (type, data) => {
  const t = Buffer.from(type, 'ascii'), out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); t.copy(out, 4); Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([t, Buffer.from(data)])), 8 + data.length);
  return out;
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(L, 0); ihdr.writeUInt32BE(Hp, 4); ihdr[8] = 8; ihdr[9] = 2;
const brut = Buffer.alloc((L * 3 + 1) * Hp);
for (let y = 0; y < Hp; y++) Buffer.from(px.buffer, y * L * 3, L * 3).copy(brut, y * (L * 3 + 1) + 1);
writeFileSync(fichier, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), morceau('IHDR', ihdr), morceau('IDAT', deflateSync(brut)), morceau('IEND', Buffer.alloc(0))]));

const n = new Array(BIOMES.length).fill(0);
for (const b of plan.biome) n[b]++;
console.log(`${fichier} : le plan de la graine « ${graine} » (${W} × ${H} tuiles ; la ferme en ${dureeFerme.toFixed(0)} ms, puis le plan en ${duree.toFixed(0)} ms)`);
console.log('  biomes : ' + BIOMES.map((b, i) => `${b} ${(100 * n[i] / plan.biome.length).toFixed(1)} %`).join(', '));
console.log(`  ${plan.rivieres.length} rivières (${plan.rivieres.map((r, i) => `${r.length} → ${plan.finRivieres[i]}`).join(', ')}), ${plan.lacs.length} lacs, ${plan.chemins.length} chemins (${plan.chemins.reduce((s, c) => s + c.length, 0)} cases)`);
console.log(`  ${plan.lieux.hameaux.length} hameaux (${plan.lieux.hameaux.map((h) => h.nom).join(', ')}), ${plan.lieux.grottes.length} entrées de grotte, ${plan.lieux.peche.length} coins de pêche`);
