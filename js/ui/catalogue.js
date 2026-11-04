// catalogue.js — A-2 : trouver vite un objet dans le menu Construire (js/ui/chantier.js).
//
// - Les favoris : un appui long sur une case du menu (un clic droit à la souris) met l'objet en favori,
//   ou l'en retire ; les récents : les derniers objets choisis. Les deux font l'onglet ⭐, en tête des
//   onglets : un objet favori ou récent se prend en deux touches au plus (⭐, puis lui). Ils sont gardés
//   sur l'appareil (localStorage : un confort, pas une donnée de la partie).
// - Les filtres, sous les onglets : « ce que j'ai » (les objets épuisés se cachent), la pièce des meubles
//   (data/meubles.json, piece : cuisine, salon, chambre) et le style d'aménagement (data/styles.json).
// Les fonctions de filtre sont pures (tests/test-catalogue.mjs).

import { DATA } from '../engine/catalog.js';

const FAVORIS_CLE = 'ferme-construire-favoris';
const RECENTS_CLE = 'ferme-construire-recents';
export const RECENTS_MAX = 6;

const lit = (cle) => {
  try {
    const v = JSON.parse(localStorage.getItem(cle));
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string' && DATA.ATELIER.BLOCS[s]) : [];
  } catch (e) {
    return [];
  }
};
const ecrit = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* (stockage refusé : pour cette visite seulement) */ } };

let favoris = null, recents = null;
const lesFavoris = () => favoris || (favoris = lit(FAVORIS_CLE));
const lesRecents = () => recents || (recents = lit(RECENTS_CLE));

export const estFavori = (sorte) => lesFavoris().includes(sorte);

// Met `sorte` en favori, ou l'en retire. → true s'il l'est maintenant.
export function basculerFavori(sorte) {
  if (!DATA.ATELIER.BLOCS[sorte]) return false;
  const l = lesFavoris(), k = l.indexOf(sorte);
  if (k >= 0) l.splice(k, 1); else l.push(sorte);
  ecrit(FAVORIS_CLE, l);
  return k < 0;
}

// `sorte` vient d'être choisie : en tête des récents.
export function noterRecent(sorte) {
  if (!DATA.ATELIER.BLOCS[sorte]) return;
  recents = ajouteRecent(lesRecents(), sorte);
  ecrit(RECENTS_CLE, recents);
}

// (pur) La liste des récents après le choix de `sorte` : en tête, sans doublon, RECENTS_MAX au plus.
export function ajouteRecent(liste, sorte) {
  return [sorte].concat(liste.filter((s) => s !== sorte)).slice(0, RECENTS_MAX);
}

// (pur) Les cases de l'onglet ⭐ parmi `dispo` (les blocs du menu, dans ce niveau) : les favoris (dans
// l'ordre où on les a mis), puis les récents qui n'en sont pas.
export function sortesEtoile(dispo, fav = lesFavoris(), rec = lesRecents()) {
  const ok = new Set(dispo);
  const f = fav.filter((s) => ok.has(s));
  return f.concat(rec.filter((s) => ok.has(s) && !f.includes(s)));
}

// Les filtres du menu (pour cette visite) : { possede, piece, style }.
export const filtres = { possede: false, piece: null, style: null };

// Les pièces des meubles (data/meubles.json) et les styles (data/styles.json), dans leur ordre.
export const PIECES = [
  { id: 'cuisine', nom: 'Cuisine', icone: '🍳' },
  { id: 'salon', nom: 'Salon', icone: '🛋️' },
  { id: 'chambre', nom: 'Chambre', icone: '🛏️' },
];
export const pieceDe = (sorte) => {
  const b = DATA.ATELIER.BLOCS[sorte], m = b && b.meuble && DATA.MEUBLES && DATA.MEUBLES[b.meuble];
  return (m && m.piece) || (b && b.frigo ? 'cuisine' : null);   // (le réfrigérateur : pas au Marché des meubles)
};
export const STYLES = () => Object.entries((DATA.STYLES && DATA.STYLES.LISTE) || {}).map(([id, s]) => ({ id, nom: s.nom, icone: s.icone, blocs: new Set(s.blocs || []) }));
const dansStyle = (style, sorte) => { const st = STYLES().find((x) => x.id === style); return !!(st && st.blocs.has(sorte)); };

// (pur) Les blocs de `sortes` qui passent les filtres `f` ; `enMain(s)` : combien on en a.
export function filtrer(sortes, f, enMain) {
  return sortes.filter((s) => (!f.possede || enMain(s) > 0) && (!f.piece || pieceDe(s) === f.piece) && (!f.style || dansStyle(f.style, s)));
}

// (pur) Les filtres à proposer pour les blocs `sortes` d'un onglet : les pièces et les styles qui en
// ont au moins un.
export function filtresPossibles(sortes) {
  return {
    pieces: PIECES.filter((p) => sortes.some((s) => pieceDe(s) === p.id)),
    styles: STYLES().filter((st) => sortes.some((s) => st.blocs.has(s))),
  };
}

// (pour les tests) oublie ce qui a été lu du stockage
export function _oublie() { favoris = null; recents = null; }
