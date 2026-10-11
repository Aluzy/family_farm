import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount } from '../engine/fridge.js';
import {
  buyItem, buyPrice, buyQuote, isBuyable, marketCoef, sellableCount, sellItem,
} from '../engine/market.js';
import { hasHoe, isGraineComptoir, seedItem, seedStock } from '../engine/crops.js';
import {
  animalBuyMax, animalPrice, buyAnimals, coopCapacity, cowCapacity, cowCount, freeCowPlaces,
  freeSheepPlaces, pastureCapacity, pastureCost, sheepCount,
} from '../engine/animals.js';
import { isUnlocked, plantableCropsFor } from '../engine/campaign.js';
import { formatCoins, formatNumber, formatQty } from '../engine/format.js';
import { animalQuantities, BUY_MAX, comptoirTab, comptoirTabChoisi, state } from './store.js';
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

// Quantité d'animaux choisie : entre 1 et ce que les pièces et les places permettent.
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

// FLU-13 : onglet du Marché à l'ouverture, quand aucun n'est demandé : Acheter tant que la
// houe manque ; Graines si une parcelle est vide et qu'aucune graine n'est en stock ; sinon
// le dernier onglet choisi par le joueur.
export function comptoirTabAOuvrir() {
  if (!hasHoe(state)) return 'acheter';
  const vide = state.potager.parcelles.some((p) => !p.culture);
  const graines = plantableCropsFor(state, DATA.POTAGER.LIEU).some((c) => seedStock(state, c) >= 1);
  if (vide && !graines) return 'graines';
  return comptoirTabChoisi;
}

// FLU-14 : une ligne par article, des boutons de lot (×1, ×5, Tout) au lieu de − / + / Max.
function sellRow(item) {
  const it = DATA.items[item];
  const stock = sellableStock(item);
  const lot = (q, txt) => `<button type="button" class="btn lot-btn" data-action="sell-item" data-item="${item}" data-q="${q}" aria-label="Vendre ${q} ${it.nom.toLowerCase()} (+${formatCoins(q * it.prix)} 💰)"${q <= stock ? '' : ' disabled'}>${txt}</button>`;
  return `
    <div class="shop-row lot-row">
      <span class="lot-name"><span aria-hidden="true">${it.icone}</span> ${it.nom} <span class="muted">· <span class="num">${formatQty(sellableCount(state, item))}</span>${fridgeCount(state, item) > 0 ? ' ❄️' : ''}</span></span>
      <span class="lot-price num">${formatCoins(it.prix)} 💰</span>
      <span class="lot-btns">${stock >= 1 ? lot(1, '×1') : ''}${stock >= 5 ? lot(5, '×5') : ''}${stock >= 1 ? lot(stock, `Tout (${stock})`) : ''}</span>
    </div>`;
}

// Version 1.1.1 / FLU-14 : achat par lot (×1, ×5, ×10). Le prix monte à chaque unité : le
// total de chaque lot est le vrai prix (buyQuote), dans l'infobulle et pour les lecteurs d'écran.
function buyRow(item) {
  const it = DATA.items[item];
  const price = buyPrice(state, item);
  const lot = (q) => {
    const quote = buyQuote(state, item, q);
    const ok = quote.quantite >= q;
    const cout = ok ? quote.cout : buyQuote(state, item, q).cout;
    return `<button type="button" class="btn lot-btn" data-action="buy-item" data-item="${item}" data-q="${q}" aria-label="Acheter ${q} ${it.nom.toLowerCase()}${ok ? ` (−${formatCoins(cout)} 💰)` : ' : pas assez de pièces'}" title="${ok ? `−${formatCoins(cout)} 💰` : 'Pas assez de pièces'}"${ok ? '' : ' disabled'}>×${q}</button>`;
  };
  return `
    <div class="shop-row lot-row">
      <span class="lot-name"><span aria-hidden="true">${it.icone}</span> ${it.nom} <span class="muted">· <span class="num">${formatQty(countItem(state, item))}</span></span></span>
      <span class="lot-price num">${formatCoins(price)} 💰</span>
      <span class="lot-btns">${lot(1)}${lot(5)}${lot(10)}</span>
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

// FLU-25 : l'économie du Marché (coefficients, planchers) est derrière un bouton « ? ».
function marketHelp(texte) {
  return `<details class="more market-help"><summary><span class="help-q" aria-hidden="true">?</span> Comment les prix changent</summary><p class="muted">${texte}</p></details>`;
}

export function renderComptoir() {
  const tabs = COMPTOIR_TABS.filter((t) => t.ok());
  const tab = tabs.find((t) => t.id === comptoirTab) || tabs[0];
  let body;
  if (tab.id === 'vendre') {
    const items = Object.keys(DATA.items).filter((k) => sellableCount(state, k) > 0);
    body = `
      <p class="muted">Les articles rangés au frigo se vendent aussi.</p>
      ${marketHelp(`Prix de vente fixes. L'inventaire part en premier, puis le frigo. Chaque unité vendue baisse de ${formatNumber(DATA.MARCHE.PAS)} points le coefficient d'achat de l'objet, sans passer sous son plancher.`)}
      ${items.length ? items.map(sellRow).join('') : '<p class="hint">Tu n\'as rien à vendre pour l\'instant.</p>'}`;
  } else if (tab.id === 'acheter') {
    const items = Object.keys(DATA.items).filter((k) => isBuyable(k) && DATA.items[k].category !== 'graine');
    // FLU-01 : la puce d'objectif « Acheter une houe » mène ici ; le chapitre reste à une touche
    const chapitre = !hasHoe(state) ? '<p class="row"><button type="button" class="btn small" data-action="aller" data-window="chapitres">📜 Voir le chapitre</button></p>' : '';
    body = `
      ${chapitre}${hoeShopRow()}
      ${marketHelp(`Prix d'achat = prix de vente × coefficient, arrondi à l'entier supérieur. Chaque unité achetée ajoute ${formatNumber(DATA.MARCHE.PAS)} points au coefficient, et il ne redescend qu'à la vente : le Marché dépanne, il ne nourrit pas la ferme. Les conserves ne s'achètent pas.`)}
      ${items.map(buyRow).join('')}`;
  } else if (tab.id === 'animaux') {
    body = renderAnimaux();
  } else {
    const items = Object.keys(DATA.items).filter((k) => isBuyable(k) && isGraineComptoir(k) && seedForSale(k));
    body = `
      <p class="muted"><span class="chip badge">dépannage</span> Les graines coûtent cher : produire les tiennes reste plus rentable.</p>
      ${marketHelp(`Les graines s'achètent au prix majoré : coefficient de départ et plancher à ${formatNumber(DATA.MARCHE.PLANCHER.graine)} %. Le blé, la patate et les autres cultures qui se plantent d'elles-mêmes (on plante une patate pour en récolter d'autres) gardent leur prix habituel (plancher ${formatNumber(DATA.MARCHE.PLANCHER.defaut)} %) et restent aussi dans l'onglet Acheter.`)}
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
    const result = applyResult(buyItem(state, item, Math.max(1, Number(target.dataset.q) || 1)));
    if (result.ok) {
      showToast(`Acheté : ${result.bought} ${DATA.items[item].icone} (−${formatCoins(result.cost)} 💰)`);
      refresh();
    }
  },
  'sell-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(sellItem(state, item, Math.max(1, Number(target.dataset.q) || 1)));
    if (result.ok) showToast(`Vendu : ${result.sold} ${DATA.items[item].icone} (+${formatCoins(result.gain)} 💰)`);
  },
});
