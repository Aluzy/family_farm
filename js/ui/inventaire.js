import { DATA } from '../engine/catalog.js';
import { dishHappiness } from '../engine/ville.js';
import { countItem, isFridgeable, isPerishable, lotsOf } from '../engine/inventory.js';
import { fridgeCapacity, fridgeCount, fridgeCounts, fridgeCoversNight, fridgeRoom, fridgeUnits, moveAllToFridge } from '../engine/fridge.js';
import { isUnlocked } from '../engine/campaign.js';
import { formatQty } from '../engine/format.js';
import { invTab, state } from './store.js';
import { eatButton } from './energie.js';
import { applyResult } from './game-actions.js';
import { fridgeIcon } from './serre-verger-frigo.js';
import { pxText } from './pixel-art.js';
import { tel } from './consent.js';
import { morph } from './render.js';
import { stageUsable } from './stage.js';
import { closeModal, costLabel } from './common.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';

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

// Quantité d'un item qui périt à la prochaine nuit (lots à qui il reste 1 nuit).
function expiringTonight(item) {
  return lotsOf(state, item)
    .filter((l) => l.nightsLeft === 1)
    .reduce((t, l) => t + l.qty, 0);
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
        `<button type="button" class="subtab-btn${t.id === current ? ' active' : ''}" data-action="${action}" data-tab="${t.id}" aria-pressed="${t.id === current}" title="${t.label}"${t.court ? ` aria-label="${t.label}"` : ''}><span class="subtab-icon" aria-hidden="true">${t.icon}</span><span class="subtab-label">${t.court || t.label}</span></button>`
    )
    .join('')}</div>`;
}

/* -- Inventaire en cases (comme un sac de jeu vidéo) : le dessin de chaque objet, sa
   quantité en bas à droite, rien d'autre. Un appui ouvre sa fiche (manger, ranger au frigo,
   sortir du frigo). Les prix ne s'affichent qu'au Marché. -- */

function inventoryTabs() {
  // Lot 9 : l'onglet Frigo n'apparaît qu'avec le chapitre 6.
  return INVENTORY_TABS.filter((t) => t.id !== 'frigo' || isUnlocked(state, 'frigo'));
}

function currentTab() {
  const tabs = inventoryTabs();
  return tabs.find((t) => t.id === invTab) || tabs[0];
}

// Les onglets, en icônes seules (le nom est dans l'infobulle et pour les lecteurs d'écran).
export function inventoryTabsHtml() {
  const cur = currentTab().id;
  return `<div class="inv-tabs" role="group" aria-label="Sections de l'inventaire">${inventoryTabs()
    .map((t) => `<button type="button" class="inv-tab${t.id === cur ? ' active' : ''}" data-action="inv-tab" data-tab="${t.id}" aria-pressed="${t.id === cur}" title="${t.label}" aria-label="${t.label}"><span aria-hidden="true">${t.icon}</span></button>`)
    .join('')}</div>`;
}

// Une case : le dessin, la quantité (police pixel, en bas à droite), et un point rouge si
// une partie périt à la prochaine nuit. `lieu` : 'sac' (l'inventaire) ou 'frigo'.
function slotHtml(item, n, lieu) {
  const it = DATA.items[item];
  const soon = lieu === 'sac' && isPerishable(item) ? expiringTonight(item) : 0;
  const label = `${it.nom} : ${formatQty(n)}${lieu === 'frigo' ? ' au frais' : ''}${soon ? `, dont ${formatQty(soon)} ${soon > 1 ? 'périssent' : 'périt'} cette nuit` : ''}`;
  return `<button type="button" class="inv-slot${soon ? ' soon' : ''}" data-action="inv-item" data-item="${item}" data-lieu="${lieu}" title="${it.nom}" aria-label="${label}">` +
    `<span class="inv-slot-icon" aria-hidden="true">${it.icone}</span>` +
    `<span class="inv-slot-qty">${pxText(String(Math.round(n)), 'light')}</span>` +
    `${soon ? '<span class="inv-slot-soon" aria-hidden="true"></span>' : ''}</button>`;
}

// « Tout ranger » : un seul bouton pour mettre au frigo tous les aliments frais.
function fridgeAllButton(items) {
  if (!state.frigo.construit) return '';
  const n = items.filter(isFridgeable).reduce((t, k) => t + countItem(state, k), 0);
  if (n < 1) return '';
  const room = fridgeRoom(state);
  if (room < 1) return `<button type="button" class="btn inv-all" disabled>🧊 Frigo plein (${fridgeUnits(state)} / ${fridgeCapacity(state)})</button>`;
  return `<button type="button" class="btn primary inv-all" data-action="fridge-in-all">🧊 Tout ranger au frigo (${formatQty(Math.min(n, room))}${n > room ? ` sur ${formatQty(n)}` : ''})</button>`;
}

export function fridgeSlots() {
  const f = state.frigo;
  if (!f.construit) {
    return `<p class="hint">🧊 Pas encore de Réfrigérateur : construis-le ${stageUsable() ? 'dans les Installations (🏗️, dans le menu)' : 'dans l\'onglet Ferme'} (${costLabel(DATA.FRIGO.CONSTRUCTION)}). Les aliments qui y sont rangés ne vieillissent plus.</p>`;
  }
  const counts = fridgeCounts(state);
  const items = Object.keys(DATA.items).filter((k) => counts[k] > 0);
  const ok = fridgeIcon() === '❄️';
  return `
    <p class="inv-fridge${ok ? '' : ' warm'}" title="${ok ? 'Alimenté : la conservation est figée.' : 'Pas alimenté : chaque lot peut perdre une nuit.'}"><span aria-hidden="true">${fridgeIcon()}</span> <span class="num">${fridgeUnits(state)} / ${fridgeCapacity(state)}</span>${ok ? '' : ' · ⚠️ pas alimenté'}${!fridgeCoversNight(state) ? ' · ⚠️ la batterie ne couvrira pas la nuit' : ''}</p>
    ${items.length ? `<div class="inv-slots">${items.map((k) => slotHtml(k, counts[k], 'frigo')).join('')}</div>` : '<p class="hint">Le frigo est vide.</p>'}`;
}

// `fenetre` : dans la fenêtre flottante de la carte, les onglets sont dans son en-tête.
export function renderInventaire(fenetre = false) {
  const tab = currentTab();
  const head = fenetre ? '' : `<h2>📦 Inventaire</h2>${inventoryTabsHtml()}`;
  if (tab.id === 'frigo') return `${head}${fridgeSlots()}`;
  const items = Object.keys(DATA.items).filter((k) => tab.match(k) && countItem(state, k) > 0);
  return `${head}
    ${items.length ? `<div class="inv-slots">${items.map((k) => slotHtml(k, countItem(state, k), 'sac')).join('')}</div>` : `<p class="hint">${tab.empty}</p>`}
    ${tab.id === 'frais' ? fridgeAllButton(items) : ''}`;
}

/* -- Fiche d'un objet (fenêtre de dialogue, cadre bois) : ce qu'il est, et ce qu'on peut
   en faire selon l'onglet : manger, ranger au frigo (Frais) ; sortir du frigo (Frigo). -- */

let itemOpen = null; // { item, lieu }

function itemQty(o) {
  return o.lieu === 'frigo' ? fridgeCount(state, o.item) : countItem(state, o.item);
}

function itemBodyHtml(o) {
  const it = DATA.items[o.item];
  const n = itemQty(o);
  const nom = it.nom.toLowerCase();
  const lines = [];
  if (it.energie) lines.push(`🍽️ ${it.energie} cal${it.edible ? '' : ' (ingrédient)'}`);
  if (dishHappiness(o.item)) lines.push(`😊 +${dishHappiness(o.item)} bonheur`);
  if (o.lieu === 'sac' && isPerishable(o.item)) {
    const soon = expiringTonight(o.item);
    const lots = lotsOf(state, o.item).map((l) => `${formatQty(l.qty)} : encore ${nightsLabel(l.nightsLeft)}`).join(' · ');
    if (lots) lines.push(`⏳ ${lots}`);
    if (soon) lines.push(`⚠️ ${formatQty(soon)} ${soon > 1 ? 'périssent' : 'périt'} cette nuit`);
  }
  if (o.lieu === 'frigo') lines.push('🧊 Au frais : il ne vieillit pas tant que le frigo est alimenté.');
  if (o.item === DATA.SILO.ITEM && state.silo.construit) lines.push(`🛖 Silo : ${formatQty(state.silo.ble)}`);
  if (it.category === 'graine') lines.push('🌱 Se sème dans la Zone de culture.');
  let actions = '';
  if (o.lieu === 'frigo') {
    actions = `
      <button type="button" class="btn" data-action="fridge-out" data-item="${o.item}" data-qty="1">Sortir 1</button>
      <button type="button" class="btn" data-action="fridge-out" data-item="${o.item}" data-qty="all">Tout sortir</button>`;
  } else {
    if (it.edible) actions += eatButton(o.item, 'Manger');
    if (state.frigo.construit && isFridgeable(o.item)) {
      const off = fridgeRoom(state) < 1 ? ' disabled title="Le frigo est plein"' : '';
      actions += `
      <button type="button" class="btn" data-action="fridge-in" data-item="${o.item}" data-qty="1" aria-label="Ranger 1 ${nom} au frigo"${off}>🧊 Ranger 1</button>
      <button type="button" class="btn" data-action="fridge-in" data-item="${o.item}" data-qty="all" aria-label="Ranger tout ${nom} au frigo"${off}>🧊 Tout ranger</button>`;
    }
  }
  return `
    <div class="item-head">
      <span class="item-icon" aria-hidden="true">${it.icone}</span>
      <span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${o.lieu === 'frigo' ? 'Au frigo' : 'Quantité'} : ${formatQty(n)}</span></span>
    </div>
    ${lines.length ? `<ul class="item-lines">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
    ${actions ? `<div class="row item-actions">${actions}</div>` : ''}`;
}

function openItemModal(item, lieu) {
  if (!DATA.items[item]) return;
  itemOpen = { item, lieu: lieu === 'frigo' ? 'frigo' : 'sac' };
  tel('modal', 'item');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal bois item-modal" role="dialog" aria-modal="true" aria-labelledby="item-title" data-stop-propagation>
        <div class="item-body"></div>
        <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>
      </div>
    </div>`;
  renderItemModal();
}

// Appelé à chaque rendu : la fiche suit le jeu ; elle se ferme quand l'objet n'est plus là.
export function renderItemModal() {
  const body = document.querySelector('#modal-root .item-modal .item-body');
  if (!body || !itemOpen) return;
  if (itemQty(itemOpen) <= 0) {
    itemOpen = null;
    closeModal();
    return;
  }
  morph(body, itemBodyHtml(itemOpen));
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'inv-item': (target) => {
    openItemModal(target.dataset.item, target.dataset.lieu);
  },
  'fridge-in-all': () => {
    const result = applyResult(moveAllToFridge(state));
    if (result.ok) showToast(`🧊 Rangé au frigo : ${itemsSummary(result.items)}${result.reste ? ` · frigo plein, ${formatQty(result.reste)} restent dehors` : ''}`);
  },
});
