/*
   L'économie de l'île (docs/economie.md, E1 à E17) : la bourse du village, à part de celle du joueur (state.pieces) et
   de celles des villageois (v.bourse) ; la taxe sur les revenus, prise la nuit sur le total du jour ; les dons.

   state.economie = { bourse, taux, revenus: { joueur, villageois: { id: n } }, dons, journal: [{ jour, libelle, montant }] }
   (absent d'une ancienne partie : créé au premier besoin). Une bourse ne descend jamais sous zéro.
*/

import { DATA } from '../catalog.js';
import { noteCompta } from '../compta.js';
import { estPartieIle } from './jeu.js';

const E = () => DATA.ILE.ECONOMIE;
const entier = (n) => Math.max(0, Math.floor(Number(n) || 0));

/**
 * L'économie de la partie (créée au premier besoin).
 * @param {object} state
 */
export function economie(state) {
  let e = state.economie;
  if (!e || typeof e !== 'object') e = state.economie = {};
  e.bourse = entier(e.bourse);
  if (!Number.isInteger(e.taux)) e.taux = E().TAUX;
  if (!e.revenus || typeof e.revenus !== 'object') e.revenus = { joueur: 0, villageois: {} };
  if (!e.revenus.villageois || typeof e.revenus.villageois !== 'object') e.revenus.villageois = {};
  e.revenus.joueur = entier(e.revenus.joueur);
  if (!Array.isArray(e.journal)) e.journal = [];
  e.dons = entier(e.dons);
  return e;
}

/** La bourse du village (des pièces). */
export const bourseVillage = (state) => (estPartieIle(state) ? economie(state).bourse : 0);

/** Le taux de la taxe, en %. */
export const tauxTaxe = (state) => economie(state).taux;

/**
 * La taxe due sur un revenu : ⌈montant × taux⌉ (E7).
 * @param {number} montant
 * @param {number} taux en %
 */
export const taxeDe = (montant, taux) => (montant > 0 && taux > 0 ? Math.ceil((montant * taux) / 100) : 0);

/**
 * Un revenu du jour (E8 : une vente, un salaire), noté pour la taxe de la nuit ; rien hors de l'île.
 * @param {object} state
 * @param {'joueur'|string} qui le joueur, ou l'id d'un villageois
 * @param {number} montant
 */
export function noterRevenu(state, qui, montant) {
  if (!estPartieIle(state) || !(montant > 0)) return;
  const r = economie(state).revenus;
  if (qui === 'joueur') r.joueur += Math.round(montant);
  else r.villageois[qui] = entier(r.villageois[qui]) + Math.round(montant);
}

function noterVillage(state, libelle, montant) {
  const e = economie(state);
  e.journal.push({ jour: state.day, libelle, montant });
  if (e.journal.length > E().JOURNAL) e.journal.splice(0, e.journal.length - E().JOURNAL);
}

/**
 * La nuit (E9) : chacun paie la taxe sur le total de ses revenus du jour, sans passer sous zéro ; elle va à la bourse
 * du village. → { joueur, villageois, total }.
 * @param {object} state
 */
export function taxerLaNuit(state) {
  if (!estPartieIle(state)) return null;
  const e = economie(state);
  const out = { joueur: 0, villageois: 0, total: 0 };
  const tj = Math.min(entier(state.pieces), taxeDe(e.revenus.joueur, e.taux));
  if (tj > 0) {
    state.pieces = Math.round(state.pieces - tj);
    noteCompta(state, -tj, 'Taxe du village');
    out.joueur = tj;
  }
  for (const v of state.villageois || []) {
    const t = Math.min(entier(v.bourse), taxeDe(entier(e.revenus.villageois[v.id]), e.taux));
    if (t > 0) {
      v.bourse = entier(v.bourse) - t;
      out.villageois += t;
    }
  }
  out.total = out.joueur + out.villageois;
  e.bourse += out.total;
  if (out.total > 0) noterVillage(state, 'Taxe', out.total);
  e.revenus = { joueur: 0, villageois: {} };
  return out;
}

/**
 * Le joueur donne des pièces au village (E16) : pas taxé, ne se reprend pas.
 * @param {object} state
 * @param {number} montant
 */
export function donnerAuVillage(state, montant) {
  if (!estPartieIle(state)) return { ok: false, error: 'Pas de village ici.' };
  const n = Math.floor(Number(montant) || 0);
  if (n < 1) return { ok: false, error: 'Un don est d’au moins 1 pièce.' };
  if (entier(state.pieces) < n) return { ok: false, error: `Tu n'as que ${entier(state.pieces)} pièces.` };
  const e = economie(state);
  state.pieces = Math.round(state.pieces - n);
  noteCompta(state, -n, 'Don au village');
  e.bourse += n;
  e.dons += n;
  noterVillage(state, 'Don', n);
  return { ok: true, don: n, bourse: e.bourse };
}

/**
 * La bourse du village paie `prix` pièces (un niveau de la place, un projet) : false si elle n'a pas la somme.
 * @param {object} state
 * @param {number} prix
 * @param {string} libelle
 */
export function payerParLeVillage(state, prix, libelle) {
  const e = economie(state);
  if (e.bourse < prix) return false;
  e.bourse -= prix;
  noterVillage(state, libelle, -prix);
  return true;
}

/**
 * Le salaire d'un jour de travail (E11) : SALAIRE % de ce que le villageois a rapporté (net : son produit moins ce qu'il
 * a pris au coffre, au prix de l'île), arrondi à l'entier supérieur.
 * @param {number} net
 */
export const salaireDe = (net) => (net > 0 ? Math.ceil((net * E().SALAIRE) / 100) : 0);

/**
 * La nuit : le joueur paie le salaire du jour de chaque employé (`dus` : [{ v, net }]). Sans de quoi payer, rien n'est
 * payé (pas de dette) et le villageois ne travaille pas le lendemain (v.impaye : le salaire manqué) ; il reprend dès que
 * le joueur a de quoi. → { paye, impayes }.
 * @param {object} state
 * @param {{ v: object, net: number }[]} dus
 */
export function payerLesSalaires(state, dus) {
  const out = { paye: 0, impayes: [] };
  for (const { v, net } of dus) {
    const s = salaireDe(net);
    if (s <= 0) continue;
    if (entier(state.pieces) < s) {
      v.impaye = s;
      out.impayes.push(v.id);
      continue;
    }
    state.pieces = Math.round(state.pieces - s);
    noteCompta(state, -s, `Salaire : ${v.prenom || v.id}`);
    v.bourse = entier(v.bourse) + s;
    noterRevenu(state, v.id, s);
    out.paye += s;
  }
  // (un impayé d'avant : il reprend dès que le joueur a de quoi le payer)
  for (const v of state.villageois || [])
    if (v.impaye && !out.impayes.includes(v.id) && entier(state.pieces) >= v.impaye) delete v.impaye;
  return out;
}

/**
 * Règle le taux de la taxe (E10 : au panneau de contrôle de la mairie ; de MIN à MAX %).
 * @param {object} state
 * @param {number} taux
 */
export function reglerTaux(state, taux) {
  const t = Math.round(Number(taux));
  if (!Number.isFinite(t) || t < E().TAUX_MIN || t > E().TAUX_MAX)
    return { ok: false, error: `Le taux va de ${E().TAUX_MIN} à ${E().TAUX_MAX} %.` };
  economie(state).taux = t;
  return { ok: true, taux: t };
}
