/* Les papiers peints (data/meubles.json PAPIERS_PEINTS) : achetés dans la boutique de gemmes
   (worker/src/boutique.mjs ARTICLES), un motif est débloqué pour toujours : son objet
   (papier_peint_<motif>) reste dans l'inventaire et n'est jamais consommé. Dans Construire, l'outil 🧻
   (js/ui/chantier.js) pose le motif choisi sur tous les murs d'une pièce close d'un seul geste, ou l'en
   retire, gratuitement.

   Ce qui se voit d'un mur, vu de haut à 45°, depuis une pièce : la face de son mur du fond (le mur
   juste au-dessus d'une case de la pièce, dont la face est tournée vers elle). Le papier se pose donc
   sur ces faces-là ; les murs de côté ne montrent que leur dessus, le mur du bas sa face extérieure.
   Une fenêtre, une porte, la paroi vitrée gardent leur image : pas de papier dessus.

   state.papiers = { [case du mur]: motif } (en bas) ; state.papiersEtage = { [case du mur]: motif }
   (à l'étage : la face du mur rehaussé, ou du mur de l'étage, au-dessus d'une case d'une pièce de
   l'étage, js/engine/etage.js piecesNiveau) ; state.papiersNiveau2 au niveau 2, de même (chaque niveau, les
   mêmes mécaniques : le créateur, novembre 2026). Un mur repris garde son papier noté (il ne se voit plus,
   papiersVisibles) : Annuler, qui le repose, le retrouve tapissé. */

import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { countItem } from './inventory.js';
import { blocsPoses, hauteurPile, piecesCloses } from './blocs.js';
import { etageBlocs, fenetresEtage, murEtage, niveauxEtage, piecesNiveau } from './etage.js';
import { farmTerrain } from './terrain.js';

const CHAMP = { 0: 'papiers', 1: 'papiersEtage', 2: 'papiersNiveau2' };
// (les niveaux où l'on tapisse : le sol et chaque niveau du dessus)
const niveauOk = (n) => n === 0 || niveauxEtage().includes(n);
export const AUCUN = 'aucun';

// Les motifs (dans l'ordre des images de assets/papiers_peints.png).
export function motifsPapier() {
  return Object.keys(DATA.PAPIERS_PEINTS || {});
}

// Le motif est-il débloqué (son papier acheté dans la boutique de gemmes) ?
export function papierDebloque(state, motif) {
  const P = (DATA.PAPIERS_PEINTS || {})[motif];
  return !!P && countItem(state, P.objet) > 0;
}

// Les motifs débloqués, dans l'ordre du catalogue.
export function papiersDebloques(state) {
  return motifsPapier().filter((m) => papierDebloque(state, m));
}

// Les papiers posés au niveau `niveau` (0 : en bas, 1 : à l'étage, 2 : au-dessus) : { [case du mur]: motif }.
export function papiersPoses(state, niveau = 0) {
  const v = state && state[CHAMP[niveau]];
  return v && typeof v === 'object' ? v : {};
}

function setPapier(state, niveau, tile, motif) {
  const k = CHAMP[niveau];
  if (motif) {
    if (!state[k] || typeof state[k] !== 'object') state[k] = {};
    state[k][tile] = motif;
  } else if (state[k] && typeof state[k] === 'object') {
    delete state[k][tile];
    if (!Object.keys(state[k]).length) delete state[k];
  }
}

// Un mur du bas qui montre sa face pleine : un mur, pas une fenêtre, pas la paroi vitrée (une porte
// n'est pas un mur).
function murPleinBas(sorte) {
  const b = DATA.ATELIER.BLOCS[sorte];
  return !!b && !!b.mur && !b.fenetre && sorte !== 'paroi_vitree';
}

// La pièce close (au niveau `niveau`) qui contient la case `tile`, ou null.
export function pieceTapissable(state, tile, niveau = 0) {
  const liste = niveau ? piecesNiveau(state, niveau) : piecesCloses(state);
  return liste.find((p) => p.cases.includes(tile)) || null;
}

// Les murs dont on voit la face depuis la pièce `piece` (au niveau `niveau`) : [case du mur], triés.
export function facesPiece(state, piece, niveau = 0) {
  if (!piece) return [];
  const W = farmTerrain(state).LARGEUR, B = blocsPoses(state), E = etageBlocs(state, niveau || 1), F = fenetresEtage(state, niveau || 1);
  const dedans = new Set(piece.cases), out = new Set();
  for (const c of piece.cases) {
    const m = c - W;
    if (m < 0 || dedans.has(m)) continue;
    if (!niveau) {
      if (murPleinBas(B[m])) out.add(m);
    } else if (murEtage(state, m, niveau) && !F[m] && !(E[m] && !murPleinBas(E[m])) && (E[m] || hauteurPile(state, m) >= niveau + 1)) out.add(m);
  }
  return [...out].sort((a, b) => a - b);
}

// Pose le papier `motif` (ou AUCUN : le retire) sur tous les murs de la pièce close qui contient la
// case `tile`, au niveau `niveau`. → { ok, motif, murs, avant: { [mur]: motif | AUCUN } } ou un refus.
export function tapisserPiece(state, tile, motif, niveau = 0) {
  if (!niveauOk(niveau)) return fail('Le papier peint se pose en bas ou dans les pièces des niveaux du dessus.');
  const retire = motif === AUCUN;
  if (!retire && !(DATA.PAPIERS_PEINTS || {})[motif]) return fail('Ce papier peint n\'existe pas.');
  if (!retire && !papierDebloque(state, motif)) return fail(`Le papier peint « ${DATA.PAPIERS_PEINTS[motif].nom} » s'achète avec des gemmes 💎 (sur ta carte de joueur, sous tes pièces).`);
  const piece = pieceTapissable(state, tile, niveau);
  if (!piece) return fail(niveau ? `Touche une case d'une pièce close ${niveau === 1 ? 'de l\'étage' : `du niveau ${niveau}`}.` : 'Touche une case d\'une pièce close : une pièce fermée de murs, avec une porte.');
  const murs = facesPiece(state, piece, niveau);
  if (!murs.length) return fail('Cette pièce n\'a pas de mur plein au fond où poser le papier.');
  const P = papiersPoses(state, niveau), avant = {};
  for (const m of murs) avant[m] = P[m] || AUCUN;
  if (murs.every((m) => (P[m] || AUCUN) === motif)) return fail(retire ? 'Il n\'y a pas de papier peint dans cette pièce.' : 'Cette pièce a déjà ce papier peint.');
  for (const m of murs) setPapier(state, niveau, m, retire ? null : motif);
  return { ok: true, motif, niveau, murs, avant };
}

// Remet sur ces murs les papiers d'avant (l'annulation d'un tapisserPiece) : { [mur]: motif | AUCUN }.
// Un motif non débloqué n'est pas reposé.
export function tapisserMurs(state, murs, niveau = 0) {
  if (!niveauOk(niveau)) return fail('Le papier peint se pose en bas ou dans les pièces des niveaux du dessus.');
  const avant = {}, P = papiersPoses(state, niveau);
  for (const [k, motif] of Object.entries(murs || {})) {
    const m = Number(k);
    if (!Number.isInteger(m) || m < 0) continue;
    if (motif !== AUCUN && !papierDebloque(state, motif)) continue;
    avant[m] = P[m] || AUCUN;
    setPapier(state, niveau, m, motif === AUCUN ? null : motif);
  }
  return { ok: true, niveau, avant };
}

// Pour la carte (js/ui/stage.js) : les papiers qui se voient, [{ case, motif, frame }], au niveau
// `niveau` (les murs qui n'ont plus de face pleine vers une pièce sont passés).
export function papiersVisibles(state, niveau = 0) {
  const P = papiersPoses(state, niveau), M = motifsPapier(), out = [];
  const keys = Object.keys(P);
  if (!keys.length) return out;
  const ok = new Set();
  for (const p of niveau ? piecesNiveau(state, niveau) : piecesCloses(state)) for (const m of facesPiece(state, p, niveau)) ok.add(m);
  for (const k of keys) {
    const c = Number(k), frame = M.indexOf(P[k]);
    if (ok.has(c) && frame >= 0) out.push({ case: c, motif: P[k], frame });
  }
  return out.sort((a, b) => a.case - b.case);
}
