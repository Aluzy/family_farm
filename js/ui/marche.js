import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount } from '../engine/fridge.js';
import {
  buyItem, buyPrice, buyQuote, isBuyable, marketCoef, sellableCount, sellItem,
} from '../engine/market.js';
import { hasHoe, isGraineComptoir, seedItem } from '../engine/crops.js';
import {
  animalBuyMax, animalPrice, buyAnimals, coopCapacity, cowCapacity, cowCount, freeCowPlaces,
  freeSheepPlaces, pastureCapacity, pastureCost, sheepCount,
} from '../engine/animals.js';
import { isUnlocked } from '../engine/campaign.js';
import { formatCoins, formatNumber, formatQty } from '../engine/format.js';
import { animalQuantities, BUY_MAX, buyQuantities, comptoirTab, sellQuantities, state } from './store.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { coopShown, herdShown } from './stage-windows.js';
import { formatPlaces, formatStraw } from './elevage.js';
import { subtabsHtml } from './inventaire.js';
import { showToast } from './toasts.js';
import { registerActions, sameHandler } from './actions.js';
import { canPay, costLabel } from './common.js';

/* ---------- Marché ---------- */

// Version 1.1.1 : les animaux s'achètent de nouveau au Marché (onglet Animaux, dès que le
// Poulailler ou l'Étable existe dans la partie) ; l'Étable y mène par un raccourci. Les
// arbres se plantent au Verger (version 1.13 : appui sur un emplacement libre).
const COMPTOIR_TABS = [
  { id: 'vendre', label: 'Vendre', icon: '💰', ok: () => true },
  { id: 'acheter', label: 'Acheter', icon: '🛒', ok: () => true },
  { id: 'graines', label: 'Graines', icon: '🌱', ok: () => true },
  { id: 'animaux', label: 'Animaux', icon: '🐔', ok: () => isUnlocked(state, 'poulailler') || isUnlocked(state, 'moutons') || coopShown() || herdShown() },
];

// Quantité choisie pour un achat : entre 1 et ce que les pièces permettent (au moins 1,
// pour que la ligne reste lisible même sans pièces).
function buyQuantity(item) {
  const max = Math.max(1, buyQuote(state, item, BUY_MAX).quantite);
  return Math.max(1, Math.min(max, buyQuantities[item] || 1));
}

function animalQuantity(kind) {
  const max = Math.max(1, Math.min(BUY_MAX, animalBuyMax(state, kind)));
  return Math.max(1, Math.min(max, animalQuantities[kind] || 1));
}

// Les trois boutons de quantité (−, +, Max) d'une ligne d'achat.
function qtyButtons(action, attr, q, max, nom) {
  return `
        <button type="button" class="btn step-btn" data-action="${action}-dec" ${attr} aria-label="Acheter ${nom} de moins"${q <= 1 ? ' disabled' : ''}>−</button>
        <strong class="num qty">${q}</strong>
        <button type="button" class="btn step-btn" data-action="${action}-inc" ${attr} aria-label="Acheter ${nom} de plus"${q >= max ? ' disabled' : ''}>+</button>
        <button type="button" class="btn" data-action="${action}-max" ${attr} title="La plus grande quantité possible"${q >= max ? ' disabled' : ''}>Max</button>`;
}

// Seules les unités entières se vendent (un demi-blé reste en stock).
function sellableStock(item) {
  return Math.floor(sellableCount(state, item) + EPS);
}

// Quantité choisie pour la vente, toujours entre 1 et le stock.
function sellQuantity(item) {
  const stock = sellableStock(item);
  return Math.max(1, Math.min(stock, sellQuantities[item] || 1));
}

function sellRow(item) {
  const it = DATA.items[item];
  const stock = sellableStock(item);
  const q = sellQuantity(item);
  return `
    <div class="shop-row">
      <div class="inv-main"><span><span aria-hidden="true">${it.icone}</span> ${it.nom}</span><span class="muted">En stock : <span class="num">${formatQty(sellableCount(state, item))}</span>${fridgeCount(state, item) > 0 ? ` <span class="chip">❄️ dont ${formatQty(fridgeCount(state, item))} au frigo</span>` : ''}</span></div>
      <span class="muted">Prix de vente : <strong class="num">${formatCoins(it.prix)} 💰</strong> l'unité (fixe)</span>
      <div class="row qty-row">
        <button type="button" class="btn step-btn" data-action="sell-dec" data-item="${item}" aria-label="Vendre une unité de moins"${q <= 1 ? ' disabled' : ''}>−</button>
        <strong class="num qty">${q}</strong>
        <button type="button" class="btn step-btn" data-action="sell-inc" data-item="${item}" aria-label="Vendre une unité de plus"${q >= stock ? ' disabled' : ''}>+</button>
        <button type="button" class="btn" data-action="sell-max" data-item="${item}"${q >= stock ? ' disabled' : ''}>Tout</button>
        <button type="button" class="btn primary sell-go" data-action="sell-item" data-item="${item}">Vendre ${q} (+${formatCoins(q * it.prix)} 💰)</button>
      </div>
    </div>`;
}

// Version 1.1.1 : on choisit la quantité. Le total affiché est le vrai prix : il tient
// compte de la hausse du prix à chaque unité (buyQuote).
function buyRow(item) {
  const it = DATA.items[item];
  const price = buyPrice(state, item);
  const coef = marketCoef(state, item);
  const max = buyQuote(state, item, BUY_MAX).quantite;
  const q = buyQuantity(item);
  const total = max > 0 ? buyQuote(state, item, q).cout : price;
  return `
    <div class="shop-row">
      <div class="inv-main"><span><span aria-hidden="true">${it.icone}</span> ${it.nom}</span><span class="muted">En stock : <span class="num">${formatQty(countItem(state, item))}</span></span></div>
      <span class="muted">Prochaine unité : <strong class="num">${formatCoins(price)} 💰</strong> · coefficient <span class="num">${formatNumber(coef)} %</span> · vente ${formatCoins(it.prix)} 💰</span>
      <div class="row qty-row">${qtyButtons('buy', `data-item="${item}"`, q, max, 'une unité')}
        <button type="button" class="btn primary sell-go" data-action="buy-item" data-item="${item}"${max > 0 ? '' : ' disabled'}>Acheter ${q} (−${formatCoins(total)} 💰)</button>
      </div>
    </div>`;
}

// Quantité et bouton d'achat d'un animal (prix fixe : le total est q × prix).
function animalBuyHtml(kind, ok, libelle) {
  const price = animalPrice(kind);
  const max = ok ? Math.min(BUY_MAX, animalBuyMax(state, kind)) : 0;
  const q = animalQuantity(kind);
  return `
      <div class="row qty-row">${qtyButtons('animal', `data-kind="${kind}"`, q, max, 'un animal')}
        <button type="button" class="btn primary sell-go" data-action="buy-animal" data-kind="${kind}"${max > 0 ? '' : ' disabled'}>Acheter ${q} ${libelle}${q > 1 ? 's' : ''} (−${formatCoins(q * price)} 💰)</button>
      </div>`;
}

// Achat des animaux (au Marché, onglet Animaux) : la poule, le mouton et la vache, à prix
// fixe et sans revente. Grisés s'il n'y a plus de place, ou si leur logement n'existe pas.
function renderHenRow() {
  const def = DATA.ANIMAUX.poule;
  const p = state.poulailler;
  const cap = coopCapacity(state);
  const price = animalPrice('poule');
  let note;
  let ok = true;
  if (!p.construit) {
    note = '⚠️ Construis d\'abord le Poulailler (à l\'Étable, sur la carte).';
    ok = false;
  } else if (p.poules >= cap) {
    note = '⚠️ Le Poulailler est plein : agrandis-le pour accueillir d\'autres poules.';
    ok = false;
  } else {
    note = `Places libres : ${cap - p.poules}.`;
  }
  return `
    <div class="shop-row${ok ? '' : ' unavailable'}">
      <div class="inv-main"><span><span aria-hidden="true">${def.icone}</span> ${def.nom}</span><span class="muted">Poules : <span class="num">${p.poules} / ${cap}</span></span></div>
      <span class="muted">Prix fixe : <strong class="num">${formatCoins(price)} 💰</strong> · 1 blé nourrit ${def.poulesParBle} poules pour la nuit · pond 1 œuf par nuit si nourrie, toute sa vie.</span>
      <span class="muted">${note}</span>
      ${animalBuyHtml('poule', ok, 'poule')}
    </div>`;
}

function renderSheepRow() {
  const def = DATA.ANIMAUX.mouton;
  const p = state.paturage;
  const cap = pastureCapacity(state);
  const price = animalPrice('mouton');
  let note;
  let ok = true;
  if (!p.construit) {
    note = '⚠️ Prépare d\'abord l\'Étable pour les moutons et les vaches.';
    ok = false;
  } else if (freeSheepPlaces(state) <= 0) {
    note = `⚠️ L'Étable est pleine : achète une place de plus (${costLabel(pastureCost(state))}).`;
    ok = false;
  } else {
    note = `Places libres : ${freeSheepPlaces(state)}.`;
  }
  return `
    <div class="shop-row${ok ? '' : ' unavailable'}">
      <div class="inv-main"><span><span aria-hidden="true">${def.icone}</span> ${def.nom}</span><span class="muted">Moutons : <span class="num">${sheepCount(state)} / ${cap}</span></span></div>
      <span class="muted">Prix fixe : <strong class="num">${formatCoins(price)} 💰</strong> · prend ${formatPlaces(DATA.PATURAGE.placesParMouton)} · mange ${formatStraw(def.pailleParNuit)} par nuit · ${def.laineParTonte} laine toutes les ${def.joursLaine} nuits nourri.</span>
      <span class="muted">${note}</span>
      ${animalBuyHtml('mouton', ok, 'mouton')}
    </div>`;
}

// La vache, sur le modèle de renderSheepRow(). Disponible dès le même chapitre
// que le mouton (« Le troupeau ») : elle partage les places de l'Étable.
function renderCowRow() {
  const def = DATA.ANIMAUX.vache;
  const p = state.paturage;
  const cap = cowCapacity(state);
  const price = animalPrice('vache');
  let note;
  let ok = true;
  if (!p.construit) {
    note = '⚠️ Prépare d\'abord l\'Étable pour les moutons et les vaches.';
    ok = false;
  } else if (freeCowPlaces(state) <= 0) {
    note = `⚠️ Pas assez de place pour une vache (il lui faut ${formatPlaces(DATA.PATURAGE.placesParVache)} libres) : achète des places (${costLabel(pastureCost(state))} la prochaine).`;
    ok = false;
  } else {
    note = `Places libres : ${freeCowPlaces(state)}.`;
  }
  return `
    <div class="shop-row${ok ? '' : ' unavailable'}">
      <div class="inv-main"><span><span aria-hidden="true">${def.icone}</span> ${def.nom}</span><span class="muted">Vaches : <span class="num">${cowCount(state)} / ${cap}</span></span></div>
      <span class="muted">Prix fixe : <strong class="num">${formatCoins(price)} 💰</strong> · prend ${formatPlaces(DATA.PATURAGE.placesParVache)} · mange ${formatStraw(def.pailleParNuit)} par nuit · ${def.laitParNuit} lait chaque nuit où elle a mangé.</span>
      <span class="muted">${note}</span>
      ${animalBuyHtml('vache', ok, 'vache')}
    </div>`;
}

// Lignes d'achat des animaux (onglet Animaux du Marché).
function renderAnimaux(especes = ['poule', 'mouton', 'vache']) {
  const lignes = {
    poule: () => (coopShown() ? renderHenRow() : ''),
    mouton: () => (isUnlocked(state, 'moutons') || herdShown() ? renderSheepRow() : ''),
    vache: () => (isUnlocked(state, 'moutons') || herdShown() ? renderCowRow() : ''),
  };
  const html = especes.map((e) => lignes[e]()).join('');
  if (!html) return '';
  return `
    <p class="muted">Prix fixe, quel que soit leur nombre. Un animal ne se revend pas. Les poules, les moutons et les vaches vivent à l'Étable.</p>
    ${html}`;
}

// Une graine dont la culture n'est pas encore débloquée (tournesol) n'est pas en vente.
function seedForSale(item) {
  return !Object.keys(DATA.crops).some((c) => seedItem(c) === item && !isUnlocked(state, c));
}

// Version 1.9 : la houe, outil acheté une seule fois (en tête de l'onglet Acheter).
function hoeShopRow() {
  const H = DATA.HOUE;
  const owned = hasHoe(state);
  return `
    <div class="card row-card">
      <span><span aria-hidden="true">${H.ICONE}</span> <strong>${H.NOM}</strong> <span class="muted">· change l'herbe de la carte en terre à cultiver</span></span>
      ${owned ? '<span class="chip auto">Déjà achetée</span>' : `<button type="button" class="btn" data-action="buy-hoe"${canPay(H.PRIX) ? '' : ' disabled'}>Acheter (${formatCoins(H.PRIX)} 💰)</button>`}
    </div>`;
}

export function renderComptoir() {
  const tabs = COMPTOIR_TABS.filter((t) => t.ok());
  const tab = tabs.find((t) => t.id === comptoirTab) || tabs[0];
  let body;
  if (tab.id === 'vendre') {
    const items = Object.keys(DATA.items).filter((k) => sellableCount(state, k) > 0);
    body = `
      <p class="muted">Prix de vente fixes. Les articles rangés au frigo se vendent aussi (l'inventaire part en premier). Chaque unité vendue baisse de ${formatNumber(DATA.MARCHE.PAS)} points le coefficient d'achat de l'objet, sans passer sous son plancher.</p>
      ${items.length ? items.map(sellRow).join('') : '<p class="hint">Tu n\'as rien à vendre pour l\'instant.</p>'}`;
  } else if (tab.id === 'acheter') {
    const items = Object.keys(DATA.items).filter((k) => isBuyable(k) && DATA.items[k].category !== 'graine');
    body = `
      ${hoeShopRow()}
      <p class="muted">Prix d'achat = prix de vente × coefficient, arrondi à l'entier supérieur. Chaque unité achetée ajoute ${formatNumber(DATA.MARCHE.PAS)} points au coefficient, et il ne redescend qu'à la vente : le Marché dépanne, il ne nourrit pas la ferme. Les conserves ne s'achètent pas.</p>
      ${items.map(buyRow).join('')}`;
  } else if (tab.id === 'animaux') {
    body = renderAnimaux();
  } else {
    const items = Object.keys(DATA.items).filter((k) => isBuyable(k) && isGraineComptoir(k) && seedForSale(k));
    body = `
      <p class="muted"><span class="chip badge">dépannage</span> Les graines s'achètent au prix majoré : coefficient de départ et plancher à ${formatNumber(DATA.MARCHE.PLANCHER.graine)} %. Produire tes propres graines reste plus rentable. Le blé fait exception : c'est aussi la ressource du Silo, du Moulin et des poules, donc il garde son prix habituel (plancher ${formatNumber(DATA.MARCHE.PLANCHER.defaut)} %) et reste également listé dans l'onglet Acheter.</p>
      ${items.map(buyRow).join('')}`;
  }
  return `
    <h2>🧺 Marché</h2>
    ${subtabsHtml(tabs, tab.id, 'comptoir-tab')}
    ${body}`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'buy-animal': (target) => {
    const kind = target.dataset.kind;
    const result = applyResult(buyAnimals(state, kind, animalQuantity(kind)));
    if (result.ok) {
      animalQuantities[kind] = 1;
      showToast(`Acheté : ${result.bought} ${DATA.ANIMAUX[kind].icone} (−${formatCoins(result.cost)} 💰)`);
      refresh();
    }
  },
  ...sameHandler(['animal-dec', 'animal-inc', 'animal-max'], (target, e, action) => {
    const kind = target.dataset.kind;
    animalQuantities[kind] = action === 'animal-max' ? Math.min(BUY_MAX, animalBuyMax(state, kind)) : animalQuantity(kind) + (action === 'animal-inc' ? 1 : -1);
    refresh();
  }),
  'buy-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(buyItem(state, item, buyQuantity(item)));
    if (result.ok) {
      buyQuantities[item] = 1;
      showToast(`Acheté : ${result.bought} ${DATA.items[item].icone} (−${formatCoins(result.cost)} 💰)`);
      refresh();
    }
  },
  ...sameHandler(['buy-dec', 'buy-inc', 'buy-max'], (target, e, action) => {
    const item = target.dataset.item;
    buyQuantities[item] = action === 'buy-max' ? buyQuote(state, item, BUY_MAX).quantite : buyQuantity(item) + (action === 'buy-inc' ? 1 : -1);
    refresh();
  }),
  ...sameHandler(['sell-dec', 'sell-inc', 'sell-max'], (target, e, action) => {
    const item = target.dataset.item;
    const now = sellQuantity(item);
    sellQuantities[item] = action === 'sell-max' ? sellableStock(item) : now + (action === 'sell-inc' ? 1 : -1);
    refresh();
  }),
  'sell-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(sellItem(state, item, sellQuantity(item)));
    if (result.ok) showToast(`Vendu : ${result.sold} ${DATA.items[item].icone} (+${formatCoins(result.gain)} 💰)`);
  },
});
