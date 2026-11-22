/* ==========================================================================
   Le village de l'île (docs/ile-300.md, étapes E à H) : la place, ses niveaux, l'arrivée des villageois, le port bâti.

   - La place du village : le panneau du village (le bloc ILE.VILLAGE.PLACE), posé où le joueur veut ; un seul. Son
     niveau (state.place.niveau, 1 à sa pose) fixe combien de villageois l'île accueille (NIVEAUX[n − 1].villageois) ;
     il monte en payant NIVEAUX[n].prix pièces (monterPlace) : l'argent du port sert à cela.
   - Les villageois arrivent sur la place (pas du port) : la place posée, une maison libre (comme avant), une réserve
     de repas pour les suivants, de la place à son niveau ; au plus un toutes les ARRIVEE.PERIODE journées, de jour
     (ARRIVEE.HEURES).
   - Le village est fondé quand la place est posée et qu'un villageois au moins y vit (avec le personnage du joueur).
   - Le port : le comptoir du port (le bloc ILE.VILLAGE.PORT), posé sur une case qui touche la mer ; un seul. Il ne
     commerce qu'une fois le village fondé ; c'est le seul moyen de gagner de l'argent (l'export).
   ========================================================================== */

import { DATA } from '../catalog.js';
import { ileDeLaPartie, estPartieIle } from './jeu.js';
import { BIOMES, SOL_BIOME } from './reglages.js';

const V = () => DATA.ILE.VILLAGE;

// La case d'ancrage du premier bloc posé de la sorte `sorte` (state.blocs : { case: sorte }), ou null.
function caseDe(state, sorte) {
  const B = (state && state.blocs) || {};
  let mieux = null;
  for (const k of Object.keys(B)) if (B[k] === sorte && (mieux === null || Number(k) < mieux)) mieux = Number(k);
  return mieux;
}

/** La case de la place du village (le panneau posé), ou null. */
export const casePlace = (state) => caseDe(state, V().PLACE);
/** La case du comptoir du port (posé), ou null. */
export const casePort = (state) => caseDe(state, V().PORT);

/** Le niveau de la place : 0 sans place, sinon 1 au moins. */
export function niveauPlace(state) {
  if (casePlace(state) === null) return 0;
  const n = state.place && Number.isInteger(state.place.niveau) ? state.place.niveau : 1;
  return Math.max(1, Math.min(V().NIVEAUX.length, n));
}

/** Combien de villageois (adultes) la place accueille à son niveau (0 sans place). */
export function capacitePlace(state) {
  const n = niveauPlace(state);
  return n ? V().NIVEAUX[n - 1].villageois : 0;
}

const adultes = (state) => (Array.isArray(state.villageois) ? state.villageois.filter((v) => !v.enfant) : []);

/** Le village est-il fondé (la place posée, un villageois au moins) ? */
export const villageFonde = (state) => casePlace(state) !== null && adultes(state).length >= 1;

/**
 * Le prochain niveau de la place : { niveau, prix, villageois } ; null au dernier (ou sans place).
 * @param {object} state
 */
export function prochainNiveauPlace(state) {
  const n = niveauPlace(state);
  if (!n || n >= V().NIVEAUX.length) return null;
  return { niveau: n + 1, ...V().NIVEAUX[n] };
}

/**
 * Monter la place d'un niveau, en payant son prix. → { ok, niveau, prix } ou { ok: false, error }.
 * @param {object} state
 */
export function monterPlace(state) {
  if (!estPartieIle(state)) return { ok: false, error: 'Pas de place du village ici.' };
  if (casePlace(state) === null) return { ok: false, error: "Pose d'abord le panneau du village : c'est la place." };
  const p = prochainNiveauPlace(state);
  if (!p) return { ok: false, error: 'La place est à son plus haut niveau.' };
  if ((state.coins || 0) < p.prix) return { ok: false, error: `Il faut ${p.prix} pièces (l'export, par le port).` };
  state.coins -= p.prix;
  if (!state.place || typeof state.place !== 'object') state.place = {};
  state.place.niveau = p.niveau;
  return { ok: true, niveau: p.niveau, prix: p.prix };
}

/**
 * Pourquoi un nouveau villageois ne peut pas arriver aujourd'hui sur l'île (null : il peut ; la maison libre et la
 * réserve de repas sont vues par js/engine/villageois.js arriveeRefus, comme avant).
 * @param {object} state
 * @param {number} jour
 * @param {boolean} [voirJour] le jour compte (sa période depuis la dernière arrivée)
 */
export function refusArriveeIle(state, jour, voirJour = true) {
  if (casePlace(state) === null) return 'Il faut une place du village : pose le panneau du village (Construire).';
  const A = adultes(state);
  if (A.length >= capacitePlace(state))
    return `La place n'accueille que ${capacitePlace(state)} villageois à son niveau : monte-la de niveau (l'argent du port).`;
  if (voirJour) {
    const dernier = Math.max(0, ...(state.villageois || []).map((v) => Number(v.arrive) || 0));
    if (dernier && jour - dernier < V().ARRIVEE.PERIODE)
      return `Un nouveau venu au plus toutes les ${V().ARRIVEE.PERIODE} journées (prochain : jour ${dernier + V().ARRIVEE.PERIODE}).`;
  }
  return null;
}

/** Les heures où un nouveau venu arrive sur la place : [début, fin]. */
export const heuresArrivee = () => V().ARRIVEE.HEURES;

/**
 * Le comptoir du port (le bloc PORT) se pose-t-il en `tile` ? null, ou la raison. Il touche la mer (une case d'eau
 * du large, à côté d'une de ses cases) ; un seul. La place : une seule.
 * @param {object} state
 * @param {string} sorte
 * @param {number[]} cases ses cases (son emprise)
 */
export function refusPoseIle(state, sorte, cases) {
  if (!estPartieIle(state)) return null;
  if (sorte === V().PLACE && casePlace(state) !== null)
    return "Le village n'a qu'une place : son panneau est déjà posé.";
  if (sorte !== V().PORT) return null;
  if (casePort(state) !== null) return "L'île n'a qu'un port : son comptoir est déjà posé.";
  const ile = ileDeLaPartie(state),
    n = ile.n;
  const mer = (i) => BIOMES[SOL_BIOME[ile.sol[i]]] === 'mer';
  for (const t of cases) {
    const x = t % n,
      y = Math.floor(t / n);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const X = x + dx,
        Y = y + dy;
      if (X >= 0 && Y >= 0 && X < n && Y < n && mer(Y * n + X)) return null;
    }
  }
  return 'Le comptoir du port se pose au bord de la mer (une de ses cases touche la mer).';
}

/**
 * Le port de l'île peut-il commercer ? null, ou la raison : pas de comptoir posé, ou pas encore de village.
 * @param {object} state
 */
export function refusPortIle(state) {
  if (casePort(state) === null) return "Il n'y a pas encore de port : construis le comptoir du port au bord de la mer.";
  if (!villageFonde(state))
    return 'Le port commerce une fois le village fondé : la place du village posée, et un villageois qui y vit.';
  return null;
}
