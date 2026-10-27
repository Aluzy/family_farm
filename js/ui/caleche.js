import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount } from '../engine/fridge.js';
import { sellableCount } from '../engine/market.js';
import { seedItem, seedStock } from '../engine/crops.js';
import { isUnlocked, plantableCropsFor } from '../engine/campaign.js';
import {
  acheterCaleche, CALECHE, calecheIci, calecheMaintenant, devisCaleche, etalCaleche, heler, helable, heureTexte, horaireCaleche,
  majCaleche, ouEstCaleche, poserTournee, prochainPassage, retenir, tourneeDe, vendablesCaleche, vendreCaleche,
} from '../engine/caleche.js';
import { marcheFerme, marcheOuvert } from '../engine/devices.js';
import { unlockLevel } from '../engine/levels.js';
import { etapeDidacticiel, rencontreCaleche } from '../engine/didacticiel.js';
import { farmSeed, farmTerrain } from '../engine/terrain.js';
import { solDuMonde } from './monde-sol.js';
import { openStageWindow, stageWindow } from './stage-windows.js';
import { persistState } from './storage.js';
import { formatCoins, formatQty } from '../engine/format.js';
import { comptoirTab, comptoirTabChoisi, state } from './store.js';
import { applyResult } from './game-actions.js';
import { pxText } from './pixel-art.js';
import { tel } from './consent.js';
import { morph, refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { closeModal, openModal } from './modal.js';

/* ---------- la calèche (fiche 7c : le Marché qui fait le tour du monde) ----------

   La fenêtre du Marché, renommée et adaptée : la calèche (js/engine/caleche.js) achète ce que la
   ferme produit et ce qu'on trouve dans le monde (Vendre, au prix de vente et au cours du Marché),
   et ne vend que les semences et ce que son coffre porte des hameaux (Acheter). On commerce quand
   elle est arrêtée à côté du personnage : à la ferme vers CALECHE.FERME h, dans un hameau, ou hélée
   sur un chemin (le bouton Héler, quand elle passe tout près). Hors de sa présence, la fenêtre dit
   où elle est et quand elle passe à la ferme ; les cases restent visibles (ses prix), pâlies.
   Les outils, les animaux, les meubles se fabriquent à l'Atelier (js/ui/atelier.js). */

const COMPTOIR_TABS = [
  { id: 'vendre', label: 'Vendre', icon: '💰' },
  { id: 'acheter', label: 'Acheter', icon: '🛒' },
];

// Dessin d'un meuble (assets/meuble_<id>.png), avec l'empreinte du fichier sur le site en ligne
// (le mode Construire en a besoin : js/ui/chantier.js).
export function meubleSrc(id) {
  const file = `meuble_${id}.png`;
  const versions = window.FERME_ASSET_VERSIONS;
  return `assets/${file}${versions && versions[file] ? `?v=${versions[file]}` : ''}`;
}

// La case du personnage sur la carte (-1 : pas de carte).
function ouPerso() {
  const S = window.FarmStage;
  return S && S.persoCase ? S.persoCase() : -1;
}

// Seules les unités entières se vendent (un demi-blé reste en stock).
function sellableStock(item) {
  return Math.floor(sellableCount(state, item) + EPS);
}

// FLU-13 : l'onglet à l'ouverture : Acheter si une parcelle est vide et qu'aucune graine n'est en
// stock ; sinon le dernier onglet choisi par le joueur.
export function comptoirTabAOuvrir() {
  const vide = state.potager.parcelles.some((p) => !p.culture);
  const graines = plantableCropsFor(state, DATA.POTAGER.LIEU).some((c) => seedStock(state, c) >= 1);
  if (vide && !graines) return 'acheter';
  return comptoirTabChoisi === 'vendre' || comptoirTabChoisi === 'acheter' ? comptoirTabChoisi : 'vendre';
}

function currentTab() {
  return COMPTOIR_TABS.find((t) => t.id === comptoirTab) || COMPTOIR_TABS[0];
}

// Explication de chaque onglet, derrière le bouton « ? » (FLU-25).
function helpText(tab) {
  const C = CALECHE;
  const tour = `${horaireCaleche()} Elle fait chaque jour le tour du monde par les chemins, s'arrête une demi-heure sur la place de chaque hameau et dort dans l'un d'eux. Sur un chemin, quand elle passe tout près, hèle-la : elle s'arrête un moment. Tant que tu commerces avec elle, elle t'attend (${C.RETENUE_MAX} heures au plus par jour).`;
  if (tab === 'vendre') return `${tour} Elle t'achète tout ce qui se vend, même rangé au frigo (l'inventaire part en premier), à prix fixe. Chaque unité vendue baisse de ${DATA.MARCHE.PAS} points le cours d'achat de l'objet, sans passer sous son plancher.`;
  return `${tour} Elle vend les semences (leur prix monte un peu à chaque achat : produire les tiennes reste plus rentable) et ce qu'elle a acheté aux hameaux en chemin (le bois, le poisson, la pierre, le lait, la laine, les baies…), en quantité limitée, à ${C.VENTE} % de leur prix de vente. Les outils, les animaux et les meubles se fabriquent à l'Atelier.`;
}

// La calèche : là (et on peut commercer), à portée de voix, ou loin. { ici, helable, texte }.
function presence() {
  const ou = ouPerso();
  const ici = calecheIci(state, ou);
  if (ici.ok) {
    const e = ici.e;
    const ou2 = e.etat === 'halte' ? 'arrêtée sur le chemin, pour toi' : e.arret && e.arret.sorte === 'ferme' ? 'arrêtée devant la ferme' : 'arrêtée sur la place';
    return { ici: true, texte: `La calèche est là, ${ou2}. Le cocher t'attend tant que tu commerces.` };
  }
  const h = helable(state, ou);
  if (h.ok && ici.e && ici.e.etat === 'route') return { ici: false, helable: true, texte: 'La calèche passe tout près : hèle-la pour qu\'elle s\'arrête !' };
  const e = ici.e || calecheMaintenant(state);
  const quand = prochainPassage(state);
  return { ici: false, texte: `${ici.raison && !e ? ici.raison : `La calèche n'est pas là. ${ouEstCaleche(state, e)}`} ${quand}` };
}

// En-tête : les onglets en icônes seules, et le « ? » de l'onglet ouvert.
export function marketTabsHtml() {
  const cur = currentTab().id;
  return `<div class="inv-tabs" role="group" aria-label="La calèche">${COMPTOIR_TABS
    .map((t) => `<button type="button" class="inv-tab${t.id === cur ? ' active' : ''}" data-action="comptoir-tab" data-tab="${t.id}" aria-pressed="${t.id === cur}" title="${t.label}" aria-label="${t.label}"><span aria-hidden="true">${t.icon}</span></button>`)
    .join('')}<button type="button" class="btn help-btn shop-help" data-action="market-help" aria-label="Aide : ${currentTab().label}" title="Comment ça marche">?</button></div>`;
}

// Une case : `act` = attributs de l'appui (data-mode, data-item), `prix` en haut à gauche, `coin`
// en bas à droite (texte en police pixel, ou HTML).
function shopSlot(icone, nom, act, prix, coin, off, label) {
  const price = prix === null ? '' : `<span class="shop-slot-price">${pxText(String(Math.round(prix)), 'light')}<span class="shop-coin" aria-hidden="true">💰</span></span>`;
  return `<button type="button" class="inv-slot shop-slot${off ? ' off' : ''}" data-action="shop-item" ${act} title="${nom}" aria-label="${label}">` +
    `${price}<span class="inv-slot-icon" aria-hidden="true">${icone}</span>` +
    `<span class="inv-slot-qty">${coin}</span></button>`;
}

function sellSlot(item, ici) {
  const it = DATA.OBJETS[item];
  const n = sellableStock(item);
  return shopSlot(it.icone, it.nom, `data-mode="vendre" data-item="${item}"`, it.prix, pxText(String(n), 'light'), n < 1 || !ici,
    `${it.nom} : ${formatCoins(it.prix)} pièces l'unité, ${formatQty(sellableCount(state, item))} à vendre`);
}

// Ce que vend la calèche : une semence (la quantité en stock, si on en a) ou un produit des hameaux
// (combien elle en porte).
function buySlot(o, ici) {
  const it = DATA.OBJETS[o.item];
  const ok = devisCaleche(state, o.item, 1).quantite >= 1 && ici;
  const n = Math.floor(countItem(state, o.item) + EPS);
  const coin = o.sorte === 'coffre' ? pxText(String(o.stock), 'light') : n > 0 ? pxText(String(n), 'light') : '';
  return shopSlot(it.icone, it.nom, `data-mode="acheter" data-item="${o.item}"`, o.prix, coin, !ok,
    `${it.nom} : ${formatCoins(o.prix)} pièces${o.sorte === 'coffre' ? `, ${o.stock} dans son coffre` : `, ${formatQty(n)} en stock`}`);
}

function slotsHtml(slots, empty) {
  const html = slots.join('');
  return html ? `<div class="inv-slots">${html}</div>` : `<p class="hint">${empty}</p>`;
}

// Une semence en vente : sa culture débloquée (le tournesol plus tard) ; un jeune arbre, une fois le
// Verger débloqué.
function seedForSale(item) {
  if (DATA.OBJETS[item].arbre) return isUnlocked(state, 'verger');
  return !Object.keys(DATA.CULTURES).some((c) => seedItem(c) === item && !isUnlocked(state, c));
}

// Le bandeau du haut : la calèche là, à portée de voix, ou loin (où, et quand elle passe à la ferme).
function bandeauHtml(p) {
  const bouton = p.helable ? '<button type="button" class="btn primary small" data-action="caleche-heler">🔔 Héler la calèche</button>' : '';
  return `<div class="caleche-bandeau${p.ici ? ' ici' : ''}" role="status"><span aria-hidden="true" class="caleche-ico">${CALECHE.ICONE}</span><span class="caleche-texte">${p.texte}</span>${bouton}</div>`;
}

// `fenetre` : dans la fenêtre flottante de la carte, les onglets sont dans son en-tête.
export function renderComptoir(fenetre = false) {
  const tab = currentTab(), p = presence();
  let body;
  if (tab.id === 'vendre') {
    body = slotsHtml(vendablesCaleche(state).map((k) => sellSlot(k, p.ici)), 'Tu n\'as rien à vendre pour l\'instant.');
  } else {
    const etal = etalCaleche(state, seedForSale);
    const graines = etal.filter((o) => o.sorte === 'semence'), coffre = etal.filter((o) => o.sorte === 'coffre');
    body = `<h3 class="section-title">🌱 Semences</h3>${slotsHtml(graines.map((o) => buySlot(o, p.ici)), 'Aucune semence en vente.')}
      <h3 class="section-title">🧺 Des hameaux</h3>${slotsHtml(coffre.map((o) => buySlot(o, p.ici)), 'Son coffre est vide : elle achète en chemin ce que les hameaux ont en trop.')}`;
  }
  const html = `${bandeauHtml(p)}${body}`;
  return fenetre ? html : `<h2>${CALECHE.ICONE} La calèche</h2>${marketTabsHtml()}${html}`;
}

/* -- Fiche d'un article (fenêtre de dialogue, cadre bois) : ses infos et les boutons de lot,
   chacun avec son total. Elle suit le jeu à chaque rendu (renderShopModal). -- */

let shopOpen = null; // { mode, id } — mode : vendre, acheter

function lotBtn(attrs, q, label, total, ok) {
  return `<button type="button" class="btn lot-btn" ${attrs} data-q="${q}"${ok ? '' : ' disabled'}><span>${label}</span><small class="num">${total}</small></button>`;
}

function shopBodyHtml(o) {
  const it = DATA.OBJETS[o.id], p = presence();
  const absent = p.ici ? '' : `<li>${p.texte}</li>`;
  if (o.mode === 'vendre') {
    const stock = sellableStock(o.id);
    const frigo = fridgeCount(state, o.id);
    const attrs = `data-action="sell-item" data-item="${o.id}"`;
    const lots = [lotBtn(attrs, 1, '×1', `+${formatCoins(it.prix)} 💰`, stock >= 1 && p.ici)];
    if (stock >= 5) lots.push(lotBtn(attrs, 5, '×5', `+${formatCoins(5 * it.prix)} 💰`, p.ici));
    if (stock > 1 && stock !== 5) lots.push(lotBtn(attrs, stock, `Tout (${stock})`, `+${formatCoins(stock * it.prix)} 💰`, p.ici));
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${formatCoins(it.prix)} 💰 l'unité</span></span></div>
      <ul class="item-lines"><li>À vendre : ${formatQty(sellableCount(state, o.id))}${frigo > 0 ? ` (dont ${formatQty(frigo)} au frigo ❄️)` : ''}</li>${absent}</ul>
      <div class="row item-actions lot-btns">${lots.join('')}</div>`;
  }
  // acheter : une semence (le prix monte à chaque unité, chaque lot dit son vrai total) ou un produit
  // des hameaux (à prix fixe, autant qu'elle en porte)
  const o2 = etalCaleche(state, seedForSale).find((x) => x.item === o.id);
  const attrs = `data-action="buy-item" data-item="${o.id}"`;
  const lots = [1, 5, 10].map((q) => {
    const d = devisCaleche(state, o.id, q);
    return lotBtn(attrs, q, `×${q}`, `−${formatCoins(d.cout)} 💰`, d.quantite >= q && p.ici);
  });
  const ligne = !o2 ? 'Elle n\'en a plus.' : o2.sorte === 'coffre' ? `Dans son coffre : ${o2.stock}, acheté aux hameaux.` : 'Le prix monte un peu à chaque achat.';
  return `
    <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${o2 ? `${formatCoins(o2.prix)} 💰 l'unité` : ''}</span></span></div>
    <ul class="item-lines"><li>En stock : ${formatQty(countItem(state, o.id))}</li><li>${ligne}</li>${absent}</ul>
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

// La fenêtre ouverte, près d'elle : le cocher attend (js/ui/stage-windows.js l'appelle à chaque rendu
// de la fenêtre, et la page à chaque échange).
export function retenirCaleche() {
  if (tourneeDe(state)) retenir(state, ouPerso());
}

// Héler la calèche (le bouton de la fenêtre, celui de la carte, ou un appui sur elle). → vrai si elle
// s'arrête (ou l'est déjà).
export function helerCaleche() {
  const r = heler(state, ouPerso());
  if (!r.ok) { notify(r.error); return false; }
  if (!r.deja) notify(`${CALECHE.ICONE} « Ho ! » Le cocher arrête la calèche pour toi.`);
  refresh();
  return true;
}

/* ---------- la calèche sur la carte (le pont de la scène : js/carte/ferme/caleche.js) ---------- */

const T = 16;           // px par tuile de la carte
let annonce = null;     // le jour où son arrivée à la ferme a été annoncée
let majA = 0;           // (les arrêts aux hameaux : au plus deux fois par seconde)

// Chaque image (js/ui/loop.js) : la tournée posée dans le moteur dès que le Web Worker l'a tirée ; les
// arrêts passés (la réserve des hameaux achetée) ; son arrivée à la ferme annoncée (un tintement en
// toast) ; la fenêtre ouverte près d'elle, le cocher attend.
export function watchCaleche() {
  if (!tourneeDe(state)) {
    const T0 = farmTerrain(state), sol = T0 && T0.MONDE ? solDuMonde(T0) : null, t = sol && sol.tournee ? sol.tournee() : null;
    if (!t) return;
    poserTournee(farmSeed(state), t);
  }
  const now = Date.now();
  if (now - majA < 500) return;
  majA = now;
  if (majCaleche(state).length) persistState();
  const e = calecheMaintenant(state);
  if (e && e.etat === 'arret' && e.arret.sorte === 'ferme') {
    if (annonce !== state.day) {
      annonce = state.day;
      notify(`🔔 Ding, ding ! La calèche est arrivée à la ferme, devant l'entrée${marcheOuvert(state) ? ' : vends-lui tes récoltes, achète-lui des graines' : ''}. Elle repart vers ${heureTexte(CALECHE.FERME + CALECHE.ARRET_FERME)}.`, { kind: 'info' });
    }
  } else if (e && annonce === null) annonce = e.t > 0 && e.etat !== 'gite' ? state.day : null;   // (déjà passée en arrivant)
  if (stageWindow === 'comptoir') retenirCaleche();
}

// Pour la scène, à chaque image : où est la calèche (px de carte), ou null (pas de tournée).
// { x, y (le milieu de l'attelage, au sol), vue, gauche, etat, roule (px parcourus : les roues), ferme
// (garée à la ferme), helable (on peut la héler d'où est le personnage), ici (on peut commercer),
// proche (px : la distance à laquelle l'icône du bord de l'écran se montre), heler (px) }.
export function calecheDepuisCarte() {
  const e = calecheMaintenant(state);
  if (!e) return null;
  const ou = ouPerso();
  return {
    x: e.x * T, y: e.y * T, vue: e.vue, gauche: e.gauche, etat: e.etat, roule: e.dist * T,
    ferme: e.etat === 'arret' && e.arret.sorte === 'ferme',
    helable: e.etat === 'route' && helable(state, ou).ok, ici: calecheIci(state, ou).ok,
    proche: CALECHE.PROCHE * T, heler: CALECHE.HELER * T,
  };
}

// Un appui sur la calèche : là, sa fenêtre ; en chemin et tout près, on la hèle (et sa fenêtre
// s'ouvre) ; sinon, où elle va.
export function calecheToucheeDepuisCarte() {
  const ou = ouPerso();
  if (!marcheOuvert(state)) {
    // (le didacticiel, fiche 9b : avant le niveau du Marché, on la rencontre : hélée en chemin, ou
    // arrêtée à côté, son cocher te salue)
    if (etapeDidacticiel(state) === 'caleche') {
      const h = helable(state, ou);
      if (h.ok && h.e.etat === 'route') heler(state, ou);
      if (rencontreCaleche(state, ou)) {
        persistState();
        notify(`${CALECHE.ICONE} « Bonjour ! » Le cocher te salue : il passe ici chaque jour vers ${heureTexte(CALECHE.FERME)}, et commercera avec toi dès le niveau ${unlockLevel('marche')}.`, { kind: 'info' });
        refresh();
        return;
      }
    }
    notify(`${CALECHE.ICONE} ${marcheFerme(state)}`, { kind: 'info' });
    return;
  }
  if (calecheIci(state, ou).ok) { openStageWindow('comptoir'); return; }
  const h = helable(state, ou);
  if (h.ok && h.e.etat === 'route') { if (helerCaleche()) openStageWindow('comptoir'); return; }
  const e = calecheMaintenant(state);
  notify(`${CALECHE.ICONE} ${h.ok ? '' : 'Approche-toi : '}${ouEstCaleche(state, e)} ${prochainPassage(state)}`, { kind: 'info' });
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'shop-item': (target) => {
    openShopModal(target.dataset.mode, target.dataset.item);
  },
  'market-help': () => {
    openHelpModal();
  },
  'caleche-heler': () => {
    helerCaleche();
  },
  'buy-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(acheterCaleche(state, item, Math.max(1, Number(target.dataset.q) || 1), ouPerso()));
    if (result.ok) {
      // fiche 10 : les achats répétés d'un même objet se cumulent (quantité et prix)
      notify(null, { cumul: { cle: `caleche-achat:${item}`, quantites: { n: result.bought, prix: result.cost }, texte: (t) => `Acheté à la calèche : ${formatQty(t.n)} ${DATA.OBJETS[item].icone} (−${formatCoins(t.prix)} 💰)` } });
      refresh();
    }
  },
  'sell-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(vendreCaleche(state, item, Math.max(1, Number(target.dataset.q) || 1), ouPerso()));
    // fiche 10 : les ventes répétées d'un même objet se cumulent (« +30 💰 » puis « +60 💰 »)
    if (result.ok) notify(null, { cumul: { cle: `caleche-vente:${item}`, quantites: { n: result.sold, gain: result.gain }, texte: (t) => `Vendu à la calèche : ${formatQty(t.n)} ${DATA.OBJETS[item].icone} (+${formatCoins(t.gain)} 💰)` } });
  },
});

