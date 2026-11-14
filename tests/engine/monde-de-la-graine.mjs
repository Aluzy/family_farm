// I9a : l'empreinte du monde qu'une partie tire de sa graine, comme la page le dessine (la carte et le terrain :
// genererMonde ; les éléments, les chemins posés et les régions : le Worker du sol, js/monde-worker.js, par
// contexteSol et solDeRegion). Deux parties qui ont la même empreinte voient la même île.
//
// Lancé seul (node tests/engine/monde-de-la-graine.mjs <partie.json>), il lit la partie (une sauvegarde
// { v, t, s } ou la partie seule) et écrit son empreinte : un autre processus, qui n'a rien en mémoire, refait
// l'île de la graine (tests/test-monde.mjs, « le monde créé chez l'invité est identique à celui de l'hôte »).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as E from '../../js/engine/index.js';
import { contexteSol, elementsSol, poserCheminsSol, solDeRegion } from '../../js/engine/monde-sol.js';

// (les tableaux typés, en listes : JSON.stringify les écrirait en objets)
const remplacer = (k, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v instanceof Set ? [...v].sort() : v instanceof Map ? [...v.entries()] : v);

function hacher(texte, h = [0x811c9dc5, 0x9e3779b9]) {
  let [a, b] = h;
  for (let i = 0; i < texte.length; i++) {
    const c = texte.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 15);
  }
  return [a >>> 0, b >>> 0];
}

// L'empreinte de l'île de la partie `s` : { carte, terrain, elements, regions } (une chaîne hexadécimale chacun) et
// les régions regardées (celles de la ferme, de sa sortie, du port).
export function empreinteDuMonde(s) {
  const T = E.farmTerrain(s), M = T.MONDE, W = T.LARGEUR;
  const hex = (h) => h.map((x) => x.toString(16).padStart(8, '0')).join('');
  const carte = hex(hacher(JSON.stringify(E.farmMap(s))));
  const terrain = hex(hacher(JSON.stringify({ L: T.LARGEUR, H: T.HAUTEUR, F: T.FERME, LIGNES: T.LIGNES, ARBRES: T.ARBRES, ROCHERS: T.ROCHERS, cadre: M && M.cadre }, remplacer)));
  if (!M) return { carte, terrain, elements: null, regions: null, vues: [] };
  const ctx = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
  poserCheminsSol(ctx, E.cheminsPourLeSol(s));
  const el = elementsSol(ctx);
  const elements = hex(hacher(JSON.stringify({ el, chemins: ctx.chemins }, remplacer)));
  const N = M.taille, F = T.FERME, cle = (t) => `${Math.floor((t % W) / N)},${Math.floor(Math.floor(t / W) / N)}`;
  const vues = new Set([cle(F.Y * W + F.X), cle(M.cadre.SORTIE)]);
  if (el.lieux && el.lieux.port && Number.isInteger(el.lieux.port.case)) vues.add(cle(el.lieux.port.case));
  let h;
  for (const k of [...vues].sort()) {
    const [rx, ry] = k.split(',').map(Number);
    const r = solDeRegion(ctx, rx, ry);
    h = hacher(JSON.stringify({ k, veg: r.vegetation, roches: r.roches, lieux: r.lieux, marche: r.marche, biome: r.biome, faune: r.faune }, remplacer), h);
  }
  return { carte, terrain, elements, regions: hex(h), vues: [...vues].sort() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const lu = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(JSON.stringify(empreinteDuMonde(lu && lu.s ? lu.s : lu)));
}
