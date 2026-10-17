// atelier.js — la ferme générée (docs/carte-generee.md, étape 3) : l'Atelier (une fenêtre du
// menu latéral, sur la ferme générée seulement) et ce qu'on ramasse à la main sur la carte.
//
// L'Atelier se construit avec des matériaux (DATA.ATELIER.CONSTRUCTION) ; ensuite, chaque
// recette dit ce qu'elle prend et ce qu'elle donne, et un bouton la fabrique (grisé, avec ce
// qui manque, quand on ne peut pas). Le moteur : js/engine/atelier.js.

import { DATA } from '../engine/catalog.js';
import { atelierConstruit, atelierStatus, buildAtelier, craft, craftStatus, ramasser } from '../engine/atelier.js';
import { countItem } from '../engine/inventory.js';
import { toolDef } from '../engine/outils.js';
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

export function renderAtelier() {
  const A = DATA.ATELIER;
  if (!atelierConstruit(state)) {
    const st = atelierStatus(state);
    return `
      <div class="section-head"><h3>${A.ICONE} ${A.NOM}</h3></div>
      <div class="card">
        <p>Un établi pour travailler le bois, la pierre et la fibre ramassés sur la ferme : planches, murs, portes, paillasses et outils de pierre.</p>
        <span class="chips">${besoinHtml(A.CONSTRUCTION)}</span>
        <button type="button" class="btn primary" data-action="atelier-construire"${st.ok ? '' : ' disabled'}>Construire l'Atelier</button>
        ${st.ok ? '' : '<p class="muted">Ramasse sur la carte les petites pierres et les morceaux de bois (un appui dessus).</p>'}
      </div>`;
  }
  return `
    <div class="section-head"><h3>${A.ICONE} ${A.NOM} · niveau ${state.atelier.niveau}</h3></div>
    ${Object.entries(A.RECETTES).map(([id, r]) => recetteHtml(id, r)).join('')}`;
}

registerActions({
  'atelier-construire': () => {
    const r = buildAtelier(state);
    if (!r.ok) { notify(r.error); return; }
    notify(`${DATA.ATELIER.ICONE} L'Atelier est construit.`);
    persistState();
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
