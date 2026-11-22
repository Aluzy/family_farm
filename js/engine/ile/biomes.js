/* ==========================================================================
   Les biomes et les sols (biomes), les plages (plages) et la prairie plate du départ (pointApparition)
   (docs/ile-300.md, étape 4).
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).
   ========================================================================== */

import { limiterLaPente, seuilDeLaPart } from './grille.js';
import { bruit2D, hacher } from './hasard.js';
import { BIOME, REGLAGES, SOL } from './reglages.js';

// Les cases de terre (hors lacs) d'un biome.
function casesDuBiome(ch, biome) {
  const cases = [];
  for (let i = 0; i < ch.n * ch.n; i++) if (ch.biome[i] === biome) cases.push(i);
  return cases;
}

// Une tache de bruit : vraie là où le bruit (echelle) passe le seuil.
function tache(ch, i, reglage, etape) {
  const x = i % ch.n;
  const y = (i - x) / ch.n;
  return bruit2D(x / reglage.echelle, y / reglage.echelle, hacher(`${ch.graine}/${etape}`)) > reglage.seuil;
}

// Les sols de la forêt : les aiguilles en haut, la mousse dans les plus humides, les clairières en taches, les
// feuilles ailleurs.
function solsDeLaForet(ch, S) {
  const foret = casesDuBiome(ch, BIOME.foret);
  const hautes = seuilDeLaPart(
    foret.map((i) => ch.hauteur[i]),
    1 - S.aiguilles,
  );
  const humides = seuilDeLaPart(
    foret.map((i) => ch.humidite[i]),
    1 - S.mousse,
  );
  for (const i of foret) {
    if (tache(ch, i, S.clairiere, 'clairieres')) ch.sol[i] = SOL.clairiere;
    else if (ch.hauteur[i] >= hautes) ch.sol[i] = SOL.aiguilles;
    else if (ch.humidite[i] >= humides) ch.sol[i] = SOL.mousse;
    else ch.sol[i] = SOL.feuilles;
  }
}

/**
 * Les biomes et les sols : la mer, les lacs, puis la terre partagée entre la lande (le plus sec), la forêt (le plus
 * humide) et la prairie, dans les parts de REPARTITION ; puis les sols de chaque biome.
 * @param {Chantier} ch
 */
export function biomes(ch) {
  const R = REGLAGES.REPARTITION;
  const n = ch.n;
  const g = hacher(`${ch.graine}/biomes`);
  ch.biome = new Uint8Array(n * n).fill(BIOME.mer);
  ch.sol = new Uint8Array(n * n).fill(SOL.eau_profonde);
  const terre = [];
  const notes = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    if (!ch.terre[i]) continue;
    if (ch.lac[i]) {
      ch.biome[i] = BIOME.lac;
      continue;
    }
    const x = i % n;
    const y = (i - x) / n;
    const bruit = (bruit2D(x / R.BRUIT.echelle, y / R.BRUIT.echelle, g) - 0.5) * 2 * R.BRUIT.force;
    notes[i] = ch.humidite[i] - R.HAUTEUR * ch.hauteur[i] + bruit;
    terre.push(i);
  }
  const sec = seuilDeLaPart(
    terre.map((i) => notes[i]),
    R.lande,
  );
  const humide = seuilDeLaPart(
    terre.map((i) => notes[i]),
    1 - R.foret,
  );
  for (const i of terre) {
    if (notes[i] < sec) ch.biome[i] = BIOME.lande;
    else if (notes[i] >= humide) ch.biome[i] = BIOME.foret;
    else ch.biome[i] = BIOME.prairie;
  }
  // les sols
  for (let i = 0; i < n * n; i++) {
    if (ch.biome[i] === BIOME.prairie) ch.sol[i] = SOL.herbe;
    else if (ch.biome[i] === BIOME.lande) ch.sol[i] = tache(ch, i, R.SOLS.terre, 'terre') ? SOL.terre : SOL.lande;
    else if (ch.biome[i] === BIOME.lac) ch.sol[i] = auBordDuLac(ch, i) ? SOL.eau_basse : SOL.eau;
  }
  solsDeLaForet(ch, R.SOLS);
}

// Une case de lac qui touche la terre (ses huit voisines) : l'eau basse du bord.
function auBordDuLac(ch, i) {
  const n = ch.n;
  for (const d of [-n - 1, -n, -n + 1, -1, 1, n - 1, n, n + 1]) if (!ch.lac[i + d]) return true;
  return false;
}

/**
 * Les plages : la terre basse du rivage, d'une largeur qui varie le long de la côte (par endroits, aucune) ; du sable,
 * et des galets en taches.
 * @param {Chantier} ch
 */
export function plages(ch) {
  const P = REGLAGES.PLAGES;
  const n = ch.n;
  const g = hacher(`${ch.graine}/plages`);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (!ch.terre[i] || ch.lac[i] || ch.hauteur[i] > P.HAUTEUR_MAX) continue;
      const largeur = P.LARGEUR[0] + (P.LARGEUR[1] - P.LARGEUR[0]) * bruit2D(x / P.echelle, y / P.echelle, g);
      if (ch.cote[i] > largeur) continue;
      ch.biome[i] = BIOME.plage;
      ch.sol[i] = tache(ch, i, REGLAGES.REPARTITION.SOLS.galets, 'galets') ? SOL.galets : SOL.sable;
    }
  }
}

/**
 * Le point d'apparition : une prairie plate dans un rayon autour du centre, où le joueur apparaît en début de partie ;
 * au-delà, sur « fondu » cases, le relief retrouve le sien (puis le limiteur de pente le garde doux).
 * @param {Chantier} ch
 */
export function pointApparition(ch) {
  const A = REGLAGES.APPARITION;
  const n = ch.n;
  const loin = A.rayon + A.fondu;
  let somme = 0;
  let compte = 0;
  for (let y = A.y - A.rayon; y <= A.y + A.rayon; y++) {
    for (let x = A.x - A.rayon; x <= A.x + A.rayon; x++) {
      if (Math.hypot(x - A.x, y - A.y) > A.rayon) continue;
      somme += ch.hauteur[y * n + x];
      compte++;
    }
  }
  const plat = somme / compte;
  for (let y = A.y - loin; y <= A.y + loin; y++) {
    for (let x = A.x - loin; x <= A.x + loin; x++) {
      const i = y * n + x;
      const d = Math.hypot(x - A.x, y - A.y);
      if (d > loin) continue;
      const t = Math.min(1, Math.max(0, (d - A.rayon) / A.fondu));
      const garde = t * t * (3 - 2 * t);
      ch.hauteur[i] = plat * (1 - garde) + ch.hauteur[i] * garde;
      if (d <= A.rayon) {
        ch.biome[i] = BIOME.prairie;
        ch.sol[i] = SOL.herbe;
      }
    }
  }
  // la prairie autour du départ, au bord irrégulier : la lande et la forêt y deviennent de l'herbe
  const g = hacher(`${ch.graine}/apparition`);
  for (let y = A.y - 2 * A.prairie; y <= A.y + 2 * A.prairie; y++) {
    for (let x = A.x - 2 * A.prairie; x <= A.x + 2 * A.prairie; x++) {
      const i = y * n + x;
      const bord = A.prairie * (0.6 + 0.8 * bruit2D(x / 9, y / 9, g));
      const enPrairie = ch.biome[i] === BIOME.lande || ch.biome[i] === BIOME.foret;
      if (enPrairie && Math.hypot(x - A.x, y - A.y) <= bord) {
        ch.biome[i] = BIOME.prairie;
        ch.sol[i] = SOL.herbe;
      }
    }
  }
  limiterLaPente(ch.hauteur, n, REGLAGES.RELIEF.PENTE_MAX * 0.95);
  ch.apparition = { x: A.x, y: A.y, rayon: A.rayon };
}
