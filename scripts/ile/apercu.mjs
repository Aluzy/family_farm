// L'aperçu de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md) : une image PNG par graine, pour relire la
// génération. Trois vues côte à côte : le relief (la mer plus sombre au large, la terre du vert des bas au brun des
// hauts, les lacs, ombrée par une lumière en haut à gauche), l'humidité (du sable sec au bleu-vert humide) et les
// sols (une couleur par sol, ombrée comme le relief ; à partir de l'étape « biomes »). Le point
// d'apparition est marqué d'une croix rouge, la bande de mer protégée d'un liseré. L'image ne va pas dans le dépôt.
//
// Usage, depuis la racine du dépôt (après npm run build:data) :
//   node scripts/ile/apercu.mjs <graine> [<graine>…] [--etape forme|relief|humidite] [--dossier d] [--zoom 2]
// (une image <dossier>/ile-<graine>.png par graine ; le dossier par défaut : apercus-ile/, ignoré par git). Le PNG est
// écrit sans dépendance (zlib de Node).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { ETAPES, genererChantier, ILE, SOLS } from '../../js/engine/ile.js';

/* ---------- les arguments ---------- */

function lireArguments(argv) {
  const options = { graines: [], etape: ETAPES[ETAPES.length - 1], dossier: 'apercus-ile', zoom: 2 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--etape') options.etape = argv[++i];
    else if (a === '--dossier') options.dossier = argv[++i];
    else if (a === '--zoom') options.zoom = Number(argv[++i]);
    else options.graines.push(a);
  }
  if (!options.graines.length) {
    console.error('Usage : node scripts/ile/apercu.mjs <graine> [<graine>…] [--etape e] [--dossier d] [--zoom z]');
    process.exit(1);
  }
  return options;
}

/* ---------- le PNG ---------- */

const TABLE_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(octets) {
  let c = 0xffffffff;
  for (const o of octets) c = TABLE_CRC[(c ^ o) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function morceau(type, donnees) {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length);
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corps));
  return Buffer.concat([longueur, corps, crc]);
}

// Un PNG en couleurs (RVB) depuis des pixels rangés ligne par ligne.
function png(largeur, hauteur, rvb) {
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(largeur, 0);
  entete.writeUInt32BE(hauteur, 4);
  entete.set([8, 2, 0, 0, 0], 8);
  const lignes = Buffer.alloc(hauteur * (largeur * 3 + 1));
  for (let y = 0; y < hauteur; y++) {
    lignes[y * (largeur * 3 + 1)] = 0;
    rvb.copy(lignes, y * (largeur * 3 + 1) + 1, y * largeur * 3, (y + 1) * largeur * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', entete),
    morceau('IDAT', deflateSync(lignes)),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- les couleurs ---------- */

const melanger = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);

// Une rampe de couleurs : t dans [0, 1] → la couleur entre les deux paliers qui l'encadrent.
function rampe(paliers, t) {
  const u = Math.min(1, Math.max(0, t)) * (paliers.length - 1);
  const k = Math.min(paliers.length - 2, Math.floor(u));
  return melanger(paliers[k], paliers[k + 1], u - k);
}

const MER = [
  [92, 170, 196],
  [40, 104, 150],
  [18, 52, 96],
];
const TERRE = [
  [118, 168, 84],
  [92, 150, 70],
  [140, 150, 82],
  [150, 126, 88],
  [178, 162, 140],
];
const HUMIDE = [
  [214, 190, 130],
  [150, 170, 96],
  [56, 140, 120],
  [32, 96, 130],
];

// L'ombrage d'une case : la lumière vient d'en haut à gauche (plus clair face à elle).
function ombrage(ch, x, y) {
  const n = ch.n;
  const h = (vx, vy) => ch.hauteur?.[Math.min(n - 1, Math.max(0, vy)) * n + Math.min(n - 1, Math.max(0, vx))] ?? 0;
  const pente = h(x - 1, y - 1) - h(x + 1, y + 1);
  return Math.min(1.2, Math.max(0.8, 1 + pente * 6));
}

function couleurRelief(ch, x, y) {
  const i = y * ch.n + x;
  if (!ch.terre[i]) return rampe(MER, Math.min(1, -ch.cote[i] / 14));
  if (ch.lac?.[i]) return [70, 140, 190];
  if (!ch.hauteur) return [120, 160, 80];
  return rampe(TERRE, ch.hauteur[i]).map((v) => v * ombrage(ch, x, y));
}

function couleurHumidite(ch, x, y) {
  const i = y * ch.n + x;
  if (!ch.terre[i]) return rampe(MER, Math.min(1, -ch.cote[i] / 14)).map((v) => v * 0.6);
  if (!ch.humidite) return [180, 180, 180];
  return rampe(HUMIDE, ch.humidite[i]);
}

// Une couleur par sol (data/ile.json SOLS), proche de celle du jeu.
const COULEUR_DU_SOL = {
  eau_profonde: [28, 70, 120],
  sable: [226, 206, 150],
  galets: [168, 160, 150],
  herbe: [126, 178, 86],
  feuilles: [58, 112, 52],
  aiguilles: [36, 84, 62],
  mousse: [74, 134, 70],
  clairiere: [150, 186, 98],
  lande: [150, 120, 130],
  terre: [150, 122, 90],
  eau_basse: [96, 170, 200],
  eau: [54, 120, 180],
};

function couleurSol(ch, x, y) {
  const i = y * ch.n + x;
  if (!ch.sol) return [200, 200, 200];
  const nom = SOLS[ch.sol[i]].nom;
  if (nom === 'eau_profonde') return rampe(MER, Math.min(1, -ch.cote[i] / 14));
  const c = COULEUR_DU_SOL[nom] ?? [255, 0, 255];
  return ch.terre[i] && !ch.lac[i] ? c.map((v) => v * ombrage(ch, x, y)) : c;
}

/* ---------- l'image ---------- */

function apercu(ch, zoom) {
  const n = ch.n;
  const vues = [couleurRelief, couleurHumidite, couleurSol];
  const ecart = 8;
  const largeur = vues.length * n * zoom + (vues.length - 1) * ecart;
  const hauteur = n * zoom;
  const rvb = Buffer.alloc(largeur * hauteur * 3, 255);
  const poser = (px, py, c) => {
    const k = (py * largeur + px) * 3;
    rvb[k] = Math.round(Math.min(255, c[0]));
    rvb[k + 1] = Math.round(Math.min(255, c[1]));
    rvb[k + 2] = Math.round(Math.min(255, c[2]));
  };
  const { x: ax, y: ay } = ILE.APPARITION;
  vues.forEach((couleur, v) => {
    const ox = v * (n * zoom + ecart);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let c = couleur(ch, x, y);
        const surBande =
          x === ILE.BORD_MER || y === ILE.BORD_MER || x === n - 1 - ILE.BORD_MER || y === n - 1 - ILE.BORD_MER;
        if (surBande) c = melanger(c, [255, 255, 255], 0.35);
        const croix = (x === ax && Math.abs(y - ay) <= 3) || (y === ay && Math.abs(x - ax) <= 3);
        if (croix) c = [220, 30, 30];
        for (let zy = 0; zy < zoom; zy++) for (let zx = 0; zx < zoom; zx++) poser(ox + x * zoom + zx, y * zoom + zy, c);
      }
    }
  });
  return png(largeur, hauteur, rvb);
}

/* ---------- le bilan ---------- */

function bilan(ch, duree) {
  let terre = 0;
  for (const v of ch.terre) terre += v;
  return `${duree.toFixed(0)} ms, terre ${((100 * terre) / (ch.n * ch.n)).toFixed(0)} %`;
}

const options = lireArguments(process.argv.slice(2));
mkdirSync(options.dossier, { recursive: true });
for (const graine of options.graines) {
  const debut = performance.now();
  const ch = genererChantier(graine, options.etape);
  const duree = performance.now() - debut;
  const fichier = join(options.dossier, `ile-${graine}.png`);
  writeFileSync(fichier, apercu(ch, options.zoom));
  console.log(`${fichier} : ${bilan(ch, duree)}`);
}
