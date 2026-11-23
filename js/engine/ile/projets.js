/*
   Les projets de développement du village de l'île (docs/economie.md, E15 et E17) : la mairie, l'école, le lieu de
   divertissement, le restaurant communautaire, un logement, développer le port (DATA.ILE.PROJETS).

   Le joueur choisit le projet en cours, un seul à la fois (choisirProjet). Dès que la bourse du village a son prix, elle
   le paie (avancerProjet : au choix, après un don, chaque nuit) :
     - développer le port : le port monte d'un niveau, c'est fini ;
     - un bâtiment : le village donne au joueur les blocs de sa liste (BLOCS), qu'il pose où il veut, de la forme qu'il
       veut, avec les siens en plus s'il le souhaite. Le bâtiment est fini (verifierProjet : à chaque bloc posé, et la
       nuit) quand tous les blocs donnés sont posés ET qu'une pièce close contient son meuble clé (CLE : accroché au mur,
       la case sous lui est dans la pièce ; le logement : sa boîte aux lettres contre une maison, comme les autres).

   La partie garde (state.economie) : projet { sorte, jour, paye, base: { sorte de bloc: posés au paiement } } ou absent ;
   faits [{ sorte, jour }].
*/

import { DATA } from '../catalog.js';
import { addItem } from '../inventory.js';
import { farmTerrain } from '../terrain.js';
import { blocsDessusPoses, blocsPoses, maisonDeBoite, pieceDe } from '../blocs.js';
import { monterPortParLeVillage, prochainNiveau } from '../bac.js';
import { economie, payerParLeVillage } from './economie.js';
import { estPartieIle } from './jeu.js';
import { niveauPlace } from './village.js';

const P = () => DATA.ILE.PROJETS;
const refus = (error) => ({ ok: false, error });

function faits(state) {
  const e = economie(state);
  if (!Array.isArray(e.faits)) e.faits = [];
  return e.faits;
}

/** Le projet `sorte` est-il fait (au moins une fois) ? */
export const projetFait = (state, sorte) => estPartieIle(state) && faits(state).some((f) => f.sorte === sorte);

/** Le projet en cours, ou null. */
export const projetEnCours = (state) => (estPartieIle(state) && economie(state).projet) || null;

/**
 * Le prix du projet `sorte` (développer le port : celui de son prochain niveau ; null au dernier).
 * @param {object} state
 * @param {string} sorte
 */
export function prixProjet(state, sorte) {
  if (sorte === 'port') {
    const nx = prochainNiveau(state);
    return nx ? nx.pieces : null;
  }
  return P()[sorte] ? P()[sorte].prix : null;
}

/**
 * Pourquoi le projet `sorte` ne peut pas être choisi (null : il peut).
 * @param {object} state
 * @param {string} sorte
 */
export function refusProjet(state, sorte) {
  const d = P()[sorte];
  if (!d) return 'Projet inconnu.';
  if (projetEnCours(state)) return 'Un projet est déjà en cours : un seul à la fois.';
  if (!d.repetable && projetFait(state, sorte)) return `${d.nom} : déjà fait.`;
  if (d.place && niveauPlace(state) < d.place) return `Il faut la place du village au niveau ${d.place}.`;
  if (d.apres && !projetFait(state, d.apres)) return `Il faut d'abord : ${P()[d.apres].nom.toLowerCase()}.`;
  if (sorte === 'port' && prixProjet(state, sorte) === null) return 'Le port est à son dernier niveau.';
  return null;
}

/**
 * Les projets, pour la fenêtre : [{ sorte, nom, icone, prix, refus, fait, enCours, effet }].
 * @param {object} state
 */
export function projetsIle(state) {
  const p = projetEnCours(state);
  return Object.entries(P())
    .filter(([k]) => !k.startsWith('//'))
    .map(([sorte, d]) => ({
      sorte,
      nom: d.nom,
      icone: d.icone,
      effet: d.effet,
      prix: prixProjet(state, sorte),
      refus: p && p.sorte === sorte ? null : refusProjet(state, sorte),
      fait: faits(state).filter((f) => f.sorte === sorte).length,
      enCours: !!p && p.sorte === sorte,
    }));
}

// Combien de blocs de chaque sorte sont posés (au sol, accrochés).
function poses(state) {
  const n = {};
  for (const s of [...Object.values(blocsPoses(state)), ...Object.values(blocsDessusPoses(state))])
    if (typeof s === 'string') n[s] = (n[s] || 0) + 1;
  return n;
}

/**
 * Le joueur choisit le projet en cours ; la bourse du village le paie tout de suite si elle a la somme.
 * @param {object} state
 * @param {string} sorte
 */
export function choisirProjet(state, sorte) {
  if (!estPartieIle(state)) return refus('Pas de village ici.');
  const r = refusProjet(state, sorte);
  if (r) return refus(r);
  economie(state).projet = { sorte, jour: state.day, paye: false };
  const a = avancerProjet(state);
  return { ok: true, sorte, paye: !!(a && a.paye) || projetFait(state, sorte) };
}

/** Le joueur renonce au projet en cours, tant qu'il n'est pas payé. */
export function abandonnerProjet(state) {
  const p = projetEnCours(state);
  if (!p) return refus('Pas de projet en cours.');
  if (p.paye) return refus('Le village l’a déjà payé : son chantier est ouvert.');
  delete economie(state).projet;
  return { ok: true };
}

function finir(state, p) {
  faits(state).push({ sorte: p.sorte, jour: state.day });
  delete economie(state).projet;
}

/**
 * Le projet en cours avance : la bourse du village le paie dès qu'elle a son prix (le port monte ; un bâtiment : ses
 * blocs donnés au joueur). → { paye, fini } ou null.
 * @param {object} state
 */
export function avancerProjet(state) {
  const p = projetEnCours(state);
  if (!p) return null;
  if (p.paye) return { paye: false, fini: verifierProjet(state) };
  const d = P()[p.sorte],
    prix = prixProjet(state, p.sorte);
  if (prix === null) {
    delete economie(state).projet;
    return null;
  }
  if (!payerParLeVillage(state, prix, d.nom)) return { paye: false, fini: false };
  if (p.sorte === 'port') {
    monterPortParLeVillage(state);
    finir(state, p);
    return { paye: true, fini: true };
  }
  p.paye = true;
  p.base = poses(state);
  for (const [b, n] of Object.entries(d.blocs || {}))
    addItem(state, DATA.ATELIER.BLOCS[b] ? DATA.ATELIER.BLOCS[b].objet : b, n);
  return { paye: true, fini: false };
}

// Le meuble clé est-il dans une pièce close ? (accroché au mur : la case sous lui ; le logement : une maison)
function cleDansUnePiece(state, d) {
  const W = farmTerrain(state).LARGEUR;
  const sol = blocsPoses(state),
    mur = blocsDessusPoses(state);
  for (const [k, s] of Object.entries(sol)) {
    if (s !== d.cle) continue;
    const t = Number(k);
    if (d.cle === 'boite_aux_lettres' ? maisonDeBoite(state, t) : pieceDe(state, t)) return true;
  }
  for (const [k, s] of Object.entries(mur)) if (s === d.cle && pieceDe(state, Number(k) + W)) return true;
  return false;
}

/**
 * Le bâtiment du projet en cours est-il fini (tous ses blocs posés, son meuble clé dans une pièce close) ? Fini, il
 * entre dans les projets faits. → true s'il vient d'être fini.
 * @param {object} state
 */
export function verifierProjet(state) {
  const p = projetEnCours(state);
  if (!p || !p.paye) return false;
  const d = P()[p.sorte],
    n = poses(state),
    base = p.base || {};
  for (const [b, k] of Object.entries(d.blocs || {})) if ((n[b] || 0) < (base[b] || 0) + k) return false;
  if (d.cle && !cleDansUnePiece(state, d)) return false;
  finir(state, p);
  return true;
}

/**
 * Ce qu'il reste à poser du projet en cours : { bloc: n } (null sans chantier ouvert).
 * @param {object} state
 */
export function resteAPoser(state) {
  const p = projetEnCours(state);
  if (!p || !p.paye) return null;
  const d = P()[p.sorte],
    n = poses(state),
    base = p.base || {},
    out = {};
  for (const [b, k] of Object.entries(d.blocs || {})) {
    const r = (base[b] || 0) + k - (n[b] || 0);
    if (r > 0) out[b] = r;
  }
  return out;
}
