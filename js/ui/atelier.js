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
import { toolDef } from '../engine/outils.js';
import { sortirBotte, verserFibres } from '../engine/botteleuse.js';
import { asleep } from '../engine/night.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { itemsText } from './common.js';
import { subtabsHtml } from './inventaire.js';

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

function recetteHtml(id, r) {
  const st = craftStatus(state, id);
  const sortie = r.outil ? `${toolDef(r.outil).ICONE} ${toolDef(r.outil).NOM} de pierre` : itemsText(r.sortie, 'nom');
  const garde = r.sortie ? Object.keys(r.sortie).map((item) => countItem(state, item)).reduce((a, b) => a + b, 0) : null;
  return `
    <div class="card atelier-recette" id="atelier-${id}">
      <span class="atelier-sortie">${sortie}${garde ? ` <span class="muted">(${garde} en stock)</span>` : ''}</span>
      <span class="chips">${besoinHtml(r.entrees)}</span>
      <button type="button" class="btn${st.ok ? ' primary' : ''}" data-action="atelier-fabriquer" data-recette="${id}"${st.ok ? '' : ` disabled title="${st.raison}"`}>Fabriquer</button>
    </div>`;
}

// Deux onglets : les outils (houe, hache, pioche, faux), puis les matériaux (tout le reste).
const ATELIER_TABS = [
  { id: 'outils', icon: '⛏️', label: 'Outils' },
  { id: 'materiaux', icon: '🧱', label: 'Matériaux' },
];
let atelierTab = 'outils';

// L'onglet de la recette `id` (le didacticiel montre l'onglet avant le bouton Fabriquer).
export const ongletRecette = (id) => (DATA.ATELIER.RECETTES[id] && DATA.ATELIER.RECETTES[id].outil ? 'outils' : 'materiaux');
export const ongletAtelier = () => atelierTab;
const dansOnglet = (r) => (atelierTab === 'outils' ? !!r.outil : !r.outil);

// La rangée d'onglets (sous le titre de la fenêtre) : une fois l'Atelier construit.
export function atelierOngletsHtml() {
  return atelierConstruit(state) ? subtabsHtml(ATELIER_TABS, atelierTab, 'atelier-tab') : '';
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
  // (pendant le didacticiel : seulement les recettes qu'il a débloquées)
  const vues = recettesDidacticiel(state);
  const recettes = Object.entries(A.RECETTES).filter(([id, r]) => (!vues || vues.has(id)) && recetteDebloquee(state, id) && dansOnglet(r));
  return `
    <div class="section-head"><h3>${A.ICONE} ${A.NOM} · niveau ${state.atelier.niveau}</h3></div>
    ${recettes.length ? recettes.map(([id, r]) => recetteHtml(id, r)).join('')
    : `<p class="muted">${atelierTab === 'outils' ? 'Aucun outil à fabriquer pour l\'instant.' : 'Aucun matériau à fabriquer pour l\'instant.'}</p>`}`;
}

registerActions({
  'atelier-tab': (target) => {
    atelierTab = target.dataset.tab === 'materiaux' ? 'materiaux' : 'outils';
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
