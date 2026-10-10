import { DATA } from '../engine/catalog.js';
import { countItem, expiringSoon, isFridgeable, isPerishable, lotsOf } from '../engine/inventory.js';
import { moveAllToFridge } from '../engine/fridge.js';
import { isUnlocked } from '../engine/campaign.js';
import { formatCoins, formatQty } from '../engine/format.js';
import { invTab, state } from './store.js';
import { eatButton } from './energie.js';
import { applyResult } from './game-actions.js';
import { renderFridgeTab } from './serre-verger-frigo.js';
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

// Lot 8 : boutons pour ranger un aliment au frigo (s'il est construit). Le blé
// n'y va pas : il se garde au Silo.
function fridgeInButtons(item) {
  if (!state.frigo.construit || !isFridgeable(item) || countItem(state, item) < 1) return '';
  const nom = DATA.items[item].nom.toLowerCase();
  return `
        <button type="button" class="btn" data-action="fridge-in" data-item="${item}" data-qty="1" aria-label="Ranger 1 ${nom} au frigo">🧊 1</button>
        <button type="button" class="btn" data-action="fridge-in" data-item="${item}" data-qty="all" aria-label="Ranger tout ${nom} au frigo">🧊 Tout</button>`;
}

// Boutons d'une case : manger (version 1.8, un aliment) et ranger au frigo.
function itemButtons(item) {
  return `${DATA.items[item].edible ? eatButton(item) : ''}${fridgeInButtons(item)}`;
}

// Une case a-t-elle une ligne d'état : ce qui périt cette nuit, ou le blé du Silo ?
function hasStatus(item) {
  return (isPerishable(item) && expiringTonight(item) > 0) || (item === DATA.SILO.ITEM && state.silo.construit);
}

// Une case de l'inventaire : en haut, l'icône dans son cadre et, à sa droite,
// « Tomate x3 » puis les calories et le prix ; dessous, une ligne d'état (ce qui
// périt cette nuit, ou le blé du Silo) et les boutons du frigo.
// Deux cases côte à côte ont les mêmes lignes, vides au besoin, pour garder la
// même taille et le même alignement ; la ligne d'état disparaît quand aucune des
// deux n'en a besoin (withStatus).
function inventoryCard(item, withActions, withStatus) {
  const it = DATA.items[item];
  const n = countItem(state, item);
  const soon = isPerishable(item) ? expiringTonight(item) : 0;
  const info = [
    it.energie && it.edible ? `🍽️ ${it.energie} cal` : '',
    it.energie && !it.edible ? `Ingrédient 🍽️ ${it.energie} cal` : '',
    `💰 ${formatCoins(it.prix)}`,
  ].filter(Boolean).join(' · ');
  let status = '';
  if (withStatus && soon > 0) {
    status = `<span class="inv-soon" title="${soon} ${unitLabel(item, soon)} ${soon > 1 ? 'périssent' : 'périt'} à la prochaine nuit"><span aria-hidden="true">⚠️</span> <span class="num">${formatQty(soon)}</span> ce soir</span>`;
  } else if (item === DATA.SILO.ITEM && state.silo.construit) {
    status = `<span class="muted">🛖 Silo : <span class="num">${formatQty(state.silo.ble)}</span></span>`;
  }
  return `
    <div class="inv-card${soon > 0 ? ' soon' : ''}">
      <div class="inv-head">
        <span class="inv-icon" aria-hidden="true">${it.icone}</span>
        <span class="inv-text">
          <span class="inv-name"><span class="inv-nom">${it.nom}</span> <span class="inv-qty num" aria-label="quantité ${formatQty(n)}">x${formatQty(n)}</span></span>
          <span class="inv-info muted">${info}</span>
        </span>
      </div>
      ${withStatus ? `<span class="inv-status">${status}</span>` : ''}
      ${withActions ? `<span class="inv-actions">${itemButtons(item)}</span>` : ''}
    </div>`;
}

// « Tout ranger » : un seul bouton pour mettre au frigo tous les aliments frais.
function fridgeAllButton(items) {
  if (!state.frigo.construit) return '';
  const n = items.filter(isFridgeable).reduce((t, k) => t + countItem(state, k), 0);
  if (n < 1) return '';
  return `<button type="button" class="btn primary inv-all" data-action="fridge-in-all">🧊 Tout ranger au frigo (${formatQty(n)})</button>`;
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

// La ligne d'état d'une case existe si elle-même ou sa voisine de rangée (deux
// cases par rangée) en a une.
function rowHasStatus(items, i) {
  const first = i - (i % 2);
  return items.slice(first, first + 2).some(hasStatus);
}

// Ajuste une ligne trop longue pour sa case : sa police est réduite juste
// assez pour qu'elle tienne en entier (comme fitIndicators pour le bandeau).
// Renvoie la taille retenue, en px.
const FIT_MIN_PX = 7;
function fitLine(el) {
  el.style.fontSize = '';
  let size = parseFloat(getComputedStyle(el).fontSize) || 15;
  for (let pass = 0; pass < 4 && el.scrollWidth > el.clientWidth && size > FIT_MIN_PX; pass++) {
    size = Math.max(FIT_MIN_PX, Math.floor(((size * el.clientWidth) / el.scrollWidth) * 10) / 10 - (pass ? 0.2 : 0));
    el.style.fontSize = `${size}px`;
  }
  return size;
}

// Appelé après chaque rendu (la taille dépend de la largeur réelle des cases).
// Les noms d'une même grille ont tous la même taille : celle du nom qui doit
// être le plus réduit pour tenir. Les lignes énergie · prix s'ajustent une à une.
export function fitInventoryNames(root = document) {
  for (const grid of root.querySelectorAll('.inv-grid')) {
    const names = [...grid.querySelectorAll('.inv-name')];
    const size = Math.min(...names.map(fitLine));
    for (const el of names) el.style.fontSize = `${size}px`;
    for (const el of grid.querySelectorAll('.inv-info')) fitLine(el);
  }
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
  const items = Object.keys(DATA.items).filter((k) => tab.match(k) && countItem(state, k) > 0);
  const soon = Object.keys(expiringSoon(state)).length > 0 && tab.id === 'frais';
  // La ligne des boutons n'existe que si au moins une case en a.
  const withActions = items.some((k) => itemButtons(k) !== '');
  return `
    <h2>📦 Inventaire</h2>
    ${subtabsHtml(tabs, tab.id, 'inv-tab')}
    ${soon ? '<p class="alert">⚠️ Une partie de tes aliments périt à la prochaine nuit.</p>' : ''}
    ${items.length ? `<div class="inv-grid">${items.map((k, i) => inventoryCard(k, withActions, rowHasStatus(items, i))).join('')}</div>` : `<p class="hint">${tab.empty}</p>`}
    ${tab.id === 'frais' ? fridgeAllButton(items) : ''}`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'fridge-in-all': () => {
    const result = applyResult(moveAllToFridge(state));
    if (result.ok) showToast(`🧊 Rangé au frigo : ${itemsSummary(result.items)}`);
  },
});
