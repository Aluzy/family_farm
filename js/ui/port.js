import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount } from '../engine/fridge.js';
import { sellableCount } from '../engine/market.js';
import {
  devisPort, etalPort, heuresPort, lieuPort, ouEstLePort, PORT, portOuvert, poserPort, vendablesPort,
} from '../engine/port.js';
import { villageActif } from '../engine/village.js';
import { choisirBut } from '../engine/monde-vu.js';
import { farmSeed, farmTerrain } from '../engine/terrain.js';
import { formatCoins, formatQty } from '../engine/format.js';
import { solDuMonde } from './monde-sol.js';
import { openStageWindow } from './stage-windows.js';
import { persistState } from './storage.js';
import { comptoirTab, state } from './store.js';
import { executer } from './commandes.js';
import { applyResult } from './game-actions.js';
import { pxText } from './pixel-art.js';
import { tel } from './consent.js';
import { morph, refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { closeModal, openModal } from './modal.js';
import { lotBtn, shopSlot, slotsHtml } from './caleche.js';

/* ---------- le port : la fenêtre du commerce (l'île à bâtir, fiche I1b) ----------

   Le chantier allumé (villageActif), la fenêtre du commerce (la fenêtre « comptoir », menu latéral ; js/ui/
   stage-windows.js) est celle du port : sous la halle, au comptoir, on vend ce que la ferme produit et ce qu'on
   trouve sur l'île (Vendre, au prix de vente et au cours de market.js), on achète les semences débloquées
   (Acheter, à leur cours, qui monte). Le moteur : js/engine/port.js (portOuvert, les commandes port.vendre et
   port.acheter). La calèche ne commerce plus : un appui sur elle, ou sur la malle, ouvre cette fenêtre-ci
   (js/ui/caleche.js).
   - Au port (le personnage à PORT.PORTEE cases du comptoir, dans ses heures), les cases s'achètent et se vendent ;
     loin de lui, la fenêtre dit où il est et ses heures (les cases restent visibles, pâlies, avec leurs prix), et
     propose d'y mener la boussole.
   - Un appui sur le comptoir, sur la carte (js/carte/ferme/hameaux.js, comptoirTouche) : le personnage y va et la
     fenêtre s'ouvre (portComptoir).
   - Le lieu du port (sa case, le sens de son quai) vient des éléments du monde, tirés par le Web Worker du sol :
     watchPort le pose dans le moteur (poserPort) dès qu'ils sont là. */

export const PORT_TABS = [
  { id: 'vendre', label: 'Vendre', icon: '💰' },
  { id: 'acheter', label: 'Acheter', icon: '🛒' },
];

function currentTab() {
  return PORT_TABS.find((t) => t.id === comptoirTab) || PORT_TABS[0];
}

// La case du personnage sur la carte (-1 : pas de carte).
function ouPerso() {
  const S = window.FarmStage;
  return S && S.persoCase ? S.persoCase() : -1;
}

// Seules les unités entières se vendent (un demi-blé reste en stock).
const vendable = (item) => Math.floor(sellableCount(state, item) + EPS);

// Où en est le personnage : { ici (on commerce), texte, boussole (on peut y mener la boussole) }.
function presence() {
  const r = portOuvert(state, ouPerso());
  if (r.ok) return { ici: true, texte: `Te voilà au comptoir du port, sous la halle : vends ce que tu as en trop, achète tes graines. Le bac emporte tout. Ouvert ${heuresPort()}.` };
  if (!lieuPort(state)) return { ici: false, texte: `${ouEstLePort()} (La carte du monde se prépare.)` };
  const b = state.monde && state.monde.but;
  return { ici: false, texte: r.raison, boussole: r.dist > PORT.PORTEE && !(b && b.sorte === 'port') };
}

// En-tête : les onglets en icônes seules, et le « ? ».
export function portTabsHtml() {
  const cur = currentTab().id;
  return `<div class="inv-tabs" role="group" aria-label="${PORT.NOM}">${PORT_TABS
    .map((t) => `<button type="button" class="inv-tab${t.id === cur ? ' active' : ''}" data-action="comptoir-tab" data-tab="${t.id}" aria-pressed="${t.id === cur}" title="${t.label}" aria-label="${t.label}"><span aria-hidden="true">${t.icon}</span></button>`)
    .join('')}<button type="button" class="btn help-btn shop-help" data-action="port-aide" aria-label="Aide : ${currentTab().label}" title="Comment ça marche">?</button></div>`;
}

function bandeauHtml(p) {
  const bouton = p.boussole ? '<button type="button" class="btn primary small" data-action="port-boussole">🧭 Y mener la boussole</button>' : '';
  return `<div class="caleche-bandeau port-bandeau${p.ici ? ' ici' : ''}" role="status"><span aria-hidden="true" class="caleche-ico">${PORT.ICONE}</span><span class="caleche-texte">${p.texte}</span>${bouton}</div>`;
}

function venteSlot(item, ici) {
  const it = DATA.OBJETS[item], n = vendable(item);
  return shopSlot(it.icone, it.nom, `data-item="${item}"`, it.prix, pxText(String(n), 'light'), n < 1 || !ici,
    `${it.nom} : ${formatCoins(it.prix)} pièces l'unité, ${formatQty(sellableCount(state, item))} à vendre`).replace('data-action="shop-item"', 'data-action="port-fiche" data-mode="vendre"');
}

function achatSlot(o, ici) {
  const it = DATA.OBJETS[o.item], n = Math.floor(countItem(state, o.item) + EPS);
  const ok = ici && devisPort(state, o.item, 1).quantite >= 1;
  return shopSlot(it.icone, it.nom, `data-item="${o.item}"`, o.prix, n > 0 ? pxText(String(n), 'light') : '', !ok,
    `${it.nom} : ${formatCoins(o.prix)} pièces, ${formatQty(n)} en stock`).replace('data-action="shop-item"', 'data-action="port-fiche" data-mode="acheter"');
}

// La fenêtre (`fenetre` : dans la fenêtre flottante de la carte, les onglets sont dans son en-tête).
export function renderPort(fenetre = false) {
  const tab = currentTab(), p = presence();
  const body = tab.id === 'vendre'
    ? slotsHtml(vendablesPort(state).map((k) => venteSlot(k, p.ici)), 'Tu n\'as rien à vendre pour l\'instant.')
    : `<h3 class="section-title">🌱 Semences et engrais</h3>${slotsHtml(etalPort(state).map((o) => achatSlot(o, p.ici)), 'Aucune semence en vente.')}`;
  const html = `${bandeauHtml(p)}${body}`;
  return fenetre ? html : `<h2>${PORT.ICONE} ${PORT.NOM}</h2>${portTabsHtml()}${html}`;
}

/* -- la fiche d'un article : ses lots, chacun avec son total (elle suit le jeu à chaque rendu) -- */

let fiche = null;   // { mode: 'vendre' | 'acheter', id }

function ficheHtml(o) {
  const it = DATA.OBJETS[o.id], p = presence();
  const absent = p.ici ? '' : `<li>${p.texte}</li>`;
  if (o.mode === 'vendre') {
    const n = vendable(o.id), frigo = fridgeCount(state, o.id), attrs = `data-action="port-vendre" data-item="${o.id}"`;
    const lots = [lotBtn(attrs, 1, '×1', `+${formatCoins(it.prix)} 💰`, n >= 1 && p.ici)];
    if (n >= 5) lots.push(lotBtn(attrs, 5, '×5', `+${formatCoins(5 * it.prix)} 💰`, p.ici));
    if (n > 1 && n !== 5) lots.push(lotBtn(attrs, n, `Tout (${n})`, `+${formatCoins(n * it.prix)} 💰`, p.ici));
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${formatCoins(it.prix)} 💰 l'unité</span></span></div>
      <ul class="item-lines"><li>À vendre : ${formatQty(sellableCount(state, o.id))}${frigo > 0 ? ` (dont ${formatQty(frigo)} au frigo ❄️)` : ''}</li>${absent}</ul>
      <div class="row item-actions lot-btns">${lots.join('')}</div>`;
  }
  const o2 = etalPort(state).find((x) => x.item === o.id), attrs = `data-action="port-acheter" data-item="${o.id}"`;
  const lots = [1, 5, 10].map((q) => { const d = devisPort(state, o.id, q); return lotBtn(attrs, q, `×${q}`, `−${formatCoins(d.cout)} 💰`, d.quantite >= q && p.ici); });
  return `
    <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${o2 ? `${formatCoins(o2.prix)} 💰 l'unité` : ''}</span></span></div>
    <ul class="item-lines"><li>En stock : ${formatQty(countItem(state, o.id))}</li><li>Le prix monte un peu à chaque achat.</li>${absent}</ul>
    <div class="row item-actions lot-btns">${lots.join('')}</div>`;
}

function ouvrirFiche(mode, id) {
  fiche = { mode, id };
  tel('modal', 'port');
  openModal(`
    <div class="item-body"></div>
    <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>`, { labelledBy: 'item-title', className: 'modal bois item-modal shop-modal port-modal' });
  renderPortModal();
}

// Appelé à chaque rendu (js/ui/render.js) : la fiche suit le jeu ; un article qu'on n'a plus à vendre la ferme.
export function renderPortModal() {
  const body = document.querySelector('#modal-root .port-modal .item-body');
  if (!body || !fiche) return;
  if (fiche.mode === 'vendre' && vendable(fiche.id) < 1) { fiche = null; closeModal(); return; }
  morph(body, ficheHtml(fiche));
}

function aideTexte(tab) {
  const base = `${ouEstLePort()} Approche-toi du comptoir, sous la halle (touche-le : ton personnage y va).`;
  if (tab === 'vendre') return `${base} Le port t'achète tout ce qui se vend, même rangé au frigo (l'inventaire part en premier), à prix fixe : le bac emporte tout, sans limite. Chaque unité vendue baisse de ${DATA.MARCHE.PAS} points le cours d'achat de l'objet, sans passer sous son plancher.`;
  return `${base} Le port vend les semences que ton niveau a débloquées (et l'engrais) ; leur prix monte un peu à chaque achat : produire les tiennes reste plus rentable. Les outils et les animaux se fabriquent à l'Atelier.`;
}

/* ---------- la carte : le lieu du port, le comptoir touché ---------- */

// À chaque veille (js/ui/loop.js) : le lieu du port posé dans le moteur dès que le Web Worker a tiré les éléments.
export function watchPort() {
  if (!villageActif(state) || lieuPort(state)) return;
  const T = farmTerrain(state), sol = T && T.MONDE ? solDuMonde(T) : null, L = sol && sol.lieux ? sol.lieux() : null;
  if (L && L.port) poserPort(farmSeed(state), L.port);
}

// Un appui sur le comptoir (le personnage y va) : la fenêtre du port.
export function portComptoirDepuisCarte() {
  if (!villageActif(state)) return;
  openStageWindow('comptoir');
}

// La fenêtre du port, ouverte d'ailleurs (la calèche, la malle) : un mot, puis la fenêtre.
export function renvoiAuPort(qui) {
  notify(`${qui} ne commerce plus : vends et achète au port, sous la halle, au bout du chemin.`, { kind: 'info' });
  openStageWindow('comptoir');
}

/* ---------- actions ---------- */

registerActions({
  'port-fiche': (target) => ouvrirFiche(target.dataset.mode, target.dataset.item),
  'port-aide': () => {
    const tab = currentTab();
    tel('modal', 'port-aide');
    openModal(`
      <h2 id="port-aide-titre"><span aria-hidden="true">${tab.icon}</span> ${tab.label}</h2>
      <p>${aideTexte(tab.id)}</p>
      <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>`, { labelledBy: 'port-aide-titre', className: 'modal bois item-modal' });
  },
  'port-boussole': () => {
    const r = choisirBut(state, { sorte: 'port', id: 'port' });
    if (!r.ok) { notify(r.error, { kind: 'info' }); return; }
    persistState();
    notify(`🧭 La boussole mène au port.`, { kind: 'info' });
    refresh();
  },
  'port-vendre': (target) => {
    const item = target.dataset.item;
    const r = applyResult(executer('port.vendre', { objet: item, quantite: Math.max(1, Number(target.dataset.q) || 1), case: Math.max(0, ouPerso()) }));
    if (r.ok) notify(null, { cumul: { cle: `port-vente:${item}`, quantites: { n: r.sold, gain: r.gain }, texte: (t) => `Vendu au port : ${formatQty(t.n)} ${DATA.OBJETS[item].icone} (+${formatCoins(t.gain)} 💰)` } });
  },
  'port-acheter': (target) => {
    const item = target.dataset.item;
    const r = applyResult(executer('port.acheter', { objet: item, quantite: Math.max(1, Number(target.dataset.q) || 1), case: Math.max(0, ouPerso()) }));
    if (r.ok) notify(null, { cumul: { cle: `port-achat:${item}`, quantites: { n: r.bought, prix: r.cost }, texte: (t) => `Acheté au port : ${formatQty(t.n)} ${DATA.OBJETS[item].icone} (−${formatCoins(t.prix)} 💰)` } });
  },
});
