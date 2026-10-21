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
import { buyDehors, buyFurniture, furnitureCount, furnitureMax } from '../engine/meubles.js';
import { blocsPoses } from '../engine/blocs.js';
import { houseRepaired } from '../engine/depart.js';
import { atelierOuvert } from '../engine/atelier.js';
import { buyRuche, ruchesPosees } from '../engine/ruches.js';
import { formatCoins, formatNumber, formatQty } from '../engine/format.js';
import { BUY_MAX, comptoirTab, comptoirTabChoisi, state } from './store.js';
import { applyResult } from './game-actions.js';
import { coopShown, herdShown } from './stage-windows.js';
import { formatPlaces, formatStraw } from './elevage.js';
import { pxText } from './pixel-art.js';
import { tel } from './consent.js';
import { morph, refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, costLabel } from './common.js';
import { closeModal, openModal } from './modal.js';

/* ---------- Marché ---------- */

// Version 1.1.1 : les animaux s'achètent de nouveau au Marché (onglet Animaux, dès que le
// Poulailler ou l'Étable existe dans la partie) ; l'Étable y mène par un raccourci. Les
// arbres se plantent au Verger (version 1.13 : appui sur un emplacement libre).
const COMPTOIR_TABS = [
  { id: 'vendre', label: 'Vendre', icon: '💰', ok: () => true },
  { id: 'acheter', label: 'Acheter', icon: '🛒', ok: () => true },
  { id: 'graines', label: 'Graines', icon: '🌱', ok: () => true },
  // (sur la ferme générée, dès le départ : la ruche s'y achète)
  { id: 'animaux', label: 'Animaux', icon: '🐔', ok: () => isUnlocked(state, 'poulailler') || isUnlocked(state, 'moutons') || coopShown() || herdShown() || atelierOuvert(state) },
  // Meubles de la maison (data/meubles.json) : l'onglet porte le dessin du canapé
  { id: 'meubles', label: 'Meubles', icon: '🛋️', img: 'canape', ok: () => true },
];

// Dessin d'un meuble (assets/meuble_<id>.png), avec l'empreinte du fichier sur le site en ligne.
export function meubleSrc(id) {
  const file = `meuble_${id}.png`;
  const versions = window.FERME_ASSET_VERSIONS;
  return `assets/${file}${versions && versions[file] ? `?v=${versions[file]}` : ''}`;
}

function meubleImg(id, cls = 'meuble-img') {
  return `<img class="${cls}" src="${meubleSrc(id)}" alt="" draggable="false">`;
}

const PIECES = { cuisine: 'la cuisine', salon: 'le salon', chambre: 'la chambre' };

// Sur la ferme générée : la place que prend un meuble posé (DATA.ATELIER.BLOCS.meuble_<id>).
function posePlace(id) {
  const b = DATA.ATELIER.BLOCS['meuble_' + id];
  if (!b) return '';
  if (b.sur === 'mur') return ', accroché à un mur';
  const l = b.largeur || 1, h = b.hauteur || 1;
  return `${l * h > 1 ? `, sur ${l} × ${h} cases` : ''}${b.plat ? ', on marche dessus' : ''}${b.lit ? ', on y dort' : ''}`;
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
  if (tab === 'meubles' && atelierOuvert(state)) return 'Sur ta terre, un meuble acheté arrive dans l\'inventaire : pose-le dans la maison (une pièce close du foyer) avec le mode Construire 🔨. Une table, un canapé ou un tapis prennent plusieurs cases, un lit est un couchage, un tableau s\'accroche à un mur. À l\'achat, ils donnent un peu de bonheur à chaque membre de la famille, une seule fois. Une chaise et un lit par personne. Le bac à fleurs, lui, se pose aussi dehors : ses fleurs attirent les abeilles des ruches. Prix fixes ; un meuble ne se revend pas.';
  if (tab === 'meubles') return 'Les meubles s\'installent dans la maison, chacun à sa place : la cuisine, le salon ou la chambre. À l\'achat, ils donnent un peu de bonheur à chaque membre de la famille, une seule fois. Une chaise et un lit par personne (lits d\'adulte et d\'enfant selon la famille). Prix fixes ; un meuble ne se revend pas.';
  const ruche = atelierOuvert(state) ? ` La ruche (${formatCoins(DATA.RUCHE.PRIX)} pièces) se pose dehors avec le mode Construire 🔨 : ses abeilles butinent les fleurs de la ferme, et au bout de ${DATA.RUCHE.NUITS} nuits elle est pleine (${DATA.RUCHE.MIEL} pots de miel à récolter d'un appui sur sa bulle).` : '';
  return `Prix fixe, quel que soit leur nombre. Un animal ne se revend pas. Les poules, les moutons et les vaches vivent à l'Étable.${ruche}`;
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
  const it = DATA.OBJETS[item];
  const n = sellableStock(item);
  return shopSlot(it.icone, it.nom, `data-mode="vendre" data-item="${item}"`, it.prix, pxText(String(n), 'light'), n < 1,
    `${it.nom} : ${formatCoins(it.prix)} pièces l'unité, ${formatQty(sellableCount(state, item))} à vendre`);
}

function buySlot(item, mode) {
  const it = DATA.OBJETS[item];
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

// La pioche, la hache, la faux et la canne à pêche, après la houe : achetées une fois, comme elle.
function toolSlot(id) {
  const def = toolDef(id);
  const owned = hasTool(state, id);
  return shopSlot(def.ICONE, def.NOM, `data-mode="outil" data-kind="${id}"`, owned ? null : def.PRIX, owned ? '<span aria-hidden="true">✅</span>' : '', !owned && !canPay(def.PRIX),
    `${def.NOM} : ${owned ? (def.ARTICLE === 'un' ? 'déjà acheté' : 'déjà achetée') : `${formatCoins(def.PRIX)} pièces`}`);
}

const OUTILS_DESCRIPTIONS = {
  hache: 'Coupe les arbres de la carte : chaque coup lâche un morceau de bois 🪵 au sol ; au 3e coup, l\'arbre tombe et en lâche 2 de plus. Marche dessus pour les ramasser.',
  pioche: 'Casse les rochers de la carte : chaque coup lâche une pierre 🪨 au sol ; au 3e coup, le rocher se brise et en lâche 2 de plus (il revient 1 à 3 jours plus tard). Marche dessus pour les ramasser.',
  faux: `Fauche l'herbe haute de la carte : chaque touffe fauchée lâche ${DATA.FAUX.PAILLE} paille 🪹 au sol (elle repousse ${DATA.FAUX.RETOUR[0]} à ${DATA.FAUX.RETOUR[1]} jours plus tard). Marche dessus pour la ramasser. La paille nourrit les moutons et les vaches.`,
  canne: 'Pêche dans l\'étang et la mare de la carte : truites 🐟‍🌈 et brochets 🐟‍🦷 (le brochet vit surtout dans l\'étang).',
  triporteur: `Un tricycle à caisse : en selle, tu te déplaces ${DATA.TRIPORTEUR.VITESSE} fois plus vite sur toutes les cartes (pas dans un intérieur ni dans la grotte).`,
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
    return { compte: sheepCount(state), cap: pastureCapacity(state), ok, note, infos: [`prend ${formatPlaces(DATA.PATURAGE.PLACES_PAR_MOUTON)}`, `mange ${formatStraw(def.pailleParNuit)} par nuit`, `${def.laineParTonte} laine toutes les ${def.joursLaine} nuits nourri`] };
  }
  let note = `Places libres : ${freeCowPlaces(state)}.`;
  let ok = true;
  if (!p.construit) { note = '⚠️ Prépare d\'abord l\'Étable pour les moutons et les vaches.'; ok = false; }
  else if (freeCowPlaces(state) <= 0) { note = `⚠️ Pas assez de place pour une vache (il lui faut ${formatPlaces(DATA.PATURAGE.PLACES_PAR_VACHE)} libres) : achète des places (${costLabel(pastureCost(state))} la prochaine).`; ok = false; }
  return { compte: cowCount(state), cap: cowCapacity(state), ok, note, infos: [`prend ${formatPlaces(DATA.PATURAGE.PLACES_PAR_VACHE)}`, `mange ${formatStraw(def.pailleParNuit)} par nuit`, `${def.laitParNuit} lait chaque nuit où elle a mangé`] };
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

// Pour le dehors (ferme générée, DATA.DEHORS : le bac à fleurs) : son prix, et en bas à droite
// combien on en a (posés et en main).
function dehorsSlot(id) {
  const def = DATA.DEHORS[id];
  const n = Object.values(blocsPoses(state)).filter((s) => s === id).length + countItem(state, id);
  return shopSlot(DATA.OBJETS[id].icone, def.nom, `data-mode="dehors" data-item="${id}"`, def.prix, n ? pxText(String(n), 'light') : '', !canPay(def.prix),
    `${def.nom} : ${formatCoins(def.prix)} pièces${n ? `, ${n} sur la ferme` : ''}`);
}

// La ruche (ferme générée) : son prix, et en bas à droite combien on en a (posées et en main).
function rucheSlot() {
  const R = DATA.RUCHE;
  const n = ruchesPosees(state).length + countItem(state, R.OBJET);
  return shopSlot(R.ICONE, R.NOM, 'data-mode="ruche" data-kind="ruche"', R.PRIX, n ? pxText(String(n), 'light') : '', !canPay(R.PRIX),
    `${R.NOM} : ${formatCoins(R.PRIX)} pièces${n ? `, ${n} sur la ferme` : ''}`);
}

// Le rayon Acheter a deux sous-rayons : Ingrédients (la houe en tête, légumes, fruits,
// œufs, lait, farine…) et Plats (ce que cuisinent le Four et la Cuisine).
const SOUS_RAYONS = [
  { id: 'ingredients', label: 'Ingrédients', icon: '🥕', match: (k) => DATA.OBJETS[k].categorie !== 'plat' },
  { id: 'plats', label: 'Plats', icon: '🍲', match: (k) => DATA.OBJETS[k].categorie === 'plat' },
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
    const items = Object.keys(DATA.OBJETS).filter((k) => !DATA.OBJETS[k].invendable && sellableCount(state, k) > 0);
    body = slotsHtml(items.map(sellSlot), 'Tu n\'as rien à vendre pour l\'instant.');
  } else if (tab.id === 'acheter') {
    // FLU-01 : la puce d'objectif « Acheter une houe » mène ici (Ingrédients, le sous-rayon
    // par défaut, a la houe en tête) ; le chapitre reste à une touche
    const rayon = SOUS_RAYONS.find((r) => r.id === sousRayon);
    const items = Object.keys(DATA.OBJETS).filter((k) => isBuyable(k) && DATA.OBJETS[k].categorie !== 'graine' && rayon.match(k));
    const chapitre = !hasHoe(state) ? '<p class="row"><button type="button" class="btn small" data-action="aller" data-window="chapitres">📜 Voir le chapitre</button></p>' : '';
    const slots = items.map((k) => buySlot(k, 'acheter'));
    body = `${sousRayonsHtml()}${chapitre}${slotsHtml(rayon.id === 'ingredients' ? [hoeSlot(), toolSlot('pioche'), toolSlot('hache'), toolSlot('faux'), toolSlot('canne'), toolSlot('triporteur'), ...slots] : slots, 'Rien à acheter ici pour l\'instant.')}`;
  } else if (tab.id === 'animaux') {
    body = slotsHtml(ESPECES.map(animalSlot).concat(atelierOuvert(state) ? [rucheSlot()] : []), 'Aucun animal à vendre pour l\'instant.');
  } else if (tab.id === 'meubles') {
    // (sur la ferme générée : ce qui se pose dehors, le bac à fleurs…)
    body = slotsHtml(Object.keys(DATA.MEUBLES).map(meubleSlot).concat(atelierOuvert(state) ? Object.keys(DATA.DEHORS || {}).map(dehorsSlot) : []), '');
  } else {
    const items = Object.keys(DATA.OBJETS).filter((k) => isBuyable(k) && isGraineComptoir(k) && seedForSale(k));
    body = slotsHtml(items.map((k) => buySlot(k, 'graines')), 'Aucune graine en vente.');
  }
  return fenetre ? body : `<h2>🧺 Marché</h2>${marketTabsHtml()}${body}`;
}

// Une graine dont la culture n'est pas encore débloquée (tournesol) n'est pas en vente. Un
// jeune arbre (pommier, poirier) : sur la ferme générée seulement, une fois le Verger débloqué.
function seedForSale(item) {
  if (DATA.OBJETS[item].arbre) return atelierOuvert(state) && isUnlocked(state, 'verger');
  return !Object.keys(DATA.CULTURES).some((c) => seedItem(c) === item && !isUnlocked(state, c));
}

/* -- Fiche d'un article (fenêtre de dialogue, cadre bois) : ses infos et les boutons de lot,
   chacun avec son total. Elle suit le jeu à chaque rendu (renderShopModal). -- */

let shopOpen = null; // { mode, id } — mode : vendre, acheter, graines, houe, outil, animal, ruche, meuble, dehors

function lotBtn(attrs, q, label, total, ok) {
  return `<button type="button" class="btn lot-btn" ${attrs} data-q="${q}"${ok ? '' : ' disabled'}><span>${label}</span><small class="num">${total}</small></button>`;
}

function shopBodyHtml(o) {
  if (o.mode === 'meuble') {
    const def = DATA.MEUBLES[o.id];
    const n = furnitureCount(state, o.id);
    const max = furnitureMax(state, o.id);
    let why = '';
    const sauvage = atelierOuvert(state);
    if (!houseRepaired(state)) why = sauvage ? 'Bâtis d\'abord ton foyer : une pièce close avec une paillasse.' : 'Répare d\'abord la maison.';
    else if (n >= max) why = def.max ? `Tu en as un pour chacun (${max}).` : 'Il est déjà dans la maison.';
    else if (!canPay(def.prix)) why = 'Pas assez de pièces.';
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${meubleImg(o.id, 'meuble-big')}</span><span class="item-title"><strong id="item-title">${def.nom}</strong><span class="num">${formatCoins(def.prix)} 💰${def.max ? ` · ${n} / ${max}` : ''}</span></span></div>
      <ul class="item-lines">
        <li>😊 +${def.bonheur} bonheur pour chaque membre de la famille, une fois</li>
        <li>🏠 ${sauvage ? `Arrive dans l'inventaire : à poser dans la maison (🔨)${posePlace(o.id)}` : `S'installe dans ${PIECES[def.piece] || 'la maison'}`}${def.max === 'membres' ? ' : une chaise par personne' : def.max === 'adultes' ? ' : un lit par adulte' : def.max === 'enfants' ? ' : un lit par enfant' : ''}.</li>
        ${why ? `<li>${why}</li>` : ''}
      </ul>
      <div class="row item-actions"><button type="button" class="btn primary" data-action="buy-meuble" data-item="${o.id}"${why ? ' disabled' : ''}>Acheter (−${formatCoins(def.prix)} 💰)</button></div>`;
  }
  if (o.mode === 'dehors') {
    const def = DATA.DEHORS[o.id], it = DATA.OBJETS[o.id];
    const fleurs = (DATA.ATELIER.BLOCS[o.id] || {}).fleurs;
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${def.nom}</strong><span class="num">${formatCoins(def.prix)} 💰 (prix fixe)</span></span></div>
      <ul class="item-lines">
        <li>🏠 Arrive dans l'inventaire : à poser sur l'herbe, dehors ou dans la maison, avec 🔨.</li>
        ${fleurs ? `<li>${DATA.RUCHE.ICONE} Ses fleurs attirent les abeilles des ruches.</li>` : ''}
      </ul>
      <div class="row item-actions"><button type="button" class="btn primary" data-action="buy-dehors" data-item="${o.id}"${canPay(def.prix) ? '' : ' disabled'}>Acheter (−${formatCoins(def.prix)} 💰)</button></div>`;
  }
  if (o.mode === 'ruche') {
    const R = DATA.RUCHE, miel = DATA.OBJETS[R.PRODUIT];
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${R.ICONE}</span><span class="item-title"><strong id="item-title">${R.NOM}</strong><span class="num">${formatCoins(R.PRIX)} 💰 (prix fixe)</span></span></div>
      <ul class="item-lines">
        <li>🏠 Arrive dans l'inventaire : à poser dehors, sur l'herbe, avec 🔨.</li>
        <li>🐝 Ses abeilles butinent les fleurs de la ferme.</li>
        <li>${miel.icone} Pleine au bout de ${R.NUITS} nuits : ${R.MIEL} pots de ${miel.nom.toLowerCase()} à récolter (un appui sur sa bulle).</li>
      </ul>
      <div class="row item-actions"><button type="button" class="btn primary" data-action="buy-ruche"${canPay(R.PRIX) ? '' : ' disabled'}>Acheter (−${formatCoins(R.PRIX)} 💰)</button></div>`;
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
    const owned = hasTool(state, o.id), un = def.ARTICLE === 'un';
    const barre = o.id === 'triporteur' ? 'Il va dans la barre d\'outils, en bas de la carte : un appui pour monter dessus ou en descendre.' : 'Elle va dans la barre d\'outils, en bas de la carte : un appui la prend en main.';
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${def.ICONE}</span><span class="item-title"><strong id="item-title">${def.NOM}</strong><span>${owned ? (un ? 'Déjà acheté' : 'Déjà achetée') : `${formatCoins(def.PRIX)} 💰`}</span></span></div>
      <ul class="item-lines"><li>${OUTILS_DESCRIPTIONS[o.id]}</li><li>${barre}</li><li>Acheté une seule fois.</li></ul>
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
  const it = DATA.OBJETS[o.id];
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
  openModal(`
    <div class="item-body"></div>
    <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>`, { labelledBy: 'item-title', className: 'modal bois item-modal shop-modal' });
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
  openModal(`
    <h2 id="market-help-title"><span aria-hidden="true">${tab.icon}</span> ${tab.label}</h2>
    <p>${helpText(tab.id)}</p>
    <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>`, { labelledBy: 'market-help-title', className: 'modal bois item-modal' });
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
      const ou = result.aPoser ? 'dans l\'inventaire, à poser dans la maison avec 🔨' : `installé dans ${PIECES[def.piece] || 'la maison'}`;
      notify(`🏠 ${def.nom} : ${ou} (−${formatCoins(result.cost)} 💰${result.bonheur ? ` · 😊 +${result.bonheur}` : ''})`);
    }
  },
  'buy-dehors': (target) => {
    const id = target.dataset.item;
    const result = applyResult(buyDehors(state, id));
    if (result.ok) notify(`${DATA.OBJETS[id].icone} ${DATA.DEHORS[id].nom} : dans l'inventaire, à poser avec 🔨 (−${formatCoins(result.cost)} 💰)`);
  },
  'buy-ruche': () => {
    const result = applyResult(buyRuche(state));
    if (result.ok) notify(`${DATA.RUCHE.ICONE} ${DATA.RUCHE.NOM} : dans l'inventaire, à poser dehors avec 🔨 (−${formatCoins(result.cost)} 💰)`);
  },
  'market-help': () => {
    openHelpModal();
  },
  'buy-animal': (target) => {
    const kind = target.dataset.kind;
    const result = applyResult(buyAnimals(state, kind, Math.max(1, Number(target.dataset.q) || 1)));
    if (result.ok) notify(`Acheté : ${result.bought} ${DATA.ANIMAUX[kind].icone} (−${formatCoins(result.cost)} 💰)`);
  },
  'buy-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(buyItem(state, item, Math.max(1, Number(target.dataset.q) || 1)));
    if (result.ok) {
      notify(`Acheté : ${result.bought} ${DATA.OBJETS[item].icone} (−${formatCoins(result.cost)} 💰)`);
      refresh();
    }
  },
  'sell-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(sellItem(state, item, Math.max(1, Number(target.dataset.q) || 1)));
    if (result.ok) notify(`Vendu : ${result.sold} ${DATA.OBJETS[item].icone} (+${formatCoins(result.gain)} 💰)`);
  },
});
