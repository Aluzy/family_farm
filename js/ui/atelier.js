// atelier.js — la ferme générée (docs/carte-generee.md, étape 3) : l'Atelier (une fenêtre de la
// carte : un appui sur l'Atelier posé, sur la ferme générée seulement) et ce qu'on ramasse à la
// main sur la carte.
//
// L'Atelier se construit avec des matériaux (DATA.ATELIER.CONSTRUCTION), en le posant sur la
// carte (menu 🔨 Construire, js/engine/blocs.js) ; ensuite, chaque
// recette dit ce qu'elle prend et ce qu'elle donne, et un bouton la fabrique (grisé, avec ce
// qui manque, quand on ne peut pas). Le moteur : js/engine/atelier.js.

import { DATA } from '../engine/catalog.js';
import { atelierConstruit, craft, craftStatus, ramasser, recetteDebloquee } from '../engine/atelier.js';
import { recettesDidacticiel } from '../engine/didacticiel.js';
import { countItem } from '../engine/inventory.js';
import { hasTool, toolDef } from '../engine/outils.js';
import { categorieBloc } from '../engine/blocs.js';
import { sortirBotte, verserFibres } from '../engine/botteleuse.js';
import { asleep } from '../engine/night.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { itemsText } from './common.js';

// La carte : le personnage a pris ce qui était au sol (`id`). Renvoie { ok, items } ou null
// (un message).
export function ramasserFromStage(id) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = ramasser(state, id);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return r;
}

// La carte : le personnage a jeté ses fibres dans l'entonnoir de la botteleuse dont `tile` est
// une pièce (js/engine/botteleuse.js). Renvoie { ok, versees, fibres, pleine } ou null (un message).
export function verserFromStage(tile) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = verserFibres(state, tile);
  if (!r.ok) { notify(r.error); return null; }
  const B = DATA.BOTTELEUSE, f = DATA.OBJETS.fibre.icone;
  notify(r.pleine ? `${B.ICONE} ${B.NOM} : ${r.fibres} ${f} reçues, elle se met en marche !` : `${f} ${r.versees} fibre${r.versees > 1 ? 's' : ''} dans l'entonnoir : ${r.fibres} / ${B.FIBRES}.`);
  persistState();
  refresh();
  return r;
}

// La carte : la machine de `tile` a vibré, sa botte tombe au bout du convoyeur (`ou` : { carte,
// point }). Renvoie { ok, morceau } ou null.
export function botteFromStage(tile, ou) {
  const r = sortirBotte(state, tile, ou);
  if (!r.ok) return null;
  persistState();
  refresh();
  return r;
}

// « 2 🪵 bois (1 en stock) » pour chaque objet demandé ; ce qui manque est marqué.
function besoinHtml(besoin) {
  return Object.entries(besoin).map(([item, n]) => {
    const o = DATA.OBJETS[item], a = countItem(state, item);
    return `<span class="chip${a < n ? ' warn' : ''}" title="${o.nom} : ${a} en stock">${n} ${o.icone}</span>`;
  }).join('');
}

// Le menu de l'Atelier reprend celui de Construire (js/ui/chantier.js) : des onglets
// intercalaires posés sur une barre de cases (l'ouvert, plus haut, avec son nom ; les autres,
// leur icône seule) : les outils, les matériaux (planches, cruche…), puis les catégories de
// Construire (Bâtir, Maison, Élevage, Énergie, Machines), d'après le bloc que donne la recette.
// Chaque case : ce qu'elle fabrique et combien on en a (pâlie quand il manque de quoi la
// fabriquer). Tous les murs tiennent dans une case, qui ouvre leur bulle ; de même les portes
// et les sols (GROUPES). Sous la barre, la recette choisie : ce qu'elle prend, ce qu'elle
// donne, et le bouton Fabriquer.
const GROUPES = [
  { id: 'fenetres', nom: 'Fenêtres', de: (b) => !!b.fenetre },
  { id: 'murs', nom: 'Murs', de: (b) => !!b.mur && !b.fenetre },
  { id: 'portes', nom: 'Portes', de: (b) => !!b.porte },
  { id: 'sols', nom: 'Sols', de: (b) => !!b.sol && !b.dehors },
];
const ONGLETS = () => [
  { id: 'outils', nom: 'Outils', icone: '⛏️' },
  { id: 'materiaux', nom: 'Matériaux', icone: DATA.OBJETS.planche.icone },
  ...Object.entries(DATA.ATELIER.CATEGORIES).map(([id, c]) => ({ id, nom: c.nom, icone: c.icone })),
];

// L'objet que donne la recette `id` (null : un outil), et le bloc de cet objet (ou null).
const sortieDe = (id) => { const r = DATA.ATELIER.RECETTES[id]; return r.sortie ? Object.keys(r.sortie)[0] : null; };
function blocDe(id) {
  const o = sortieDe(id);
  return o ? Object.keys(DATA.ATELIER.BLOCS).find((s) => DATA.ATELIER.BLOCS[s].objet === o) || null : null;
}
const groupeDe = (id) => { const b = blocDe(id); return b ? GROUPES.find((g) => g.de(DATA.ATELIER.BLOCS[b])) || null : null; };

// L'onglet de la recette `id` (le didacticiel montre l'onglet avant la recette).
export function ongletRecette(id) {
  const r = DATA.ATELIER.RECETTES[id];
  if (!r) return 'materiaux';
  if (r.outil) return 'outils';
  const b = blocDe(id);
  return (b && categorieBloc(b)) || 'materiaux';
}

// L'onglet ouvert (son id), la bulle ouverte (l'id de son groupe, ou null), la recette choisie
// dans chaque onglet, et la dernière choisie de chaque groupe (que montre la case du groupe).
let atelierTab = 'outils', bulle = null;
const choix = {}, choisi = {};

// Les onglets qui ont au moins une recette : [{ id, nom, icone, ids }] (pendant le didacticiel,
// seulement les recettes qu'il a débloquées).
function onglets() {
  const vues = recettesDidacticiel(state);
  const ids = Object.keys(DATA.ATELIER.RECETTES).filter((id) => (!vues || vues.has(id)) && recetteDebloquee(state, id));
  return ONGLETS().map((o) => ({ ...o, ids: ids.filter((id) => ongletRecette(id) === o.id) })).filter((o) => o.ids.length);
}
const ongletOuvert = (liste = onglets()) => liste.find((o) => o.id === atelierTab) || liste[0] || null;
export const ongletAtelier = () => { const o = ongletOuvert(); return o ? o.id : atelierTab; };
const duGroupe = (o, g) => o.ids.filter((id) => groupeDe(id) === g);
const peut = (id) => craftStatus(state, id).ok;
// La recette choisie dans l'onglet `o` : la dernière choisie, sinon la première qu'on peut
// fabriquer, sinon la première.
const recetteOuverte = (o) => (o.ids.includes(choix[o.id]) ? choix[o.id] : o.ids.find(peut) || o.ids[0]);
// La recette que montre la case du groupe `g` : la choisie, sinon la dernière choisie du groupe,
// sinon la première qu'on peut fabriquer, sinon la première.
function vuDuGroupe(o, g) {
  const l = duGroupe(o, g), c = recetteOuverte(o);
  if (l.includes(c)) return c;
  if (l.includes(choisi[g.id])) return choisi[g.id];
  return l.find(peut) || l[0];
}

// Pour le didacticiel (js/ui/didacticiel.js) : ce qu'il faut toucher pour arriver à la recette
// `id` (son onglet, la case de son groupe qui ouvre la bulle, sa case), ou null quand elle est
// choisie (reste le bouton Fabriquer).
export function cibleRecette(id) {
  const liste = onglets(), o = ongletOuvert(liste), t = ongletRecette(id);
  if (!o || o.id !== t) return `[data-action="atelier-tab"][data-tab="${t}"]`;
  if (recetteOuverte(o) === id) return null;
  const g = groupeDe(id);
  if (g && duGroupe(o, g).length > 1 && bulle !== g.id) return `[data-action="atelier-groupe"][data-groupe="${g.id}"]`;
  return `[data-action="atelier-choisir"][data-recette="${id}"]`;
}

// L'icône de ce que fabrique la recette, son nom, et combien on en a (un outil : ✓ s'il est à nous).
function icone(id) {
  const r = DATA.ATELIER.RECETTES[id];
  return r.outil ? toolDef(r.outil).ICONE : DATA.OBJETS[sortieDe(id)].icone;
}
function nom(id) {
  const r = DATA.ATELIER.RECETTES[id];
  const n = r.outil ? `${toolDef(r.outil).NOM} de pierre` : DATA.OBJETS[sortieDe(id)].nom;
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function stock(id) {
  const r = DATA.ATELIER.RECETTES[id];
  return r.outil ? (hasTool(state, r.outil) ? '✓' : '') : String(countItem(state, sortieDe(id)));
}

// Une case de la barre : ce que fabrique la recette, combien on en a.
function caseRecette(id, choisie) {
  const on = id === choisie, ok = peut(id), n = stock(id);
  return `<button type="button" class="tool-slot build-slot${on ? ' active' : ''}${ok ? '' : ' epuise'}" data-action="atelier-choisir" data-recette="${id}" aria-pressed="${on}" aria-label="${nom(id)}${n ? ` : ${n}` : ''}" title="${nom(id)}"><span aria-hidden="true">${icone(id)}</span><span class="build-slot-n num" aria-hidden="true">${n}</span></button>`;
}

// La recette choisie : son icône, son nom, ce qu'on en a ; ce qu'elle prend, ce qu'elle donne ;
// le bouton Fabriquer (grisé, avec ce qui manque).
function detailHtml(id) {
  const r = DATA.ATELIER.RECETTES[id], st = craftStatus(state, id), n = stock(id);
  const garde = r.outil ? (n ? 'déjà dans ta barre d\'outils' : '') : `${n} en stock`;
  const donne = r.sortie ? Object.entries(r.sortie).map(([item, q]) => `<span class="chip">${q} ${DATA.OBJETS[item].icone}</span>`).join('') : `<span class="chip">${icone(id)}</span>`;
  return `
    <div class="card atelier-detail" id="atelier-${id}">
      <span class="atelier-detail-ico" aria-hidden="true">${icone(id)}</span>
      <div class="atelier-detail-txt">
        <span class="atelier-detail-nom">${nom(id)}${garde ? ` <span class="muted">(${garde})</span>` : ''}</span>
        <span class="chips">${besoinHtml(r.entrees)}<span class="atelier-fleche" aria-hidden="true">➜</span>${donne}</span>
      </div>
      <button type="button" class="btn${st.ok ? ' primary' : ''}" data-action="atelier-fabriquer" data-recette="${id}"${st.ok ? '' : ` disabled title="${st.raison}"`}>Fabriquer</button>
    </div>`;
}

export function renderAtelier() {
  const A = DATA.ATELIER;
  // (pas encore construit : il se pose sur la carte, 🔨 Construire, et se construit alors)
  if (!atelierConstruit(state)) {
    return `
      <div class="section-head"><h3>${A.ICONE} ${A.NOM}</h3></div>
      <div class="card">
        <p>Un établi pour travailler le bois, la pierre et la fibre ramassés sur la ferme : planches, murs, portes, paillasses et outils de pierre.</p>
        <span class="chips">${besoinHtml(A.CONSTRUCTION)}</span>
        <p class="muted">Ramasse sur la carte les petites pierres et les morceaux de bois (un appui dessus), puis pose l'Atelier : menu ${A.ICONE} Construire.</p>
      </div>`;
  }
  const liste = onglets(), o = ongletOuvert(liste);
  const tete = `<div class="section-head"><h3>${A.ICONE} ${A.NOM} · niveau ${state.atelier.niveau}</h3></div>`;
  if (!o) return `${tete}<p class="muted">Aucune recette pour l'instant.</p>`;
  const tabs = liste.length > 1 ? `<div class="build-tabs" role="tablist" aria-label="Catégories">${liste.map((t) => {
    const on = t.id === o.id;
    return `<button type="button" class="build-tab${on ? ' on' : ''}" role="tab" data-action="atelier-tab" data-tab="${t.id}" aria-selected="${on}" aria-label="${t.nom}" title="${t.nom}"><span aria-hidden="true">${t.icone}</span>${on ? `<span class="build-tab-nom">${t.nom}</span>` : ''}</button>`;
  }).join('')}</div>` : '';
  // un groupe (les murs, les portes, les sols) : une case (la recette choisie), à la place de la
  // première, qui ouvre sa bulle ; une seule recette du groupe : sa case
  const choisie = recetteOuverte(o), vus = new Set(), rangs = [];
  const cases = o.ids.map((id) => {
    const g = groupeDe(id), l = g ? duGroupe(o, g) : [];
    if (l.length < 2) { rangs.push(null); return caseRecette(id, choisie); }
    if (vus.has(g.id)) return '';
    vus.add(g.id);
    rangs.push(g.id);
    const v = vuDuGroupe(o, g), on = l.includes(choisie), n = stock(v);
    return `<button type="button" class="tool-slot build-slot build-groupe${on ? ' active' : ''}${l.some(peut) ? '' : ' epuise'}" data-action="atelier-groupe" data-groupe="${g.id}" aria-expanded="${bulle === g.id}" aria-label="${g.nom} : ${nom(v)}. En choisir un autre" title="${g.nom} : en choisir un autre"><span class="build-groupe-plus" aria-hidden="true">⋯</span><span aria-hidden="true">${icone(v)}</span><span class="build-slot-n num" aria-hidden="true">${n}</span></button>`;
  }).join('');
  const gb = GROUPES.find((g) => g.id === bulle), lb = gb ? duGroupe(o, gb) : [];
  // (sa flèche vers la case du groupe : son rang dans la barre)
  const bulleHtml = lb.length > 1 ? `<div class="build-bulle" role="group" aria-label="${gb.nom}" style="--rang:${Math.max(0, rangs.indexOf(gb.id))}"><div class="build-bulle-titre">${gb.nom}</div><div class="build-bulle-grid">${lb.map((id) => caseRecette(id, choisie)).join('')}</div></div>` : '';
  return `${tete}
    <div class="atelier-menu">${tabs}<div class="build-bar" role="group" aria-label="Recettes : touche une case pour la choisir"><div class="build-bar-cases"><div class="build-bar-grid">${cases}</div>${bulleHtml}</div></div></div>
    ${detailHtml(choisie)}`;
}

registerActions({
  'atelier-tab': (target) => {
    atelierTab = target.dataset.tab;
    bulle = null;
    refresh();
  },
  'atelier-groupe': (target) => {
    const g = target.dataset.groupe;
    bulle = bulle === g ? null : g;
    refresh();
  },
  'atelier-choisir': (target) => {
    const id = target.dataset.recette, o = ongletOuvert(), g = groupeDe(id);
    if (!o || !DATA.ATELIER.RECETTES[id]) return;
    choix[o.id] = id;
    if (g) choisi[g.id] = id;
    bulle = null;
    refresh();
  },
  'atelier-fabriquer': (target) => {
    const r = craft(state, target.dataset.recette);
    if (!r.ok) { notify(r.error); return; }
    notify(r.outil ? `${toolDef(r.outil).ICONE} ${toolDef(r.outil).NOM} de pierre fabriquée.` : `${itemsText(r.items, 'gain')}`);
    persistState();
    refresh();
  },
});
