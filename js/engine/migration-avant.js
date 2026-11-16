/* ==========================================================================
   Ce que les migrations des parties d'avant l'île gardent du jeu d'avant (la bascule, fiche I9h ; docs/ile.md).

   Le récit, la visite de bienvenue, les ateliers et les commerces des hameaux, la calèche et sa malle sont retirés
   du jeu ; une vieille partie doit pourtant toujours se charger, migrer (js/engine/state.js, MIGRATIONS) et passer
   sur l'île (js/engine/migration-ile.js) comme avant, à la pièce près. Ce module en garde le strict nécessaire,
   figé tel que le jeu d'avant le faisait (les valeurs de data/recit.json, data/ile.json, data/monde.json BIENVENUE,
   js/engine/caleche.js d'alors) ; rien d'autre ne le lit.
   ========================================================================== */

import { DATA } from './catalog.js';
import { addLot, countItem, keepLots, lotsOf, pullLots, pushLots, takeItem } from './inventory.js';
import { fillSilo } from './animals.js';
import { rendreSemences } from './market.js';
import { earn } from './compta.js';

const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const entier = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);

/* ---------- les champs d'une partie (les clés de la sauvegarde ne changent pas) ---------- */

// state.recit d'une partie de l'île : vide, que rien n'écrit (une partie d'avant passée sur l'île reçoit le même).
export function recitVide() {
  return { faits: {}, relations: {}, confiance: {}, dites: {}, carnet: [], promesses: {} };
}
// state.bienvenue d'une partie de l'île : faite (il n'y a pas de visite sur l'île).
export function bienvenueFaite() {
  return { etat: 'faite', qui: null, plat: null, remis: null, jour: null };
}
// state.caleche : la calèche d'avant, vide (une partie d'avant passée sur l'île reçoit la même).
export function calecheVide() {
  return { coffre: {}, haltes: [], fait: null, jour: null };
}

/* ---------- les migrations des formats d'avant le chantier (state.js) ---------- */

// v61 → v62 : la visite de bienvenue du jour BIENVENUE.JOUR (2) : attendue avant, faite après.
const JOUR_BIENVENUE = 2;
export function bienvenueDAvant(jour) {
  return { etat: (Number(jour) || 1) > JOUR_BIENVENUE ? 'faite' : 'attendue', qui: null, plat: null, remis: null, jour: null };
}

// v62 → v63 : ce que valait le commerce du niveau 10 d'une partie d'avant : la somme des prix de ses niveaux
// (ILE.REMBOURSEMENT.PRIX_NIVEAUX), 0 sans commerce choisi.
const PRIX_NIVEAUX_COMMERCE = [0, 3000, 8000, 20000];
export function remboursementCommerce(commerce) {
  if (!objet(commerce) || !commerce.type) return 0;
  const P = PRIX_NIVEAUX_COMMERCE, n = Math.max(1, Math.min(P.length, Math.floor(Number(commerce.niveau) || 1)));
  return P.slice(0, n).reduce((a, b) => a + b, 0);
}

// Les souvenirs du récit : l'enveloppe de Maurice (ses pièces, à l'ouverture : RECIT.ENVELOPPE), la cloche, la pierre
// de lune (D16 : elle n'a plus d'effet). Ce ne sont plus des objets du jeu ; une partie d'avant qui les a les garde le
// temps de ses migrations (des lots, comme l'inventaire les range), puis les perd en passant sur l'île : l'enveloppe
// pas encore ouverte y est ouverte (ses pièces), la cloche et la pierre s'en vont.
export const ENVELOPPE = Object.freeze({ OBJET: 'enveloppe_maurice', PIECES: 15000 });
export const SOUVENIRS = Object.freeze(['cloche_maurice', 'pierre_lune']);
// (v63 → v64 : l'enveloppe arrive dans l'inventaire : un lot qui ne périme pas, comme addItem le posait)
export function poserEnveloppe(state) {
  const I = objet(state.inventaire) ? state.inventaire : (state.inventaire = {});
  const lots = Array.isArray(I[ENVELOPPE.OBJET]) ? I[ENVELOPPE.OBJET] : (I[ENVELOPPE.OBJET] = []);
  const meme = lots.find((l) => l && l.nightsLeft === null && l.origin === DATA.ORIGINE.PRODUIT);
  if (meme) meme.qty += 1;
  else lots.push({ qty: 1, nightsLeft: null, origin: DATA.ORIGINE.PRODUIT });
}

/* ---------- le passage sur l'île (migration-ile.js) ---------- */

// Ce que devaient rendre les commandes en cours aux ateliers des hameaux (ILE.ATELIERS[atelier].recettes[recette].sortie,
// par lot).
const SORTIES_ATELIERS = Object.freeze({
  scierie: { planches: { planche: 3 } },
  tissage: { tissu: { tissu: 1 } },
  couture: { gants_travail: { gants_travail: 1 }, manteau_chaud: { manteau_chaud: 1 }, salopette: { salopette: 1 } },
});
export function sortieAtelier(atelier, recette) {
  const A = SORTIES_ATELIERS[atelier];
  return (A && A[recette]) || null;
}

// L'enveloppe pas encore ouverte : ses pièces (comptées dans la journée : « Enveloppe ouverte »).
export function ouvrirEnveloppe(state) {
  const n = Math.floor(countItem(state, ENVELOPPE.OBJET));
  if (n > 0) { takeItem(state, ENVELOPPE.OBJET, n); earn(state, ENVELOPPE.PIECES * n, 'Enveloppe ouverte'); }
}
// La cloche et la pierre de lune quittent l'inventaire.
export function retirerSouvenirs(state) {
  for (const it of SOUVENIRS) {
    const n = Math.floor(countItem(state, it));
    if (n > 0) takeItem(state, it, n);
  }
}

// La malle de la calèche d'une partie d'avant (state.caleche.malle), vidée comme la calèche d'avant le faisait
// (caleche.js : reprendreTout, prendreLivraison, annulerCommande) : ce qui était à vendre repris, ce qui était livré pris,
// les commandes payées remboursées (en pièces, comptées : « Commande annulée : … » ; une semence rendue au cours, ce qui
// venait du coffre y retourne). → { vente: { objet: n }, livre: { objet: n } } (ce qui était dans la malle, à la
// fenêtre du retour).
const nLots = (lots) => (Array.isArray(lots) ? lots.reduce((t, l) => t + (l.qty || 0), 0) : 0);
function calecheDe(state) {
  if (!objet(state.caleche)) state.caleche = calecheVide();
  const c = state.caleche;
  if (!objet(c.coffre)) c.coffre = {};
  if (!Array.isArray(c.haltes)) c.haltes = [];
  return c;
}
function malleDe(state) {
  const c = calecheDe(state);
  if (!objet(c.malle)) c.malle = { vente: {}, commande: {}, livre: {}, passage: null };
  const m = c.malle;
  for (const k of ['vente', 'commande', 'livre']) if (!m[k] || typeof m[k] !== 'object') m[k] = {};
  return m;
}
export function viderMalle(state) {
  const m = malleDe(state), c = calecheDe(state);
  // (ce qu'elle contenait)
  const vente = {}, livre = {};
  for (const [k, lots] of Object.entries(m.vente)) { const n = nLots(lots); if (n > 0 && DATA.OBJETS[k]) vente[k] = n; }
  for (const [k, n] of Object.entries(m.livre)) if (n > 0 && DATA.OBJETS[k]) livre[k] = n;
  // (ce qui était à vendre : repris)
  for (const k of Object.keys(m.vente)) {
    const lots = m.vente[k], n = nLots(lots);
    if (!(n > 0)) continue;
    const pris = pullLots(lots, n);
    if (!nLots(lots)) delete m.vente[k];
    const inv = lotsOf(state, k);
    pushLots(inv, pris);
    keepLots(state.inventaire, k, inv);
  }
  // (ce qui était livré : pris)
  for (const k of Object.keys(m.livre)) {
    const q = Math.floor(m.livre[k] || 0);
    delete m.livre[k];
    if (!(q > 0) || !DATA.OBJETS[k]) continue;
    addLot(state, k, q, DATA.ORIGINE.ACHETE);
    if (k === DATA.SILO.ITEM && state.silo) fillSilo(state);
  }
  // (les commandes payées : remboursées)
  for (const k of Object.keys(m.commande)) {
    const o = m.commande[k];
    if (!o || !(o.n > 0)) { delete m.commande[k]; continue; }
    if (o.sorte === 'semence') rendreSemences(state, k, o.n);
    else c.coffre[k] = (c.coffre[k] || 0) + o.n;
    earn(state, o.cout, `Commande annulée : ${DATA.OBJETS[k] ? DATA.OBJETS[k].nom : k}`, o.n);
    delete m.commande[k];
  }
  return { vente, livre };
}
