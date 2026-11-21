/* ==========================================================================
   L'île en jeu (docs/ile-300.md, étape 6) : l'île née d'un chantier, sa lecture, ses modifications par le
   joueur (le sol, la hauteur, les plantes et les roches, la récolte), et ses nuits (la pousse, la repousse).
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).

   Les règles des modifications : la mer du large (la bande de BORD_MER cases) ne se touche pas ; la terre
   reste d'un seul tenant (on ne coupe pas l'île en deux, on ne pose pas de terre au milieu de l'eau) ; le
   joueur ne crée pas de falaise (entre deux cases de terre voisines, l'écart de hauteur reste doux). Une
   modification refusée renvoie { ok: false, raison } et ne change rien.

   Les performances : les lectures n'allouent rien ; une modification ne touche que ses cases (le contrôle
   « d'un seul tenant » ne parcourt l'île qu'au besoin) ; la nuit ne parcourt que les plantes qui poussent et
   celles qui doivent repousser, jamais les 90 000 cases. Chaque changement marque sa région : la scène ne
   repeint qu'elle (regionsModifiees), la sauvegarde n'écrit qu'elle (sauvegarde.js).
   ========================================================================== */

import { catalogue } from './catalogue.js';
import { voisinesDe } from './grille.js';
import { entre, prng } from './hasard.js';
import { ILE, REGLAGES, SOL_EAU, SOLS } from './reglages.js';

/**
 * L'île en jeu.
 * @typedef {object} Ile
 * @property {string} graine
 * @property {number} n                     le côté (cases)
 * @property {{ x: number, y: number, rayon: number }} apparition   le point d'apparition et sa prairie plate
 * @property {Uint8Array} sol               le numéro du sol de chaque case (SOLS ; le biome s'en déduit : SOL_BIOME)
 * @property {Uint8Array} hauteur           la hauteur de chaque case, de 0 (le rivage) à VIE.HAUTEUR (le plus haut)
 * @property {Uint16Array} objet            le numéro (catalogue) de ce qui a son pied sur la case, 0 : rien
 * @property {Uint8Array} etat              le stade de ce pied (0 : le premier)
 * @property {Uint8Array} bloque            1 : une case prise par l'empreinte d'un bloc (déduit des objets)
 * @property {Set<number>} croissance       les cases dont la plante n'a pas fini de pousser
 * @property {{ i: number, numero: number, jour: number }[]} repousse   les plantes à remettre, et quel jour
 * @property {Set<number>} modifiees        les régions changées depuis que la scène les a lues
 * @property {Set<number>} aSauver          les régions changées depuis la dernière sauvegarde
 */

const V = REGLAGES.VIE;
const N = ILE.TAILLE;
const PAR_COTE = Math.ceil(N / ILE.REGION);
const PENTE = Math.floor(REGLAGES.RELIEF.PENTE_MAX * V.HAUTEUR);

/* ---------- l'île née d'un chantier ---------- */

// Les cases prises par les empreintes des blocs, et les plantes qui n'ont pas fini de pousser.
export function deduireDesObjets(ile, cat = catalogue()) {
  ile.bloque = new Uint8Array(ile.n * ile.n);
  ile.croissance = new Set();
  for (let i = 0; i < ile.n * ile.n; i++) {
    const o = ile.objet[i];
    if (!o) continue;
    const f = cat.fiches[o - 1];
    if (f.bloque) for (const j of empreinte(f, i, ile.n)) ile.bloque[j] = 1;
    if (ile.etat[i] < f.stades - 1) ile.croissance.add(i);
  }
}

/**
 * L'île en jeu, faite d'un chantier mené jusqu'au bout (genererChantier) : la hauteur gardée en entier, ce qu'on
 * déduit des objets, ni région à repeindre ni à sauver.
 * @param {object} ch   le chantier
 * @returns {Ile}
 */
export function ileDuChantier(ch) {
  const n = ch.n;
  const hauteur = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) hauteur[i] = Math.round(ch.hauteur[i] * V.HAUTEUR);
  const ile = {
    graine: ch.graine,
    n,
    apparition: { ...ch.apparition },
    sol: ch.sol,
    hauteur,
    objet: ch.objet,
    etat: ch.etat,
    repousse: [],
    modifiees: new Set(),
    aSauver: new Set(),
  };
  deduireDesObjets(ile);
  return ile;
}

/* ---------- la lecture ---------- */

/** La case (x, y) : son indice dans les tableaux de l'île. */
export const indice = (x, y) => y * N + x;

/** La région (pour la scène, la sauvegarde) d'une case. */
export function regionDe(i) {
  const x = i % N;
  return Math.floor((i - x) / N / ILE.REGION) * PAR_COTE + Math.floor(x / ILE.REGION);
}

/** Le nombre de régions de l'île. */
export const REGIONS = PAR_COTE * PAR_COTE;

/** La case est-elle dans la mer du large (la bande de BORD_MER cases), qui ne se touche pas ? */
export function auLarge(i) {
  const x = i % N;
  const y = (i - x) / N;
  const b = ILE.BORD_MER;
  return x < b || y < b || x >= N - b || y >= N - b;
}

/** La case est-elle de l'eau (la mer, un lac) ? */
export const estEau = (ile, i) => SOL_EAU[ile.sol[i]] === 1;

/** La fiche du catalogue de ce qui a son pied sur la case, ou null. */
export function ficheA(ile, i, cat = catalogue()) {
  const o = ile.objet[i];
  return o ? cat.fiches[o - 1] : null;
}

/** Peut-on marcher sur la case ? (pas l'eau, pas l'empreinte d'un bloc) */
export const marchable = (ile, i) => !estEau(ile, i) && !ile.bloque[i];

/** Peut-on labourer ou bâtir sur la case ? (la terre, libre, hors de la mer du large) */
export const labourable = (ile, i) => !estEau(ile, i) && !ile.objet[i] && !ile.bloque[i] && !auLarge(i);

/* ---------- les modifications ---------- */

const refus = (raison) => ({ ok: false, raison });
const OK = Object.freeze({ ok: true });

// Les cases de l'empreinte d'un pied de f en i (lui seul s'il ne bloque pas).
function empreinte(f, i, n = N) {
  if (!f.bloque) return [i];
  const x = i % n;
  const y = (i - x) / n;
  return f.empreinte.map(([dx, dy]) => (y + dy) * n + x + dx);
}

// Marque la région d'une case : à repeindre, à sauver.
function marquer(ile, i) {
  const r = regionDe(i);
  ile.modifiees.add(r);
  ile.aSauver.add(r);
}

// Si la case i devenait de l'eau, la terre resterait-elle d'un seul tenant ? Ses voisines de terre doivent rester
// reliées entre elles par la terre : on part de l'une et on cherche les autres (le plus souvent tout près).
function laTerreResteUnie(ile, i) {
  const n = ile.n;
  const terre = (j) => j >= 0 && j !== i && !estEau(ile, j);
  const voisines = voisinesDe(i, n).filter(terre);
  if (voisines.length <= 1) return true;
  const cherchees = new Set(voisines.slice(1));
  const vues = new Uint8Array(n * n);
  const file = [voisines[0]];
  vues[voisines[0]] = 1;
  vues[i] = 1;
  for (let k = 0; k < file.length && cherchees.size; k++) {
    for (const j of voisinesDe(file[k], n)) {
      if (!terre(j) || vues[j]) continue;
      vues[j] = 1;
      cherchees.delete(j);
      file.push(j);
    }
  }
  return cherchees.size === 0;
}

/**
 * Change le sol d'une case (labourer, creuser un canal, combler l'eau, semer de l'herbe…). La mer du large ne se
 * touche pas ; une case occupée ne change pas de sol (sauf l'eau qu'on comble : ses plantes d'eau s'en vont) ; de
 * l'eau qu'on comble devient de la terre à la hauteur de sa rive la plus basse, et doit toucher la terre ; une case
 * de terre qui devient de l'eau ne doit pas couper l'île en deux.
 * @param {Ile} ile
 * @param {number} i
 * @param {number} sol   un numéro de SOLS
 * @returns {{ ok: boolean, raison?: string }}
 */
export function changerSol(ile, i, sol) {
  if (!SOLS[sol]) return refus('ce sol n’existe pas');
  if (auLarge(i)) return refus('la mer du large ne se touche pas');
  const deEau = estEau(ile, i);
  const versEau = SOL_EAU[sol] === 1;
  if (!deEau && (ile.objet[i] || ile.bloque[i])) return refus('la case est occupée');
  if (deEau && !versEau) {
    const rives = voisinesDe(i, ile.n).filter((j) => j >= 0 && !estEau(ile, j));
    if (!rives.length) return refus('la terre doit toucher la terre');
    if (ile.objet[i]) retirerObjet(ile, i);
    ile.hauteur[i] = Math.min(...rives.map((j) => ile.hauteur[j]));
  }
  if (!deEau && versEau && !laTerreResteUnie(ile, i)) return refus('l’île serait coupée en deux');
  ile.sol[i] = sol;
  marquer(ile, i);
  return OK;
}

/**
 * Monte (sens 1) ou descend (sens -1) une case de terre d'une marche (VIE.MARCHE). Le joueur ne crée pas de falaise :
 * l'écart avec chaque voisine de terre reste au plus RELIEF.PENTE_MAX × VIE.HAUTEUR.
 * @param {Ile} ile
 * @param {number} i
 * @param {1 | -1} sens
 * @returns {{ ok: boolean, raison?: string }}
 */
export function changerHauteur(ile, i, sens) {
  if (auLarge(i)) return refus('la mer du large ne se touche pas');
  if (estEau(ile, i)) return refus('on ne creuse pas l’eau : il faut d’abord la combler');
  if (ile.objet[i] || ile.bloque[i]) return refus('la case est occupée');
  const h = Math.min(255, Math.max(0, ile.hauteur[i] + sens * V.MARCHE));
  if (h === ile.hauteur[i]) return refus(sens > 0 ? 'on ne monte pas plus haut' : 'on ne descend pas plus bas');
  for (const j of voisinesDe(i, ile.n)) {
    if (j >= 0 && !estEau(ile, j) && Math.abs(h - ile.hauteur[j]) > PENTE) {
      return refus('trop raide : adoucis d’abord autour');
    }
  }
  ile.hauteur[i] = h;
  marquer(ile, i);
  return OK;
}

/**
 * Pose un pied d'une espèce (ou une roche) : planter, replanter, repiquer. La case et toute l'empreinte sont libres,
 * hors de la mer du large, sur la terre (ou dans une eau où l'espèce pousse : un nénuphar).
 * @param {Ile} ile
 * @param {number} i
 * @param {number} numero   un numéro du catalogue
 * @param {number} [stade]  0 par défaut (une jeune pousse)
 * @returns {{ ok: boolean, raison?: string }}
 */
export function poserObjet(ile, i, numero, stade = 0, cat = catalogue()) {
  const f = cat.fiches[numero - 1];
  if (!f) return refus('cette espèce n’existe pas');
  if (stade < 0 || stade >= f.stades) return refus('ce stade n’existe pas');
  const cases = empreinte(f, i, ile.n);
  const solsDeLEspece = new Set(f.ou.map((p) => p.sol));
  for (const j of cases) {
    if (j < 0 || j >= ile.n * ile.n || Math.abs((j % ile.n) - (i % ile.n)) > 2) return refus('hors de l’île');
    if (auLarge(j)) return refus('la mer du large ne se touche pas');
    if (ile.objet[j] || ile.bloque[j]) return refus('la place est prise');
    if (estEau(ile, j) && !solsDeLEspece.has(SOLS[ile.sol[j]].nom)) return refus('elle ne pousse pas dans l’eau');
  }
  ile.objet[i] = numero;
  ile.etat[i] = stade;
  if (f.bloque) for (const j of cases) ile.bloque[j] = 1;
  if (stade < f.stades - 1) ile.croissance.add(i);
  ile.repousse = ile.repousse.filter((r) => r.i !== i);
  for (const j of cases) marquer(ile, j);
  return OK;
}

/**
 * Retire ce qui a son pied sur la case (et libère son empreinte). Renvoie son numéro (0 : il n'y avait rien).
 * @param {Ile} ile
 * @param {number} i
 * @returns {number}
 */
export function retirerObjet(ile, i, cat = catalogue()) {
  const o = ile.objet[i];
  if (!o) return 0;
  const f = cat.fiches[o - 1];
  for (const j of empreinte(f, i, ile.n)) {
    if (f.bloque) ile.bloque[j] = 0;
    marquer(ile, j);
  }
  ile.objet[i] = 0;
  ile.etat[i] = 0;
  ile.croissance.delete(i);
  return o;
}

/**
 * Récolte ce qui a son pied sur la case, le jour `jour` : une culture ou un fruitier sauvage (mûr) se cueille et
 * repart de son premier stade ; le reste (un arbre coupé, une roche cassée, des fleurs ramassées) s'en va et repousse
 * à sa place après quelques nuits (le « retour » de sa récolte, sinon VIE.REPOUSSE). Ce qu'on en tire (les objets du
 * jeu) se calcule ailleurs, d'après la récolte renvoyée.
 * @param {Ile} ile
 * @param {number} i
 * @param {number} jour
 * @returns {{ ok: boolean, raison?: string, fiche?: object, recolte?: object }}
 */
export function recolter(ile, i, jour, cat = catalogue()) {
  const f = ficheA(ile, i, cat);
  if (!f) return refus('il n’y a rien ici');
  if (!f.recolte) return refus('rien à en tirer');
  if (f.recolte.repousse === 'stades') {
    if (ile.etat[i] < f.stades - 1) return refus('pas encore mûr');
    ile.etat[i] = 0;
    ile.croissance.add(i);
    marquer(ile, i);
    return { ok: true, fiche: f, recolte: f.recolte };
  }
  retirerObjet(ile, i, cat);
  const [a, b] = f.recolte.retour ?? V.REPOUSSE;
  ile.repousse.push({ i, numero: f.numero, jour: jour + entre(prng(`${ile.graine}/${i}/${jour}`, 'repousse'), a, b) });
  return { ok: true, fiche: f, recolte: f.recolte };
}

/* ---------- la nuit ---------- */

/**
 * La nuit du jour `jour` : les plantes qui poussent passent au stade suivant (toutes les NUITS_PAR_STADE nuits de leur
 * famille) ; celles dont la repousse est due reviennent à leur place, si elle est encore libre (sinon elles ne
 * reviennent pas : le joueur y a bâti, planté, creusé).
 * Ne parcourt que ces listes.
 * @param {Ile} ile
 * @param {number} jour
 * @returns {{ pousses: number, repousses: number }}
 */
export function nuit(ile, jour, cat = catalogue()) {
  let pousses = 0;
  for (const i of [...ile.croissance]) {
    const f = ficheA(ile, i, cat);
    if (!f || ile.etat[i] >= f.stades - 1) {
      ile.croissance.delete(i);
      continue;
    }
    const nuits = V.NUITS_PAR_STADE[f.famille] ?? 1;
    if ((jour + i) % nuits !== 0) continue;
    ile.etat[i]++;
    pousses++;
    marquer(ile, i);
    if (ile.etat[i] >= f.stades - 1) ile.croissance.delete(i);
  }
  let repousses = 0;
  const attendent = [];
  for (const r of ile.repousse) {
    if (r.jour > jour) {
      attendent.push(r);
      continue;
    }
    const f = cat.fiches[r.numero - 1];
    const stade = f.stades > 1 ? 0 : f.stades - 1;
    // la place a été prise (bâtie, plantée, changée en eau) : la plante ne revient pas
    if (poserObjet(ile, r.i, r.numero, stade, cat).ok) repousses++;
  }
  ile.repousse = attendent;
  return { pousses, repousses };
}

/* ---------- pour la scène ---------- */

/**
 * Les régions changées depuis le dernier appel (la scène ne repeint qu'elles), puis la liste est vidée.
 * @param {Ile} ile
 * @returns {number[]}
 */
export function regionsModifiees(ile) {
  const regions = [...ile.modifiees].sort((a, b) => a - b);
  ile.modifiees.clear();
  return regions;
}
