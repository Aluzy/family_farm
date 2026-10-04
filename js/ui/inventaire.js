import { DATA } from '../engine/catalog.js';
import { countItem, expiringSoon, isPerishable, lotsOf } from '../engine/inventory.js';
import { reservableItems, setSeedReserve } from '../engine/family.js';
import { isUnlocked } from '../engine/campaign.js';
import { formatCoins, formatQty } from '../engine/format.js';
import { invTab, state } from './store.js';
import { applyResult } from './game-actions.js';
import { renderFridgeTab } from './serre-verger-frigo.js';
import { registerActions, sameHandler } from './actions.js';

/* ---------- Inventaire ---------- */

// Libellé d'une quantité : « 6 carottes », « 1 carotte », « 1 graine de tomate ».
export function unitLabel(item, qty) {
  const name = DATA.items[item].nom.toLowerCase();
  if (name.startsWith('graines ')) return qty > 1 ? name : `graine ${name.slice(8)}`;
  return qty > 1 && !/[sx]$/.test(name) ? `${name}s` : name;
}

export function nightsLabel(n) {
  return `${n} nuit${n > 1 ? 's' : ''}`;
}

// « 3 🥕 · 2 🍅 » à partir de { item: quantité }.
export function itemsSummary(map) {
  return Object.entries(map)
    .map(([item, n]) => `${n} ${DATA.items[item].icone}`)
    .join(' · ');
}

// Les lots d'un item : « 6 carottes — 2 nuits », le plus ancien en premier ;
// ce qui périt à la prochaine nuit est signalé.
function lotListHtml(item) {
  const lots = lotsOf(state, item);
  if (!isPerishable(item)) return '<span class="muted">Ne périme pas</span>';
  return `<ul class="lot-list" aria-label="Lots">${lots
    .map((l) => {
      const soon = l.nightsLeft === 1;
      return `<li class="${soon ? 'soon-spoil' : ''}"><span>${l.qty} ${unitLabel(item, l.qty)} — ${nightsLabel(l.nightsLeft)}</span>${soon ? '<span aria-hidden="true">⚠️</span><span>périme à la prochaine nuit</span>' : ''}</li>`;
    })
    .join('')}</ul>`;
}

// Lot 8 : boutons pour ranger un aliment périssable au frigo (s'il est construit).
function fridgeInButtons(item) {
  if (!state.frigo.construit || !isPerishable(item) || countItem(state, item) < 1) return '';
  return `
      <span class="device-actions">
        <button type="button" class="btn" data-action="fridge-in" data-item="${item}" data-qty="1">🧊 Ranger 1 au frigo</button>
        <button type="button" class="btn" data-action="fridge-in" data-item="${item}" data-qty="all">🧊 Tout ranger</button>
      </span>`;
}

function inventoryRow(item) {
  const it = DATA.items[item];
  const n = countItem(state, item);
  const reservable = reservableItems().includes(item);
  const res = state.famille.reserve[item] || 0;
  const info = [
    it.energie && it.edible ? `Énergie ${it.energie}` : '',
    it.energie && !it.edible ? `Ingrédient : compte pour ${it.energie} d'énergie dans les plats` : '',
    `Vente ${formatCoins(it.prix)} 💰`,
    it.rachetable === false ? 'non rachetable' : '',
  ].filter(Boolean).join(' · ');
  const reserve = reservable
    ? `
      <div class="row reserve">
        <span class="muted">🔒 Réserve de semences</span>
        <button type="button" class="btn step-btn" data-action="reserve-dec" data-item="${item}" aria-label="Réduire la réserve"${res <= 0 ? ' disabled' : ''}>−</button>
        <strong class="num">${res}</strong>
        <button type="button" class="btn step-btn" data-action="reserve-inc" data-item="${item}" aria-label="Augmenter la réserve"${res >= n ? ' disabled' : ''}>+</button>
      </div>
      <span class="muted">La famille ne mange jamais ${Math.min(res, n)} de ces ${it.nom.toLowerCase()}s : ce sont tes plants.</span>`
    : '';
  return `
    <div class="inv-row">
      <div class="inv-main"><span><span aria-hidden="true">${it.icone}</span> ${it.nom}</span><span class="big num">${formatQty(n)}</span></div>
      ${lotListHtml(item)}
      ${fridgeInButtons(item)}
      <span class="muted">${info}</span>
      ${item === DATA.SILO.ITEM && state.silo.construit ? `<span class="muted">🛖 Dans le Silo : <span class="num">${formatQty(state.silo.ble)}</span> (hors de l'inventaire)</span>` : ''}
      ${reserve}
    </div>`;
}

const INVENTORY_TABS = [
  { id: 'frais', label: 'Frais', icon: '🥕', match: (k) => isPerishable(k), empty: 'Aucun aliment frais pour l\'instant.' },
  { id: 'frigo', label: 'Frigo', icon: '🧊', match: () => false, empty: '' },
  { id: 'graines', label: 'Graines', icon: '🌱', match: (k) => DATA.items[k].category === 'graine', empty: 'Aucune graine pour l\'instant.' },
  { id: 'produits', label: 'Produits', icon: '🥫', match: (k) => !isPerishable(k) && DATA.items[k].category !== 'graine', empty: 'Aucun produit pour l\'instant.' },
];

// Toujours sur une seule rangée. À partir de quatre onglets (`compact`), seul l'onglet
// ouvert affiche son nom ; les autres montrent leur icône (le nom reste dans `title` et
// pour les lecteurs d'écran).
export function subtabsHtml(tabs, current, action) {
  return `<div class="subtabs${tabs.length > 3 ? ' compact' : ''}" role="group" aria-label="Sections">${tabs
    .map(
      (t) =>
        `<button type="button" class="subtab-btn${t.id === current ? ' active' : ''}" data-action="${action}" data-tab="${t.id}" aria-pressed="${t.id === current}" title="${t.label}"><span class="subtab-icon" aria-hidden="true">${t.icon}</span><span class="subtab-label">${t.label}</span></button>`
    )
    .join('')}</div>`;
}

export function renderInventaire() {
  // Lot 9 : le sous-onglet Frigo n'apparaît qu'avec le chapitre 6.
  const tabs = INVENTORY_TABS.filter((t) => t.id !== 'frigo' || isUnlocked(state, 'frigo'));
  const tab = tabs.find((t) => t.id === invTab) || tabs[0];
  if (tab.id === 'frigo') {
    return `
    <h2>📦 Inventaire</h2>
    ${subtabsHtml(tabs, tab.id, 'inv-tab')}
    ${renderFridgeTab()}`;
  }
  const items = Object.keys(DATA.items).filter(
    (k) => tab.match(k) && (countItem(state, k) > 0 || reservableItems().includes(k))
  );
  const soon = Object.keys(expiringSoon(state)).length > 0 && tab.id === 'frais';
  return `
    <h2>📦 Inventaire</h2>
    ${subtabsHtml(tabs, tab.id, 'inv-tab')}
    ${soon ? '<p class="alert">⚠️ Une partie de tes aliments périt à la prochaine nuit.</p>' : ''}
    <div class="inv-group">
      ${items.length ? items.map(inventoryRow).join('') : `<p class="hint">${tab.empty}</p>`}
    </div>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  ...sameHandler(['reserve-inc', 'reserve-dec'], (target, e, action) => {
    const item = target.dataset.item;
    const now = state.famille.reserve[item] || 0;
    applyResult(setSeedReserve(state, item, now + (action === 'reserve-inc' ? 1 : -1)));
  }),
});
