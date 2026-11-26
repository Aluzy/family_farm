// Les données de l'atelier des sprites (worker/src/sprites.html, console /admin/sprites) :
//   - les rampes du jeu : chaque « NOM = rampe([clés…], n) » des scripts de dessin (scripts/carte/*.py),
//     telles qu'écrites (les mêmes clés, le même nombre de tons), et les palettes de data/meubles.json
//     (PALETTES : les tissus et les bois qu'on repeint, leurs tons exacts) ;
//   - la liste des images de assets/ (sauf les galeries « apercu » des icônes), avec leur taille.
// Les scripts Python restent la source : rien n'est recopié à la main, l'atelier lit ce que ce fichier en tire.
//
// scripts/build-site.mjs l'écrit dans _site/atelier/donnees.json à chaque mise en ligne ; la console le relit
// par le Worker (GET /admin/api/atelier). Seul : « node scripts/atelier-donnees.mjs [sortie.json] » (un
// résumé, et le fichier si une sortie est donnée).

import { readdirSync, readFileSync, writeFileSync, mkdirSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const N_PAR_DEFAUT = 40; // def rampe(cles, n=40) dans scripts/carte/nuances.py

// « NOM = rampe([(r, g, b), …]) » ou « NOM = rampe([…], n) », n un nombre ou un nom (N, résolu dans le fichier)
const LIGNE_RAMPE = /^(\s*)([A-Za-z_]\w*)\s*=\s*rampe\((\[[^\]]*\])\s*(?:,\s*(\w+(?:\.\w+)?))?\s*\)\s*(?:#.*)?$/;

/** n nuances interpolées entre des clés : la même chose que rampe() de scripts/carte/nuances.py. */
export function rampe(cles, n = N_PAR_DEFAUT) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const f = (i / (n - 1)) * (cles.length - 1);
    const k = Math.min(Math.floor(f), cles.length - 2);
    const r = f - k;
    // round() de Python arrondit les demis au pair : pareil ici, pour des tons identiques au pixel près
    out.push([0, 1, 2].map((j) => arrondiPair(cles[k][j] * (1 - r) + cles[k + 1][j] * r)));
  }
  return out;
}

/** round() de Python 3 (au pair sur les demis), aux erreurs de flottant près comme lui. */
export function arrondiPair(x) {
  const f = Math.floor(x), d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

function libelle(nom) {
  const t = nom.replace(/^R_/, '').replace(/_R$/, '').toLowerCase().replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Les rampes nommées des scripts de dessin, sans doublon (mêmes clés et même n : la première garde son nom). */
export function rampesDesScripts(racine = RACINE) {
  const dossier = join(racine, 'scripts', 'carte');
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.py')).sort();
  const nDesModules = {};
  const textes = {};
  for (const f of fichiers) {
    textes[f] = readFileSync(join(dossier, f), 'utf8');
    const m = textes[f].match(/^N\s*=\s*(\d+)\b/m);
    if (m) nDesModules[f.slice(0, -3)] = Number(m[1]);
  }
  const vues = new Map();
  const rampes = [];
  for (const f of fichiers) {
    const module = f.slice(0, -3);
    const alias = {};
    for (const m of textes[f].matchAll(/^import\s+(\w+)\s+as\s+(\w+)/gm)) alias[m[2]] = m[1];
    let nModule = nDesModules[module];
    const nAlias = textes[f].match(/^N\s*=\s*(\w+)\.N\b/m);
    if (nModule === undefined && nAlias && alias[nAlias[1]]) nModule = nDesModules[alias[nAlias[1]]];
    textes[f].split('\n').forEach((ligne, i) => {
      const m = ligne.match(LIGNE_RAMPE);
      if (!m) return;
      let cles;
      try { cles = JSON.parse(m[3].replace(/\(/g, '[').replace(/\)/g, ']')); } catch { return; }
      if (!Array.isArray(cles) || cles.length < 2 || !cles.every((c) => Array.isArray(c) && c.length === 3 && c.every((v) => Number.isInteger(v) && v >= 0 && v <= 255))) return;
      let n = N_PAR_DEFAUT;
      if (m[4] !== undefined) {
        if (/^\d+$/.test(m[4])) n = Number(m[4]);
        else if (m[4] === 'N' && nModule !== undefined) n = nModule;
        else if (/^\w+\.N$/.test(m[4]) && nDesModules[alias[m[4].split('.')[0]]] !== undefined) n = nDesModules[alias[m[4].split('.')[0]]];
        else return; // un n qu'on ne sait pas lire : on n'invente pas
      }
      const empreinte = JSON.stringify([cles, n]);
      if (vues.has(empreinte)) { vues.get(empreinte).aussi.push(`${module}.${m[2]}`); return; }
      let id = `${module}.${m[2]}`;
      if (rampes.some((r) => r.id === id)) id += `@${i + 1}`;
      const r = { id, nom: libelle(m[2]), groupe: module, cles, n, aussi: [] };
      vues.set(empreinte, r);
      rampes.push(r);
    });
  }
  return rampes;
}

/** Les palettes de data/meubles.json (PALETTES) : leurs tons exacts (n = le nombre de clés). */
export function palettesDesMeubles(racine = RACINE) {
  const d = JSON.parse(readFileSync(join(racine, 'data', 'meubles.json'), 'utf8'));
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return Object.entries(d.PALETTES || {}).map(([nom, tons]) => ({
    id: `meubles.${nom}`, nom: libelle(nom), groupe: 'meubles.json', cles: tons.map(hex), n: tons.length, aussi: [], exacte: true,
  }));
}

/** La largeur et la hauteur d'un PNG (son en-tête IHDR), ou null. */
export function taillePng(fichier) {
  const fd = openSync(fichier, 'r');
  try {
    const b = Buffer.alloc(24);
    if (readSync(fd, b, 0, 24, 0) < 24 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('latin1', 12, 16) !== 'IHDR') return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } finally { closeSync(fd); }
}

/** Les images PNG de assets/ (chemins relatifs à assets/, « / »), hors galeries apercu/. */
export function assetsDuJeu(racine = RACINE) {
  const base = join(racine, 'assets');
  const out = [];
  for (const nom of readdirSync(base, { recursive: true })) {
    const chemin = String(nom).split(sep).join('/');
    if (!chemin.endsWith('.png') || chemin.split('/').includes('apercu')) continue;
    const t = taillePng(join(base, nom));
    if (t) out.push({ chemin, l: t[0], h: t[1] });
  }
  return out.sort((a, b) => a.chemin.localeCompare(b.chemin, 'fr'));
}

export function donneesAtelier(racine = RACINE) {
  return { version: 1, rampes: [...rampesDesScripts(racine), ...palettesDesMeubles(racine)], assets: assetsDuJeu(racine) };
}

if (process.argv[1] && basename(process.argv[1]) === 'atelier-donnees.mjs') {
  const d = donneesAtelier();
  const groupes = [...new Set(d.rampes.map((r) => r.groupe))];
  console.log(`${d.rampes.length} rampes (${groupes.join(', ')}), ${d.assets.length} images de assets/.`);
  const sortie = process.argv[2];
  if (sortie) { mkdirSync(dirname(sortie), { recursive: true }); writeFileSync(sortie, JSON.stringify(d)); console.log(`→ ${sortie}`); }
}
