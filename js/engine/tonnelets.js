import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { countItem, takeItem } from './inventory.js';
import { storeWithSilo } from './animals.js';

/* ---------- les tonnelets de la ferme générée (le lot 6 des évolutions du crafting) ----------
   Un tonnelet se fabrique à l'Atelier et se pose dehors comme un bloc (DATA.ATELIER.BLOCS.tonnelet). On y met
   un produit à affiner (DATA.TONNELET.AFFINE : la tomme d'alpage, le moût de houblon, que donnent les chaînes de
   production) ; il y reste DATA.TONNELET.NUITS nuits (l'étape de nuit, comme les ruches), puis le produit fini
   (le fromage d'alpage, la bière artisanale) attend qu'on le prenne : une bulle, comme le miel d'une ruche
   pleine (un tas à ramasser « tonnelet:<case> », js/engine/ramassage.js pickUp).
   state.tonnelets = { [case]: { produit, nuits } } : un tonnelet vide n'y est pas. Voir docs/tonnelet.md. */

const PREFIXE = 'tonnelet:';
const T = () => DATA.TONNELET;

function etats(state) {
  if (!state.tonnelets || typeof state.tonnelets !== 'object') state.tonnelets = {};
  return state.tonnelets;
}

// Les cases où un tonnelet est posé.
export function tonneletsPoses(state) {
  const B = state.blocs && typeof state.blocs === 'object' ? state.blocs : {};
  return Object.keys(B).filter((t) => B[t] === T().OBJET).map(Number);
}

// Ce qu'on peut mettre dans un tonnelet : [item].
export function aAffiner() {
  return Object.keys(T().AFFINE);
}

// L'état du tonnelet de `tile` : null (pas de tonnelet), { vide: true }, ou { produit, sortie, nuits, reste, pret }.
export function etatTonnelet(state, tile) {
  const B = state.blocs || {};
  if (B[tile] !== T().OBJET) return null;
  const e = state.tonnelets && state.tonnelets[tile];
  if (!e || !T().AFFINE[e.produit]) return { vide: true };
  const nuits = Math.min(T().NUITS, e.nuits | 0);
  return { produit: e.produit, sortie: T().AFFINE[e.produit], nuits, reste: T().NUITS - nuits, pret: nuits >= T().NUITS };
}

// Un tonnelet en action (le produit y travaille encore) : la carte le fait s'écraser et se relever.
export function tonneletActif(state, tile) {
  const e = etatTonnelet(state, tile);
  return !!(e && e.produit && !e.pret);
}

// Mettre `item` (la tomme d'alpage, le moût de houblon) dans le tonnelet vide de `tile`.
export function remplirTonnelet(state, tile, item) {
  const e = etatTonnelet(state, tile);
  if (!e) return fail('Il n\'y a pas de tonnelet ici.');
  if (!e.vide) return fail(e.pret ? 'Le tonnelet est plein : prends d\'abord ce qu\'il contient.' : 'Ce tonnelet travaille déjà.');
  if (!T().AFFINE[item]) return fail('Cela ne s\'affine pas au tonnelet.');
  if (countItem(state, item) < 1) return fail(`Il te faut ${DATA.OBJETS[item].nom.toLowerCase()} (une chaîne de production).`);
  takeItem(state, item, 1);
  etats(state)[tile] = { produit: item, nuits: 0 };
  return { ok: true, produit: item, sortie: T().AFFINE[item] };
}

// Les tonnelets prêts, en tas à ramasser : [{ id: 'tonnelet:<case>', lieu: 'tonnelet', ref, items }].
export function tonneletsARecolter(state) {
  const out = [];
  for (const t of tonneletsPoses(state)) {
    const e = etatTonnelet(state, t);
    if (e && e.pret) out.push({ id: PREFIXE + t, lieu: 'tonnelet', ref: t, items: { [e.sortie]: 1 } });
  }
  return out;
}

// L'identifiant de tas d'un tonnelet : sa case, ou null.
export function tonneletDuTas(id) {
  return typeof id === 'string' && id.startsWith(PREFIXE) ? Number(id.slice(PREFIXE.length)) : null;
}

// Le personnage prend ce qu'a fini le tonnelet de `tile` : il entre dans l'inventaire, le tonnelet est vide.
export function recolterTonnelet(state, tile) {
  const e = etatTonnelet(state, tile);
  if (!e || !e.pret) return fail('Ce n\'est pas encore prêt.');
  delete etats(state)[tile];
  storeWithSilo(state, e.sortie, 1);
  return { ok: true, lieu: 'tonnelet', items: { [e.sortie]: 1 } };
}

// Un tonnelet vient d'être posé sur `tile` : il est vide.
export function tonneletPose(state, tile) {
  if (state.tonnelets) delete state.tonnelets[tile];
}

// Le tonnelet de `tile` est repris (appelé une fois le bloc enlevé) : ce qu'il contenait revient dans
// l'inventaire, fini s'il était prêt, tel qu'on l'y avait mis sinon. Renvoie { item: qté } (vide : {}).
export function tonneletRepris(state, tile) {
  const e = state.tonnelets && state.tonnelets[tile];
  if (state.tonnelets) delete state.tonnelets[tile];
  if (!e || !T().AFFINE[e.produit]) return {};
  const item = (e.nuits | 0) >= T().NUITS ? T().AFFINE[e.produit] : e.produit;
  storeWithSilo(state, item, 1);
  return { [item]: 1 };
}

// Étape nocturne : chaque tonnelet qui travaille avance d'une nuit (prêt, il attend) ; l'état d'un
// tonnelet qui n'est plus posé est oublié.
export function affinerTonnelets(state) {
  const poses = new Set(tonneletsPoses(state));
  const E = etats(state);
  for (const t of Object.keys(E)) {
    if (!poses.has(Number(t)) || !T().AFFINE[E[t].produit]) { delete E[t]; continue; }
    E[t].nuits = Math.min(T().NUITS, (E[t].nuits | 0) + 1);
  }
}
