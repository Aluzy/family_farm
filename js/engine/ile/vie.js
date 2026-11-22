/* ==========================================================================
   L'île en jeu (docs/ile-300.md, étape 6) : l'île née d'un chantier, sa lecture, ses modifications par le
   joueur (le sol, les plantes et les roches, la récolte), et ses nuits (la pousse, la repousse). La carte est
   plate en jeu : le relief du chantier ne sert qu'à la génération, il ne passe pas dans l'île.
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).

   Les règles des modifications : la mer du large (la bande de BORD_MER cases) ne se touche pas ; la terre
   reste d'un seul tenant (on ne coupe pas l'île en deux, on ne pose pas de terre au milieu de l'eau). Une
   modification refusée renvoie { ok: false, raison } et ne change rien.

   Les performances : les lectures n'allouent rien ; une modification ne touche que ses cases (le contrôle
   « d'un seul tenant » ne parcourt l'île qu'au besoin) ; la nuit ne parcourt que les plantes qui poussent et
   celles qui doivent repousser, jamais les 90 000 cases. Chaque changement marque sa région : la scène ne
   repeint qu'elle (regionsModifiees), la sauvegarde n'écrit qu'elle (sauvegarde.js).
   ========================================================================== */

import { DATA } from '../catalog.js';
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
 * @property {Uint16Array} objet            le numéro (catalogue) de ce qui a son pied sur la case, 0 : rien
 * @property {Uint8Array} etat              le stade de ce pied (0 : le premier)
 * @property {Uint8Array} bloque            1 : une case prise par l'empreinte d'un bloc (déduit des objets)
 * @property {Map<number, number>} croissance   les cases dont la plante n'a pas fini de pousser → le jour où elle passe
 *                                          au stade suivant
 * @property {{ i: number, numero: number, jour: number }[]} repousse   les plantes à remettre, et quel jour
 * @property {Set<number>} modifiees        les régions changées depuis que la scène les a lues
 * @property {Set<number>} aSauver          les régions changées depuis la dernière sauvegarde
 */

const V = REGLAGES.VIE;
const N = ILE.TAILLE;
const PAR_COTE = Math.ceil(N / ILE.REGION);

/* ---------- l'île née d'un chantier ---------- */

// Les cases prises par les empreintes des blocs.
export function deduireBloque(ile, cat = catalogue()) {
  ile.bloque = new Uint8Array(ile.n * ile.n);
  for (let i = 0; i < ile.n * ile.n; i++) {
    const o = ile.objet[i];
    if (o && cat.fiches[o - 1].bloque) for (const j of empreinte(cat.fiches[o - 1], i, ile.n)) ile.bloque[j] = 1;
  }
}

// Les nuits qu'il faut à une plante pour passer du stade `etat` au suivant : un fruitier grandit au rythme du verger
// (VERGER.NUITS_STADE) et refait ses fruits en VERGER.PERIODE nuits ; le reste, une nuit par stade.
function nuitsPourGrandir(f, etat) {
  if (f.famille !== 'fruitier') return 1;
  return etat >= f.stades - 2 ? DATA.VERGER.PERIODE : DATA.VERGER.NUITS_STADE;
}

// La plante de la case i pousse : elle passera au stade suivant après ses nuits (à compter du jour `jour`).
function fairePousser(ile, i, f, jour) {
  if (ile.etat[i] < f.stades - 1) ile.croissance.set(i, jour + nuitsPourGrandir(f, ile.etat[i]));
  else ile.croissance.delete(i);
}

/**
 * L'île en jeu, faite d'un chantier mené jusqu'au bout (genererChantier) : le sol, les objets et leur stade, ce
 * qu'on en déduit ; ni région à repeindre ni à sauver. Le relief, la terre, l'humidité du chantier n'y passent pas.
 * @param {object} ch   le chantier
 * @returns {Ile}
 */
export function ileDuChantier(ch) {
  const ile = {
    graine: ch.graine,
    n: ch.n,
    apparition: { ...ch.apparition },
    sol: ch.sol,
    objet: ch.objet,
    etat: ch.etat,
    croissance: new Map(),
    repousse: [],
    modifiees: new Set(),
    aSauver: new Set(),
  };
  deduireBloque(ile);
  const cat = catalogue();
  for (let i = 0; i < ile.n * ile.n; i++) if (ile.objet[i]) fairePousser(ile, i, cat.fiches[ile.objet[i] - 1], 0);
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

// Marque la région d'une case : à repeindre, à sauver ; l'île change de version (le terrain de la ferme qu'on en
// tire se refait : js/engine/ile/jeu.js).
function marquer(ile, i) {
  ile.version = (ile.version ?? 0) + 1;
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
 * l'eau qu'on comble doit toucher la terre ; une case de terre qui devient de l'eau ne doit pas couper l'île en deux.
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
  }
  if (!deEau && versEau && !laTerreResteUnie(ile, i)) return refus('l’île serait coupée en deux');
  ile.sol[i] = sol;
  ile.solVersion = (ile.solVersion ?? 0) + 1; // (l'herbe haute en dépend : herbes.js)
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
 * @param {number} [jour]   le jour où elle est posée (elle pousse à partir de là)
 * @returns {{ ok: boolean, raison?: string }}
 */
export function poserObjet(ile, i, numero, stade = 0, jour = 0, cat = catalogue()) {
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
  fairePousser(ile, i, f, jour);
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
 * Récolte ce qui a son pied sur la case, le jour `jour`, à la main ou à la faux (`outil` : une culture qui a une
 * récolte à la faux, le tournesol, y donne autre chose : sa fleur plutôt que ses graines) :
 * - une culture sauvage (mûre) s'en va et ne repousse pas ; la vigne, une vivace, revient à son stade de vivace ;
 * - un fruitier sauvage (en fruits) garde sa taille : il revient au stade « arbre » et refait ses fruits ;
 * - une plante coupée ou ramassée (un arbre, un buisson, des fleurs) s'en va et ne repousse pas toute seule ;
 * - une roche cassée s'en va et revient à sa place après quelques nuits (le « retour » de sa récolte, sinon
 *   VIE.REPOUSSE).
 * Ce qu'on en tire (les objets du jeu) se calcule ailleurs, d'après la récolte renvoyée.
 * @param {Ile} ile
 * @param {number} i
 * @param {number} jour
 * @param {'main' | 'faux'} [outil]
 * @returns {{ ok: boolean, raison?: string, fiche?: object, recolte?: object }}
 */
export function recolter(ile, i, jour, outil = 'main', cat = catalogue()) {
  const f = ficheA(ile, i, cat);
  if (!f) return refus('il n’y a rien ici');
  if (!f.recolte) return refus('rien à en tirer');
  const r = outil === 'faux' && f.recolte.faux ? { ...f.recolte, ...f.recolte.faux } : f.recolte;
  const cueillie = r.repousse === 'stade' || r.repousse === 'jamais';
  if (cueillie && ile.etat[i] < f.stades - 1) return refus('pas encore mûr');
  if (r.repousse === 'stade') {
    ile.etat[i] = r.stade;
    fairePousser(ile, i, f, jour);
    marquer(ile, i);
    return { ok: true, fiche: f, recolte: r };
  }
  retirerObjet(ile, i, cat);
  // (une plante coupée ne repousse pas toute seule : seule une roche cassée revient, docs/ile-300.md)
  if (r.repousse !== 'jamais' && f.famille === 'roche') {
    const [a, b] = r.retour ?? V.REPOUSSE;
    ile.repousse.push({
      i,
      numero: f.numero,
      jour: jour + entre(prng(`${ile.graine}/${i}/${jour}`, 'repousse'), a, b),
    });
  }
  return { ok: true, fiche: f, recolte: r };
}

/* ---------- la nuit ---------- */

/**
 * La nuit du jour `jour` : les plantes qui poussent passent au stade suivant (un fruitier au rythme du verger ; ses
 * fruits reviennent en VERGER.PERIODE nuits) ; celles dont la repousse est due reviennent à leur place, si elle est encore libre (sinon elles ne
 * reviennent pas : le joueur y a bâti, planté, creusé).
 * Ne parcourt que ces listes.
 * @param {Ile} ile
 * @param {number} jour
 * @returns {{ pousses: number, repousses: number }}
 */
export function nuit(ile, jour, cat = catalogue()) {
  let pousses = 0;
  for (const [i, quand] of [...ile.croissance]) {
    const f = ficheA(ile, i, cat);
    if (!f || ile.etat[i] >= f.stades - 1) {
      ile.croissance.delete(i);
      continue;
    }
    if (quand > jour) continue;
    ile.etat[i]++;
    pousses++;
    marquer(ile, i);
    fairePousser(ile, i, f, jour);
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
    if (poserObjet(ile, r.i, r.numero, stade, jour, cat).ok) repousses++;
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
