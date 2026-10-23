import { DATA } from '../engine/catalog.js';
import { countItem, inventoryCounts } from '../engine/inventory.js';
import { boiteCounts, deposerBoite, jaugeMembre, mangeurs, placeBoite, reprendreBoite, valeurAliment } from '../engine/repas.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { memberNameHtml } from './famille.js';
import { registerActions } from './actions.js';

/* ---------- la boîte à nourriture (un appui sur elle, sur la carte) ---------- */

// Une ligne d'aliment : son icône, son nom, sa valeur, combien, et les boutons.
function ligne(item, n, boutons) {
  const it = DATA.OBJETS[item];
  return `<li class="boite-ligne">
      <span class="item-icon" aria-hidden="true">${it.icone}</span>
      <span class="boite-nom">${it.nom} <span class="muted">(+${valeurAliment(item)})</span></span>
      <span class="num">${n}</span>
      <span class="row">${boutons}</span>
    </li>`;
}

// Le contenu de la fenêtre : ce qui est dans la boîte (à reprendre), puis les aliments de
// l'inventaire (à y mettre), et la faim de ceux qui y mangent.
export function renderBoite() {
  const B = DATA.ATELIER.BOITE;
  const dedans = boiteCounts(state);
  const plats = Object.keys(dedans);
  const sac = Object.keys(inventoryCounts(state)).filter((k) => DATA.OBJETS[k] && DATA.OBJETS[k].mangeable);
  const bouton = (action, item, n, texte, ok) => `<button type="button" class="btn" data-action="${action}" data-item="${item}" data-n="${n}"${ok ? '' : ' disabled'}>${texte}</button>`;
  const contenu = plats.length
    ? `<ul class="boite-liste">${plats.map((k) => ligne(k, dedans[k], bouton('boite-reprendre', k, 1, '−1', true) + bouton('boite-reprendre', k, dedans[k], 'Tout', true))).join('')}</ul>`
    : '<p class="muted">La boîte est vide : la famille n\'a rien à manger.</p>';
  const ajout = sac.length
    ? `<ul class="boite-liste">${sac.map((k) => {
      const place = Math.min(placeBoite(state, k), countItem(state, k));
      return ligne(k, countItem(state, k), bouton('boite-deposer', k, 1, '+1', place > 0) + bouton('boite-deposer', k, place, `+${Math.max(place, 0)}`, place > 1));
    }).join('')}</ul>`
    : '<p class="muted">Pas d\'aliment dans l\'inventaire : récolte, cueille des baies ou cuisine.</p>';
  const faim = mangeurs(state).map((m) => `${memberNameHtml(m.id)} <span class="num">${Math.floor(jaugeMembre(m))}</span>`).join(' · ');
  return `
    <div class="cards">
      <div class="card">
        <span class="card-title"><span>🧺 Dans la boîte · <span class="num">${plats.length} / ${B.PLATS}</span> aliments</span></span>
        <span class="muted">Au plus ${B.PLATS} aliments différents, ${B.QUANTITE} de chacun. Quand un membre a faim (jauge à ${DATA.FAMILLE.FAIM.SEUIL}), il vient y manger, d'abord ce qui périme le plus tôt.</span>
        ${contenu}
        ${faim ? `<span class="muted">Faim : ${faim}</span>` : ''}
      </div>
      <div class="card">
        <span class="card-title"><span>🎒 Depuis l'inventaire</span></span>
        ${ajout}
      </div>
    </div>`;
}

registerActions({
  'boite-deposer': (target) => {
    const r = applyResult(deposerBoite(state, target.dataset.item, Number(target.dataset.n) || 1));
    if (r.ok) persistState();
  },
  'boite-reprendre': (target) => {
    const r = applyResult(reprendreBoite(state, target.dataset.item, Number(target.dataset.n) || 1));
    if (r.ok) persistState();
  },
});
