import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, countItem, shelfLife, takeItem } from './inventory.js';
import { allPlots, findPlot, isMature, maxStage } from './crops.js';

/* ---------- le bac à compost et l'engrais (docs/compost.md) ----------
   Un bac à compost se fabrique à l'Atelier et se pose dehors comme un bloc (DATA.ATELIER.BLOCS.compost).
   On y jette des aliments (jeterAuCompost, sa fenêtre) ; chaque nuit, ce qui a périmé (state.nuit.perdus :
   l'inventaire, la boîte à nourriture, le sac, le réfrigérateur) y va aussi tout seul. COMPOST.PAR_ENGRAIS (1)
   aliment fait un engrais, au plus COMPOST.MAX_ENGRAIS par bac ; ils attendent qu'on les prenne : une bulle, comme
   le miel d'une ruche pleine (un tas à ramasser « compost:<case> », js/engine/ramassage.js pickUp). L'engrais
   s'achète aussi à la calèche (OBJETS.engrais.comptoir, market.js isBuyable).

   L'engrais se glisse sur les cultures arrosées (des cases violettes sur la carte, comme les bleues de
   l'arrosage) : chacune gagne un cycle tout de suite (un stade), une fois par arrosage (p.engrais, oublié quand
   le cycle s'achève, crops.js growDue).

   La péremption est coupée (DATA.PENALITES.PEREMPTION, B-1) : on y jette aussi soi-même des aliments de
   l'inventaire (jeterAuCompost, sa fenêtre). Si elle revient, ce qui périme la nuit y va tout seul.

   state.composts = { [case]: { matiere } } : un bac vide n'y est pas. */

const PREFIXE = 'compost:';
const C = () => DATA.COMPOST;

function etats(state) {
  if (!state.composts || typeof state.composts !== 'object') state.composts = {};
  return state.composts;
}

// Ce qu'un bac garde au plus (en aliments périmés).
export function capaciteCompost() {
  return C().PAR_ENGRAIS * C().MAX_ENGRAIS;
}

// Les cases où un bac à compost est posé (dans l'ordre des cases).
export function compostsPoses(state) {
  const B = state.blocs && typeof state.blocs === 'object' ? state.blocs : {};
  return Object.keys(B).filter((t) => B[t] === C().OBJET).map(Number).sort((a, b) => a - b);
}

// L'état du bac de `tile` : null (pas de bac), ou { matiere, engrais, reste, niveau, plein }.
//   matiere : les aliments périmés qu'il garde ; engrais : ceux qu'ils font (à prendre) ;
//   reste : combien d'aliments manquent pour le prochain ; niveau (son image) : 0 vide, 1 moins de la moitié
//   de ses engrais, 2 la moitié au moins ; plein : il ne prend plus rien.
export function etatCompost(state, tile) {
  const B = state.blocs || {};
  if (B[tile] !== C().OBJET) return null;
  const e = state.composts && state.composts[tile];
  const matiere = Math.max(0, Math.min(capaciteCompost(), (e && e.matiere) | 0));
  const engrais = Math.floor(matiere / C().PAR_ENGRAIS);
  return {
    matiere, engrais, reste: C().PAR_ENGRAIS - (matiere % C().PAR_ENGRAIS),
    niveau: matiere <= 0 ? 0 : engrais * 2 < C().MAX_ENGRAIS ? 1 : 2, plein: matiere >= capaciteCompost(),
  };
}

// Les bacs qui ont un engrais au moins, en tas à ramasser : [{ id: 'compost:<case>', lieu: 'compost', ref, items }].
export function compostsARecolter(state) {
  const out = [];
  for (const t of compostsPoses(state)) {
    const e = etatCompost(state, t);
    if (e && e.engrais > 0) out.push({ id: PREFIXE + t, lieu: 'compost', ref: t, items: { [C().ENGRAIS]: e.engrais } });
  }
  return out;
}

// L'identifiant de tas d'un bac : sa case, ou null.
export function compostDuTas(id) {
  return typeof id === 'string' && id.startsWith(PREFIXE) ? Number(id.slice(PREFIXE.length)) : null;
}

// Le personnage prend les engrais du bac de `tile` : ils entrent dans l'inventaire ; ce qui ne fait pas encore
// un engrais reste dans le bac.
export function recolterCompost(state, tile) {
  const e = etatCompost(state, tile);
  if (!e || e.engrais < 1) return fail('Pas encore d\'engrais dans ce bac.');
  const reste = e.matiere - e.engrais * C().PAR_ENGRAIS;
  if (reste > 0) etats(state)[tile] = { matiere: reste };
  else delete etats(state)[tile];
  addItem(state, C().ENGRAIS, e.engrais);
  return { ok: true, lieu: 'compost', items: { [C().ENGRAIS]: e.engrais } };
}

// Un bac vient d'être posé sur `tile` : il est vide.
export function compostPose(state, tile) {
  if (state.composts) delete state.composts[tile];
}

// Le bac de `tile` est repris (appelé une fois le bloc enlevé) : ses engrais reviennent dans l'inventaire, ce
// qui n'en faisait pas encore est perdu. Renvoie { item: qté } (vide : {}).
export function compostRepris(state, tile) {
  const e = state.composts && state.composts[tile];
  if (state.composts) delete state.composts[tile];
  const n = e ? Math.floor(Math.min(capaciteCompost(), e.matiere | 0) / C().PAR_ENGRAIS) : 0;
  if (n < 1) return {};
  addItem(state, C().ENGRAIS, n);
  return { [C().ENGRAIS]: n };
}

// Étape nocturne (après la péremption, night.js) : ce qui a périmé cette nuit (state.nuit.perdus) va dans les
// bacs posés, le premier d'abord, tant qu'ils ont de la place. Note state.nuit.composte (le rapport du matin).
// Renvoie le nombre d'aliments mis au compost.
export function composter(state) {
  const E = etats(state);
  const poses = compostsPoses(state);
  // (l'état d'un bac qui n'est plus posé est oublié)
  for (const t of Object.keys(E)) if (!poses.includes(Number(t))) delete E[t];
  const perdus = (state.nuit && state.nuit.perdus) || {};
  let reste = Object.values(perdus).reduce((s, n) => s + Math.max(0, Math.floor(Number(n) || 0)), 0);
  let mis = 0;
  for (const t of poses) {
    if (reste <= 0) break;
    const avant = etatCompost(state, t).matiere;
    const n = Math.min(reste, capaciteCompost() - avant);
    if (n <= 0) continue;
    E[t] = { matiere: avant + n };
    reste -= n;
    mis += n;
  }
  if (state.nuit) state.nuit.composte = (state.nuit.composte || 0) + mis;
  return mis;
}

// Ce qui va au compost : un aliment (ce qui se mange, ou ce qui périme), pas une graine.
export function compostable(item) {
  const o = DATA.OBJETS[item];
  return !!o && o.categorie !== 'graine' && (o.mangeable === true || shelfLife(item) !== null);
}

// Les aliments de l'inventaire qu'on peut jeter au compost : { item: quantité }.
export function aJeterAuCompost(state) {
  const out = {};
  for (const item of Object.keys(state.inventaire || {})) {
    if (!compostable(item)) continue;
    const n = countItem(state, item);
    if (n > 0) out[item] = n;
  }
  return out;
}

// Jeter `qte` `item` de l'inventaire dans le bac de `tile` (autant que sa place le permet).
// → { ok, item, mis, etat } ou fail.
export function jeterAuCompost(state, tile, item, qte = 1) {
  const e = etatCompost(state, tile);
  if (!e) return fail('Il n\'y a pas de bac à compost ici.');
  if (!compostable(item)) return fail('Seuls les aliments vont au compost.');
  const place = capaciteCompost() - e.matiere;
  if (place <= 0) return fail('Le bac est plein : prends d\'abord ses engrais.');
  const n = Math.min(Math.max(1, Math.floor(Number(qte) || 1)), place, countItem(state, item));
  if (n < 1) return fail(`Tu n'as pas de ${DATA.OBJETS[item].nom.toLowerCase()}.`);
  takeItem(state, item, n);
  etats(state)[tile] = { matiere: e.matiere + n };
  return { ok: true, item, mis: n, etat: etatCompost(state, tile) };
}

/* ---------- l'engrais ---------- */

// La parcelle `p` peut-elle recevoir de l'engrais ? Une culture arrosée, pas mûre, pas encore engraissée depuis
// son arrosage.
export function engraissable(p) {
  return !!(p && p.culture && p.arrose && !isMature(p) && !p.engrais);
}

// Les cases des cultures où glisser l'engrais (la carte, js/ui/stage.js), quand on en a : [case].
export function casesEngraissables(state) {
  if (countItem(state, C().ENGRAIS) < 1) return [];
  return allPlots(state).filter((p) => Number.isInteger(p.case) && engraissable(p)).map((p) => p.case);
}

// Mettre un engrais sur la parcelle `plotId` : elle gagne un stade (un cycle) tout de suite ; arrosée, son cycle
// en cours continue. → { ok, stade, mure } ou fail.
export function engraisser(state, plotId) {
  const p = findPlot(state, plotId);
  if (!p || !p.culture) return fail('Il n\'y a pas de culture ici.');
  if (isMature(p)) return fail('Cette culture est déjà mûre : récolte-la.');
  if (!p.arrose) return fail('Arrose d\'abord cette culture : l\'engrais ne prend que sur une terre arrosée.');
  if (p.engrais) return fail('Cette culture a déjà reçu de l\'engrais : arrose-la de nouveau demain.');
  if (countItem(state, C().ENGRAIS) < 1) return fail('Il te faut de l\'engrais (le bac à compost).');
  takeItem(state, C().ENGRAIS, 1);
  p.stade = Math.min(maxStage(p), p.stade + 1);
  p.engrais = true;
  const mure = p.stade >= maxStage(p);
  // (mûre d'un coup : l'eau de ce cycle n'a plus d'usage, elle attend la récolte)
  if (mure) { p.arrose = false; delete p.arroseH; delete p.engrais; }
  return { ok: true, stade: p.stade, mure };
}
