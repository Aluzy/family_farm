/* ==========================================================================
   L'herbe haute de l'île (docs/ile-300.md) : les touffes que la faux fauche (de la fibre, la paille de la botteleuse),
   comme sur la ferme générée d'avant (js/engine/ferme-generee.js, étape 10). Elles n'existent que dans la carte : le
   moteur n'en connaît que l'identifiant « x,y » (leur pied, en px), state.outils.herbes garde les fauchées
   (js/engine/outils.js). Tirées de la graine de l'île, case par case : des zones groupées sur l'herbe (la prairie, la
   clairière, la lande), denses au cœur, clairsemées au bord ; deux places par case en quinconce ; chaque zone sa
   teinte, quelques touffes fleuries. Réglages : ILE.HERBES.
   ========================================================================== */

import { DATA } from '../catalog.js';
import { fbm, hacher } from './hasard.js';
import { ILE, SOLS } from './reglages.js';

const T = 16;
const SUR_HERBE = new Set(['herbe', 'clairiere', 'lande']);
const cache = new WeakMap();

// Un nombre de 0 à 1, toujours le même pour (a, b, c) : le hasard d'une place.
function au(a, b, c) {
  let h =
    Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^
    Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^
    Math.imul(c + 0x27d4eb2f, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/**
 * Les touffes d'herbe haute de l'île : [[x, y, variante]…] (pieds en px), triées par rangée. Chaque case décide seule,
 * d'après la graine et son sol (un champ de bruit fait les zones : denses au cœur, clairsemées au bord) : une case
 * dont le sol change ne déplace pas les touffes des autres. Une touffe sous un objet qui bloque (un arbre, une roche)
 * ne se voit pas tant qu'il est là (touffesVisibles).
 * @param {object} ile
 * @param {string} graine
 */
export function touffesDeLIle(ile, graine) {
  const deja = cache.get(ile);
  if (deja && deja.version === ile.solVersion) return deja.touffes;
  const G = DATA.ILE.HERBES,
    n = ile.n,
    g = hacher(String(graine) + ':herbe_haute'),
    gt = hacher(String(graine) + ':herbe_teinte');
  const A = ILE.APPARITION;
  const herbe = Uint8Array.from(SOLS, (s) => (SUR_HERBE.has(s.nom) ? 1 : 0));
  const touffes = [];
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      if (!herbe[ile.sol[y * n + x]]) continue;
      // (pas autour du point d'apparition : la tente s'y pose avant que le joueur ait une faux)
      if (Math.hypot(x - A.x, y - A.y) < G.DEPART) continue;
      // (le champ des zones : au-dessus du SEUIL, de l'herbe haute ; dense au cœur, clairsemée au bord)
      const z = fbm(x / G.ECHELLE, y / G.ECHELLE, g, 3);
      if (z < G.SEUIL) continue;
      const coeur = Math.min(1, (z - G.SEUIL) / G.COEUR);
      const p = G.DENSITE[1] + (G.DENSITE[0] - G.DENSITE[1]) * coeur;
      // (la teinte de la zone : un bruit plus large ; parfois une autre, et fleurie)
      const tz = fbm(x / (G.ECHELLE * 2), y / (G.ECHELLE * 2), gt, 2);
      const zone = tz < 0.42 ? 0 : tz < 0.52 ? 1 : tz < 0.6 ? 2 : 3;
      for (let j = 0; j < 2; j++) {
        const a = au(g, y * n + x, j);
        if (a >= p) continue;
        const b = au(gt, y * n + x, j + 2),
          c = au(g, y * n + x, j + 4),
          d = au(gt, y * n + x, j + 6);
        const teinte = b < G.ZONE ? zone : Math.floor(c * 4);
        const v = Math.floor(d * 3) + 3 * (2 * teinte + (au(g, y * n + x, j + 8) < G.FLEURS ? 1 : 0));
        touffes.push([
          x * T + ((2 * y + j) % 2 ? 12 : 4) + Math.round((c - 0.5) * 6),
          y * T + 6 + 8 * j + Math.round((d - 0.5) * 2),
          v,
        ]);
      }
    }
  }
  touffes.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  cache.set(ile, { version: ile.solVersion, touffes });
  return touffes;
}

/**
 * Les touffes qui se voient : pas sous un objet qui bloque (un arbre, une roche), ni sous ce qui est posé dessus.
 * @param {object} ile
 * @param {number[][]} touffes
 */
export function touffesVisibles(ile, touffes) {
  const n = ile.n;
  return touffes.filter(([x, y]) => {
    const i = Math.floor(y / T) * n + Math.floor(x / T);
    return !ile.bloque[i] && !ile.bloque[i + n];
  });
}

/**
 * Les touffes de chaque case : { case: [« x,y »…] } (une case où l'herbe pousse ne se bâtit qu'une fois fauchée).
 * @param {number[][]} touffes
 * @param {number} n le côté de l'île
 */
export function herbesParCase(touffes, n) {
  const H = {};
  for (const [x, y] of touffes) {
    const l = (H[Math.floor(y / T) * n + Math.floor(x / T)] ||= []),
      id = `${x},${y}`;
    if (!l.includes(id)) l.push(id);
  }
  return H;
}
