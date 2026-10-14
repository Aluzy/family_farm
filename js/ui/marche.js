import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount } from '../engine/fridge.js';
import {
  buyItem, buyPrice, buyQuote, isBuyable, sellableCount, sellItem,
} from '../engine/market.js';
import { hasHoe, isGraineComptoir, seedItem, seedStock } from '../engine/crops.js';
import { hasTool, toolDef } from '../engine/outils.js';
import {
  animalBuyMax, animalPrice, buyAnimals, coopCapacity, cowCapacity, cowCount, freeCowPlaces,
  freeSheepPlaces, pastureCapacity, pastureCost, sheepCount,
} from '../engine/animals.js';
import { isUnlocked, plantableCropsFor } from '../engine/campaign.js';
import { buyFurniture, furnitureCount, furnitureMax } from '../engine/meubles.js';
import { houseRepaired } from '../engine/depart.js';
import { formatCoins, formatNumber, formatQty } from '../engine/format.js';
import { BUY_MAX, comptoirTab, comptoirTabChoisi, state } from './store.js';
import { applyResult } from './game-actions.js';
import { coopShown, herdShown } from './stage-windows.js';
import { formatPlaces, formatStraw } from './elevage.js';
import { pxText } from './pixel-art.js';
import { tel } from './consent.js';
import { morph, refresh } from './render.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, closeModal, costLabel } from './common.js';

/* ---------- Marché ---------- */

// Version 1.1.1 : les animaux s'achètent de nouveau au Marché (onglet Animaux, dès que le
// Poulailler ou l'Étable existe dans la partie) ; l'Étable y mène par un raccourci. Les
// arbres se plantent au Verger (version 1.13 : appui sur un emplacement libre).
const COMPTOIR_TABS = [
  { id: 'vendre', label: 'Vendre', icon: '💰', ok: () => true },
  { id: 'acheter', label: 'Acheter', icon: '🛒', ok: () => true },
  { id: 'graines', label: 'Graines', icon: '🌱', ok: () => true },
  { id: 'animaux', label: 'Animaux', icon: '🐔', ok: () => isUnlocked(state, 'poulailler') || isUnlocked(state, 'moutons') || coopShown() || herdShown() },
  // Meubles de la maison (data/meubles.json) : l'onglet porte le dessin du canapé
  { id: 'meubles', label: 'Meubles', icon: '🛋️', img: 'canape', ok: () => true },
];

// Dessin d'un meuble (assets/meuble_<id>.png), avec l'empreinte du fichier sur le site en ligne.
function meubleSrc(id) {
  const file = `meuble_${id}.png`;
  const versions = window.FERME_ASSET_VERSIONS;
  return `assets/${file}${versions && versions[file] ? `?v=${versions[file]}` : ''}`;
}

function meubleImg(id, cls = 'meuble-img') {
  return `<img class="${cls}" src="${meubleSrc(id)}" alt="" draggable="false">`;
}

const PIECES = { cuisine: 'la cuisine', salon: 'le salon', chambre: 'la chambre' };

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

/* -- Le Marché en cases, comme l'Inventaire : le dessin de l'article, son prix en haut à
   gauche, la quantité en bas à droite (en stock ; pour un animal, combien on en a sur
   combien de places). Un appui ouvre la fiche de l'article : ses infos et les boutons de
   lot (×1, ×5, ×10 ou Tout), chacun avec son total. -- */

function marketTabs() {
  return COMPTOIR_TABS.filter((t) => t.ok());
}

function currentTab() {
  const tabs = marketTabs();
  return tabs.find((t) => t.id === comptoirTab) || tabs[0];
}

// Explication de chaque onglet, derrière le bouton « ? » (FLU-25).
function helpText(tab) {
  if (tab === 'vendre') return `Les articles rangés au frigo se vendent aussi. Prix de vente fixes : l'inventaire part en premier, puis le frigo. Chaque unité vendue baisse de ${formatNumber(DATA.MARCHE.PAS)} points le coefficient d'achat de l'objet, sans passer sous son plancher.`;
  if (tab === 'acheter') return `Prix d'achat = prix de vente × coefficient, arrondi à l'entier supérieur. Chaque unité achetée ajoute ${formatNumber(DATA.MARCHE.PAS)} points au coefficient, et il ne redescend qu'à la vente : le Marché dépanne, il ne nourrit pas la ferme. Les conserves ne s'achètent pas. La houe, elle, s'achète une seule fois.`;
  if (tab === 'graines') return `Dépannage : les graines coûtent cher, produire les tiennes reste plus rentable. Elles s'achètent au prix majoré : coefficient de départ et plancher à ${formatNumber(DATA.MARCHE.PLANCHER.graine)} %. Le blé, la patate et les autres cultures qui se plantent d'elles-mêmes (on plante une patate pour en récolter d'autres) gardent leur prix habituel (plancher ${formatNumber(DATA.MARCHE.PLANCHER.defaut)} %) et restent dans l'onglet Acheter.`;
  if (tab === 'meubles') return 'Les meubles s\'installent dans la maison, chacun à sa place : la cuisine, le salon ou la chambre. À l\'achat, ils donnent un peu de bonheur à chaque membre de la famille, une seule fois. Une chaise et un lit par personne (lits d\'adulte et d\'enfant selon la famille). Prix fixes ; un meuble ne se revend pas.';
  return 'Prix fixe, quel que soit leur nombre. Un animal ne se revend pas. Les poules, les moutons et les vaches vivent à l\'Étable.';
}

// En-tête : les onglets en icônes seules, et le « ? » de l'onglet ouvert.
export function marketTabsHtml() {
  const cur = currentTab().id;
  return `<div class="inv-tabs" role="group" aria-label="Rayons du Marché">${marketTabs()
    .map((t) => `<button type="button" class="inv-tab${t.id === cur ? ' active' : ''}" data-action="comptoir-tab" data-tab="${t.id}" aria-pressed="${t.id === cur}" title="${t.label}" aria-label="${t.label}">${t.img ? meubleImg(t.img, 'meuble-tab') : `<span aria-hidden="true">${t.icon}</span>`}</button>`)
    .join('')}<button type="button" class="btn help-btn shop-help" data-action="market-help" aria-label="Aide : ${currentTab().label}" title="Comment ça marche">?</button></div>`;
}

// Une case : `act` = attributs de l'appui (data-mode, data-item ou data-kind), `prix` en
// haut à gauche (null : rien), `coin` en bas à droite (texte en police pixel, ou HTML).
function shopSlot(icone, nom, act, prix, coin, off, label) {
  const price = prix === null ? '' : `<span class="shop-slot-price">${pxText(String(Math.round(prix)), 'light')}<span class="shop-coin" aria-hidden="true">💰</span></span>`;
  return `<button type="button" class="inv-slot shop-slot${off ? ' off' : ''}" data-action="shop-item" ${act} title="${nom}" aria-label="${label}">` +
    `${price}<span class="inv-slot-icon" aria-hidden="true">${icone}</span>` +
    `<span class="inv-slot-qty">${coin}</span></button>`;
}

function sellSlot(item) {
  const it = DATA.items[item];
  const n = sellableStock(item);
  return shopSlot(it.icone, it.nom, `data-mode="vendre" data-item="${item}"`, it.prix, pxText(String(n), 'light'), n < 1,
    `${it.nom} : ${formatCoins(it.prix)} pièces l'unité, ${formatQty(sellableCount(state, item))} à vendre`);
}

function buySlot(item, mode) {
  const it = DATA.items[item];
  const price = buyPrice(state, item);
  const n = Math.floor(countItem(state, item) + EPS);
  const ok = buyQuote(state, item, 1).quantite >= 1;
  // la quantité en stock, seulement si on en a déjà
  return shopSlot(it.icone, it.nom, `data-mode="${mode}" data-item="${item}"`, price, n > 0 ? pxText(String(n), 'light') : '', !ok,
    `${it.nom} : ${formatCoins(price)} pièces, ${formatQty(n)} en stock`);
}

function hoeSlot() {
  const H = DATA.HOUE;
  const owned = hasHoe(state);
  return shopSlot(H.ICONE, H.NOM, 'data-mode="houe" data-kind="houe"', owned ? null : H.PRIX, owned ? '<span aria-hidden="true">✅</span>' : '', !owned && !canPay(H.PRIX),
    `${H.NOM} : ${owned ? 'déjà achetée' : `${formatCoins(H.PRIX)} pièces`}`);
}

// La hache et la pioche, après la houe : achetées une fois, comme elle.
function toolSlot(id) {
  const def = toolDef(id);
  const owned = hasTool(state, id);
  return shopSlot(def.ICONE, def.NOM, `data-mode="outil" data-kind="${id}"`, owned ? null : def.PRIX, owned ? '<span aria-hidden="true">✅</span>' : '', !owned && !canPay(def.PRIX),
    `${def.NOM} : ${owned ? 'déjà achetée' : `${formatCoins(def.PRIX)} pièces`}`);
}

const OUTILS_DESCRIPTIONS = {
  hache: 'Coupe les arbres de la carte : du bois 🪵 à chaque coup (3 coups par arbre et par jour).',
  pioche: 'Pour casser les pierres (rien à casser sur la ferme pour l\'instant).',
};

/* -- Les animaux : ce qu'ils deviennent dans la fiche (prix fixe, besoins, places). -- */

// { compte, cap, ok, note, infos } d'une espèce, ou null si elle n'est pas au Marché.
function animalInfo(kind) {
  const def = DATA.ANIMAUX[kind];
  if (kind === 'poule') {
    if (!coopShown()) return null;
    const p = state.poulailler;
    const cap = coopCapacity(state);
    let note = `Places libres : ${cap - p.poules}.`;
    let ok = true;
    if (!p.construit) { note = '⚠️ Construis d\'abord le Poulailler (à l\'Étable, sur la carte).'; ok = false; }
    else if (p.poules >= cap) { note = '⚠️ Le Poulailler est plein : agrandis-le pour accueillir d\'autres poules.'; ok = false; }
    return { compte: p.poules, cap, ok, note, infos: [`1 blé nourrit ${def.poulesParBle} poules pour la nuit`, 'pond 1 œuf par nuit si nourrie, toute sa vie'] };
  }
  if (!(isUnlocked(state, 'moutons') || herdShown())) return null;
  const p = state.paturage;
  if (kind === 'mouton') {
    let note = `Places libres : ${freeSheepPlaces(state)}.`;
    let ok = true;
    if (!p.construit) { note = '⚠️ Prépare d\'abord l\'Étable pour les moutons et les vaches.'; ok = false; }
    else if (freeSheepPlaces(state) <= 0) { note = `⚠️ L'Étable est pleine : achète une place de plus (${costLabel(pastureCost(state))}).`; ok = false; }
    return { compte: sheepCount(state), cap: pastureCapacity(state), ok, note, infos: [`prend ${formatPlaces(DATA.PATURAGE.placesParMouton)}`, `mange ${formatStraw(def.pailleParNuit)} par nuit`, `${def.laineParTonte} laine toutes les ${def.joursLaine} nuits nourri`] };
  }
  let note = `Places libres : ${freeCowPlaces(state)}.`;
  let ok = true;
  if (!p.construit) { note = '⚠️ Prépare d\'abord l\'Étable pour les moutons et les vaches.'; ok = false; }
  else if (freeCowPlaces(state) <= 0) { note = `⚠️ Pas assez de place pour une vache (il lui faut ${formatPlaces(DATA.PATURAGE.placesParVache)} libres) : achète des places (${costLabel(pastureCost(state))} la prochaine).`; ok = false; }
  return { compte: cowCount(state), cap: cowCapacity(state), ok, note, infos: [`prend ${formatPlaces(DATA.PATURAGE.placesParVache)}`, `mange ${formatStraw(def.pailleParNuit)} par nuit`, `${def.laitParNuit} lait chaque nuit où elle a mangé`] };
}

const ESPECES = ['poule', 'mouton', 'vache'];

// Un meuble : son dessin, son prix tant qu'on peut encore en acheter, et en bas à droite
// combien on en a (« 2/4 ») ou ✅ s'il ne s'achète qu'une fois et qu'on l'a.
function meubleSlot(id) {
  const def = DATA.MEUBLES[id];
  const n = furnitureCount(state, id);
  const max = furnitureMax(state, id);
  const plein = n >= max;
  const unique = !def.max;
  const coin = unique ? (n ? '<span aria-hidden="true">✅</span>' : '') : pxText(`${n}/${max}`, 'light');
  return shopSlot(meubleImg(id), def.nom, `data-mode="meuble" data-item="${id}"`, plein ? null : def.prix, coin, !plein && state.pieces < def.prix,
    `${def.nom} : ${plein ? (unique ? 'déjà dans la maison' : `${n} sur ${max}, complet`) : `${formatCoins(def.prix)} pièces${unique ? '' : `, ${n} sur ${max}`}`}`);
}

function animalSlot(kind) {
  const a = animalInfo(kind);
  if (!a) return '';
  const def = DATA.ANIMAUX[kind];
  const price = animalPrice(kind);
  const off = !a.ok || animalBuyMax(state, kind) < 1;
  return shopSlot(def.icone, def.nom, `data-mode="animal" data-kind="${kind}"`, price, pxText(`${a.compte}/${a.cap}`, 'light'), off,
    `${def.nom} : ${formatCoins(price)} pièces, ${a.compte} sur ${a.cap}`);
}

// Le rayon Acheter a deux sous-rayons : Ingrédients (la houe en tête, légumes, fruits,
// œufs, lait, farine…) et Plats (ce que cuisinent le Four et la Cuisine).
const SOUS_RAYONS = [
  { id: 'ingredients', label: 'Ingrédients', icon: '🥕', match: (k) => DATA.items[k].category !== 'plat' },
  { id: 'plats', label: 'Plats', icon: '🍲', match: (k) => DATA.items[k].category === 'plat' },
];
let sousRayon = 'ingredients';

function sousRayonsHtml() {
  return `<div class="shop-subtabs" role="group" aria-label="Sous-rayons">${SOUS_RAYONS
    .map((r) => `<button type="button" class="shop-subtab${r.id === sousRayon ? ' active' : ''}" data-action="market-subtab" data-tab="${r.id}" aria-pressed="${r.id === sousRayon}"><span aria-hidden="true">${r.icon}</span> ${r.label}</button>`)
    .join('')}</div>`;
}

function slotsHtml(slots, empty) {
  const html = slots.join('');
  return html ? `<div class="inv-slots">${html}</div>` : `<p class="hint">${empty}</p>`;
}

// `fenetre` : dans la fenêtre flottante de la carte, les onglets sont dans son en-tête.
export function renderComptoir(fenetre = false) {
  const tab = currentTab();
  let body;
  if (tab.id === 'vendre') {
    const items = Object.keys(DATA.items).filter((k) => sellableCount(state, k) > 0);
    body = slotsHtml(items.map(sellSlot), 'Tu n\'as rien à vendre pour l\'instant.');
  } else if (tab.id === 'acheter') {
    // FLU-01 : la puce d'objectif « Acheter une houe » mène ici (Ingrédients, le sous-rayon
    // par défaut, a la houe en tête) ; le chapitre reste à une touche
    const rayon = SOUS_RAYONS.find((r) => r.id === sousRayon);
    const items = Object.keys(DATA.items).filter((k) => isBuyable(k) && DATA.items[k].category !== 'graine' && rayon.match(k));
    const chapitre = !hasHoe(state) ? '<p class="row"><button type="button" class="btn small" data-action="aller" data-window="chapitres">📜 Voir le chapitre</button></p>' : '';
    const slots = items.map((k) => buySlot(k, 'acheter'));
    body = `${sousRayonsHtml()}${chapitre}${slotsHtml(rayon.id === 'ingredients' ? [hoeSlot(), toolSlot('hache'), toolSlot('pioche'), ...slots] : slots, 'Rien à acheter ici pour l\'instant.')}`;
  } else if (tab.id === 'animaux') {
    body = slotsHtml(ESPECES.map(animalSlot), 'Aucun animal à vendre pour l\'instant.');
  } else if (tab.id === 'meubles') {
    body = slotsHtml(Object.keys(DATA.MEUBLES).map(meubleSlot), '');
  } else {
    const items = Object.keys(DATA.items).filter((k) => isBuyable(k) && isGraineComptoir(k) && seedForSale(k));
    body = slotsHtml(items.map((k) => buySlot(k, 'graines')), 'Aucune graine en vente.');
  }
  return fenetre ? body : `<h2>🧺 Marché</h2>${marketTabsHtml()}${body}`;
}

// Une graine dont la culture n'est pas encore débloquée (tournesol) n'est pas en vente.
function seedForSale(item) {
  return !Object.keys(DATA.crops).some((c) => seedItem(c) === item && !isUnlocked(state, c));
}

/* -- Fiche d'un article (fenêtre de dialogue, cadre bois) : ses infos et les boutons de lot,
   chacun avec son total. Elle suit le jeu à chaque rendu (renderShopModal). -- */

let shopOpen = null; // { mode, id } — mode : vendre, acheter, graines, houe, outil, animal

function lotBtn(attrs, q, label, total, ok) {
  return `<button type="button" class="btn lot-btn" ${attrs} data-q="${q}"${ok ? '' : ' disabled'}><span>${label}</span><small class="num">${total}</small></button>`;
}

function shopBodyHtml(o) {
  if (o.mode === 'meuble') {
    const def = DATA.MEUBLES[o.id];
    const n = furnitureCount(state, o.id);
    const max = furnitureMax(state, o.id);
    let why = '';
    if (!houseRepaired(state)) why = 'Répare d\'abord la maison.';
    else if (n >= max) why = def.max ? `Tu en as un pour chacun (${max}).` : 'Il est déjà dans la maison.';
    else if (state.pieces < def.prix) why = 'Pas assez de pièces.';
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${meubleImg(o.id, 'meuble-big')}</span><span class="item-title"><strong id="item-title">${def.nom}</strong><span class="num">${formatCoins(def.prix)} 💰${def.max ? ` · ${n} / ${max}` : ''}</span></span></div>
      <ul class="item-lines">
        <li>😊 +${def.bonheur} bonheur pour chaque membre de la famille, une fois</li>
        <li>🏠 S'installe dans ${PIECES[def.piece] || 'la maison'}${def.max === 'membres' ? ' : une chaise par personne' : def.max === 'adultes' ? ' : un lit par adulte' : def.max === 'enfants' ? ' : un lit par enfant' : ''}.</li>
        ${why ? `<li>${why}</li>` : ''}
      </ul>
      <div class="row item-actions"><button type="button" class="btn primary" data-action="buy-meuble" data-item="${o.id}"${why ? ' disabled' : ''}>Acheter (−${formatCoins(def.prix)} 💰)</button></div>`;
  }
  if (o.mode === 'houe') {
    const H = DATA.HOUE;
    const owned = hasHoe(state);
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${H.ICONE}</span><span class="item-title"><strong id="item-title">${H.NOM}</strong><span>${owned ? 'Déjà achetée' : `${formatCoins(H.PRIX)} 💰`}</span></span></div>
      <ul class="item-lines"><li>Change l'herbe de la carte en terre à cultiver.</li><li>Outil acheté une seule fois.</li></ul>
      ${owned ? '' : `<div class="row item-actions"><button type="button" class="btn primary" data-action="buy-hoe"${canPay(H.PRIX) ? '' : ' disabled'}>Acheter (−${formatCoins(H.PRIX)} 💰)</button></div>`}`;
  }
  if (o.mode === 'outil') {
    const def = toolDef(o.id);
    const owned = hasTool(state, o.id);
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${def.ICONE}</span><span class="item-title"><strong id="item-title">${def.NOM}</strong><span>${owned ? 'Déjà achetée' : `${formatCoins(def.PRIX)} 💰`}</span></span></div>
      <ul class="item-lines"><li>${OUTILS_DESCRIPTIONS[o.id]}</li><li>Double appui sur le bouton rond de la carte : la fenêtre Outils, pour la choisir.</li><li>Outil acheté une seule fois.</li></ul>
      ${owned ? '' : `<div class="row item-actions"><button type="button" class="btn primary" data-action="buy-tool" data-outil="${o.id}"${canPay(def.PRIX) ? '' : ' disabled'}>Acheter (−${formatCoins(def.PRIX)} 💰)</button></div>`}`;
  }
  if (o.mode === 'animal') {
    const def = DATA.ANIMAUX[o.id];
    const a = animalInfo(o.id);
    if (!a) return '';
    const price = animalPrice(o.id);
    const max = a.ok ? Math.min(BUY_MAX, animalBuyMax(state, o.id)) : 0;
    const attrs = `data-action="buy-animal" data-kind="${o.id}"`;
    const lots = [lotBtn(attrs, 1, '×1', `−${formatCoins(price)} 💰`, max >= 1)];
    if (max >= 5) lots.push(lotBtn(attrs, 5, '×5', `−${formatCoins(5 * price)} 💰`, true));
    if (max > 1 && max !== 5) lots.push(lotBtn(attrs, max, `Max (${max})`, `−${formatCoins(max * price)} 💰`, true));
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${def.icone}</span><span class="item-title"><strong id="item-title">${def.nom}</strong><span class="num">${a.compte} / ${a.cap} · ${formatCoins(price)} 💰 (prix fixe)</span></span></div>
      <ul class="item-lines">${a.infos.map((l) => `<li>${l}</li>`).join('')}<li>${a.note}</li></ul>
      <div class="row item-actions lot-btns">${lots.join('')}</div>`;
  }
  const it = DATA.items[o.id];
  if (o.mode === 'vendre') {
    const stock = sellableStock(o.id);
    const frigo = fridgeCount(state, o.id);
    const attrs = `data-action="sell-item" data-item="${o.id}"`;
    const lots = [lotBtn(attrs, 1, '×1', `+${formatCoins(it.prix)} 💰`, stock >= 1)];
    if (stock >= 5) lots.push(lotBtn(attrs, 5, '×5', `+${formatCoins(5 * it.prix)} 💰`, true));
    if (stock > 1 && stock !== 5) lots.push(lotBtn(attrs, stock, `Tout (${stock})`, `+${formatCoins(stock * it.prix)} 💰`, true));
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${formatCoins(it.prix)} 💰 l'unité</span></span></div>
      <ul class="item-lines"><li>À vendre : ${formatQty(sellableCount(state, o.id))}${frigo > 0 ? ` (dont ${formatQty(frigo)} au frigo ❄️)` : ''}</li></ul>
      <div class="row item-actions lot-btns">${lots.join('')}</div>`;
  }
  // acheter, graines : le prix monte à chaque unité, chaque lot dit son vrai total (buyQuote)
  const price = buyPrice(state, o.id);
  const attrs = `data-action="buy-item" data-item="${o.id}"`;
  const lots = [1, 5, 10].map((q) => {
    const quote = buyQuote(state, o.id, q);
    return lotBtn(attrs, q, `×${q}`, `−${formatCoins(quote.cout)} 💰`, quote.quantite >= q);
  });
  return `
    <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${formatCoins(price)} 💰 l'unité</span></span></div>
    <ul class="item-lines"><li>En stock : ${formatQty(countItem(state, o.id))}</li><li>Le prix monte un peu à chaque achat.</li></ul>
    <div class="row item-actions lot-btns">${lots.join('')}</div>`;
}

function openShopModal(mode, id) {
  shopOpen = { mode, id };
  tel('modal', 'shop');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal bois item-modal shop-modal" role="dialog" aria-modal="true" aria-labelledby="item-title" data-stop-propagation>
        <div class="item-body"></div>
        <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>
      </div>
    </div>`;
  renderShopModal();
}

// Appelé à chaque rendu : la fiche suit le jeu ; un article qu'on n'a plus à vendre la ferme.
export function renderShopModal() {
  const body = document.querySelector('#modal-root .shop-modal .item-body');
  if (!body || !shopOpen) return;
  if (shopOpen.mode === 'vendre' && sellableStock(shopOpen.id) < 1) {
    shopOpen = null;
    closeModal();
    return;
  }
  morph(body, shopBodyHtml(shopOpen));
}

function openHelpModal() {
  const tab = currentTab();
  tel('modal', 'market-help');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal bois item-modal" role="dialog" aria-modal="true" aria-labelledby="market-help-title" data-stop-propagation>
        <h2 id="market-help-title"><span aria-hidden="true">${tab.icon}</span> ${tab.label}</h2>
        <p>${helpText(tab.id)}</p>
        <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>
      </div>
    </div>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'shop-item': (target) => {
    openShopModal(target.dataset.mode, target.dataset.item || target.dataset.kind);
  },
  'market-subtab': (target) => {
    sousRayon = target.dataset.tab;
    refresh();
  },
  'buy-meuble': (target) => {
    const id = target.dataset.item;
    const result = applyResult(buyFurniture(state, id));
    if (result.ok) {
      const def = DATA.MEUBLES[id];
      showToast(`🏠 ${def.nom} : installé dans ${PIECES[def.piece] || 'la maison'} (−${formatCoins(result.cost)} 💰${result.bonheur ? ` · 😊 +${result.bonheur}` : ''})`);
    }
  },
  'market-help': () => {
    openHelpModal();
  },
  'buy-animal': (target) => {
    const kind = target.dataset.kind;
    const result = applyResult(buyAnimals(state, kind, Math.max(1, Number(target.dataset.q) || 1)));
    if (result.ok) showToast(`Acheté : ${result.bought} ${DATA.ANIMAUX[kind].icone} (−${formatCoins(result.cost)} 💰)`);
  },
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
