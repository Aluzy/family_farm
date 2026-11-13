import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount } from '../engine/fridge.js';
import { sellableCount } from '../engine/market.js';
import {
  chargeablesPort, devisPort, etalPort, heuresPort, lieuPort, ouEstLePort, PORT, portOuvert, poserPort, vendablesPort,
} from '../engine/port.js';
import { capaciteDe, capacitePortage, chargeDe, vehiculePortage, vehiculesPortage, volumeCharge, volumeDe } from '../engine/portage.js';
import { horsFerme } from '../engine/dehors.js';
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
     watchPort le pose dans le moteur (poserPort) dès qu'ils sont là.
   - Le portage (fiche I2, js/engine/portage.js) : ce qu'on vend au port, on l'y porte. L'onglet Porter (sur la
     ferme) : comment on part (à la main, la brouette, la charrette attelée), la place, ce qu'on charge (une case :
     sa fiche, ×1, ×5, tout ce qui tient ; « Charger les récoltes »), ce qu'on reprend. L'onglet Vendre : ce qui est
     chargé, et, sous la halle, « Tout décharger » (tout se vend d'un coup). */

export const PORT_TABS = [
  { id: 'vendre', label: 'Vendre', icon: '💰' },
  { id: 'acheter', label: 'Acheter', icon: '🛒' },
  { id: 'porter', label: 'Porter', icon: '🧺' },
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
// (fiche I2 : ce qui est chargé, à vendre au port)
const charge = (item) => chargeDe(state)[item] || 0;
// Le personnage est-il sur la ferme (on y charge) ?
function surLaFerme() {
  const t = ouPerso();
  return t < 0 || !horsFerme(farmTerrain(state), t);
}

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
  const it = DATA.OBJETS[item], n = charge(item);
  return shopSlot(it.icone, it.nom, `data-item="${item}"`, it.prix, pxText(String(n), 'light'), n < 1 || !ici,
    `${it.nom} : ${formatCoins(it.prix)} pièces l'unité, ${formatQty(n)} chargé${n > 1 ? 's' : ''}`).replace('data-action="shop-item"', 'data-action="port-fiche" data-mode="vendre"');
}

// Une case à charger (l'onglet Porter) : son volume au lieu du prix.
function chargeSlot(item, ferme) {
  const it = DATA.OBJETS[item], n = vendable(item);
  return shopSlot(it.icone, it.nom, `data-item="${item}"`, it.prix, pxText(String(n), 'light'), n < 1 || !ferme,
    `${it.nom} : ${formatQty(n)} à la ferme, ${volumeDe(item)} volume${volumeDe(item) > 1 ? 's' : ''} l'unité`).replace('data-action="shop-item"', 'data-action="port-fiche" data-mode="charger"');
}

// L'onglet Porter : le véhicule, la place, le chargement.
function porterHtml() {
  const ferme = surLaFerme(), v = vehiculePortage(state), cap = capacitePortage(state), vol = volumeCharge(state);
  const boutons = vehiculesPortage(state).map((x) => `<button type="button" class="btn small${x.id === v ? ' primary' : ''}" data-action="portage-vehicule" data-vehicule="${x.id}"${x.refus || !ferme ? ` disabled title="${x.refus || 'Sur la ferme'}"` : ''} aria-pressed="${x.id === v}"><span aria-hidden="true">${x.icone}</span> ${x.nom} · ${x.capacite}</button>`).join('');
  const pct = Math.min(100, Math.round((vol / Math.max(1, cap)) * 100));
  const c = chargeDe(state), charges = Object.keys(c);
  const liste = charges.length
    ? `<ul class="item-lines">${charges.map((k) => `<li>${DATA.OBJETS[k].icone} ${DATA.OBJETS[k].nom} × ${formatQty(c[k])} <span class="muted">(${c[k] * volumeDe(k)} vol.)</span></li>`).join('')}</ul>`
    : '<p class="muted">Rien de chargé.</p>';
  const actions = `<div class="row">${ferme ? '<button type="button" class="btn primary small" data-action="portage-recoltes">🥕 Charger les récoltes</button>' : ''}${ferme && charges.length ? '<button type="button" class="btn small" data-action="portage-reprendre">↩️ Tout reprendre</button>' : ''}</div>`;
  const aide = ferme ? 'Sur la ferme : choisis comment tu pars et charge ce que tu vendras au port. Ce qui ne tient pas reste ici.' : 'On charge sur la ferme. Sous la halle du port, décharge tout (l\'onglet Vendre) : tout se vend.';
  return `<p class="muted">${aide}</p><div class="row portage-vehicules">${boutons}</div>
    <div class="portage-place" role="meter" aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${vol}" aria-label="Place"><span style="width:${pct}%"></span></div>
    <p class="num">${vol} / ${cap} volumes</p>${liste}${actions}
    <h3 class="section-title">À charger</h3>${slotsHtml(chargeablesPort(state).map((k) => chargeSlot(k, ferme)), 'Rien à charger pour l\'instant.')}`;
}

// L'onglet Vendre : ce qui est chargé ; sous la halle, tout décharger.
function vendreHtml(p) {
  const v = vendablesPort(state), gain = v.reduce((t, k) => t + charge(k) * DATA.OBJETS[k].prix, 0);
  const bouton = p.ici && v.length ? `<div class="row"><button type="button" class="btn primary" data-action="port-decharger">⬇️ Tout décharger sous la halle (+${formatCoins(gain)} 💰)</button></div>` : '';
  return `${bouton}${slotsHtml(v.map((k) => venteSlot(k, p.ici)), 'Rien de chargé : ce que tu vends au port, tu l\'y portes (l\'onglet Porter, sur la ferme).')}`;
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
  const body = tab.id === 'vendre' ? vendreHtml(p)
    : tab.id === 'porter' ? porterHtml()
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
    const n = charge(o.id), attrs = `data-action="port-vendre" data-item="${o.id}"`;
    const lots = [lotBtn(attrs, 1, '×1', `+${formatCoins(it.prix)} 💰`, n >= 1 && p.ici)];
    if (n >= 5) lots.push(lotBtn(attrs, 5, '×5', `+${formatCoins(5 * it.prix)} 💰`, p.ici));
    if (n > 1 && n !== 5) lots.push(lotBtn(attrs, n, `Tout (${n})`, `+${formatCoins(n * it.prix)} 💰`, p.ici));
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${formatCoins(it.prix)} 💰 l'unité</span></span></div>
      <ul class="item-lines"><li>Chargé : ${formatQty(n)}</li>${absent}</ul>
      <div class="row item-actions lot-btns">${lots.join('')}</div>`;
  }
  if (o.mode === 'charger') {
    const n = vendable(o.id), frigo = fridgeCount(state, o.id), ferme = surLaFerme(), attrs = `data-action="portage-charger" data-item="${o.id}"`;
    const tient = Math.min(n, Math.floor(Math.max(0, capacitePortage(state) - volumeCharge(state)) / volumeDe(o.id)));
    const lots = [lotBtn(attrs, 1, '×1', `${volumeDe(o.id)} vol.`, tient >= 1 && ferme)];
    if (tient >= 5) lots.push(lotBtn(attrs, 5, '×5', `${5 * volumeDe(o.id)} vol.`, ferme));
    if (tient > 1 && tient !== 5) lots.push(lotBtn(attrs, tient, `Ce qui tient (${tient})`, `${tient * volumeDe(o.id)} vol.`, ferme));
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${volumeDe(o.id)} volume${volumeDe(o.id) > 1 ? 's' : ''} l'unité</span></span></div>
      <ul class="item-lines"><li>À la ferme : ${formatQty(sellableCount(state, o.id))}${frigo > 0 ? ` (dont ${formatQty(frigo)} au frigo ❄️)` : ''}</li><li>Chargé : ${formatQty(charge(o.id))}</li>${ferme ? '' : '<li>On charge sur la ferme.</li>'}</ul>
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
  if ((fiche.mode === 'vendre' ? charge(fiche.id) : fiche.mode === 'charger' ? vendable(fiche.id) : 1) < 1) { fiche = null; closeModal(); return; }
  morph(body, ficheHtml(fiche));
}

function aideTexte(tab) {
  const base = `${ouEstLePort()} Approche-toi du comptoir, sous la halle (touche-le : ton personnage y va).`;
  if (tab === 'vendre') return `${base} Le port t'achète tout ce que tu y portes (l'onglet Porter : charge-le sur la ferme), à prix fixe : le bac emporte tout, sans limite. Sous la halle, « Tout décharger » vend ton chargement d'un coup. Chaque unité vendue baisse de ${DATA.MARCHE.PAS} points le cours d'achat de l'objet, sans passer sous son plancher.`;
  if (tab === 'porter') return `Ce que tu vends au port, tu l'y portes. Chaque objet a un volume (un, plus pour le bois, la pierre, les minerais et les lingots). À la main : ${capaciteDe('mains')} volumes ; la brouette (l'Atelier) : ${capaciteDe('brouette')} ; la charrette attelée au cheval (l'Atelier, avec un cheval) : ${capaciteDe('charrette')}. Charge sur la ferme : ce qui ne tient pas reste ici, rien ne se perd. Sur un chemin, tu vas plus vite, à pied comme à cheval.`;
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
  'port-decharger': () => {
    const r = applyResult(executer('port.decharger', { case: Math.max(0, ouPerso()) }));
    if (r.ok) notify(`⬇️ Déchargé sous la halle : tout est vendu (+${formatCoins(r.gain)} 💰).`, { kind: 'info' });
  },
  'portage-vehicule': (target) => {
    const r = applyResult(executer('portage.vehicule', { vehicule: target.dataset.vehicule, case: Math.max(0, ouPerso()) }));
    if (r.ok) refresh();
  },
  'portage-charger': (target) => {
    const item = target.dataset.item;
    const r = applyResult(executer('portage.charger', { objet: item, quantite: Math.max(1, Number(target.dataset.q) || 1), case: Math.max(0, ouPerso()) }));
    if (r.ok) notify(null, { cumul: { cle: `portage:${item}`, quantites: { n: r.n }, texte: (t) => `Chargé : ${formatQty(t.n)} ${DATA.OBJETS[item].icone}` } });
  },
  'portage-recoltes': () => {
    // (les récoltes : les légumes, les fruits et les produits de la ferme, les plus chers d'abord)
    const items = chargeablesPort(state).filter((k) => ['légume', 'fruit', 'produit'].includes(DATA.OBJETS[k].categorie)).sort((a, b) => DATA.OBJETS[b].prix / volumeDe(b) - DATA.OBJETS[a].prix / volumeDe(a));
    let n = 0, plein = false;
    for (const k of items) {
      const r = executer('portage.charger', { objet: k, quantite: vendable(k), case: Math.max(0, ouPerso()) });
      if (r.ok) { n += r.n; if (r.reste) plein = true; } else plein = true;
    }
    refresh();
    notify(n ? `🧺 Chargé : ${formatQty(n)} récolte${n > 1 ? 's' : ''}${plein ? ' (plus de place : le reste demeure à la ferme)' : ''}.` : 'Rien à charger (ou plus de place).', { kind: 'info' });
  },
  'portage-reprendre': () => {
    const r = applyResult(executer('portage.reprendre', { case: Math.max(0, ouPerso()) }));
    if (r.ok) notify(`↩️ Repris à la ferme : ${formatQty(r.n)}.`, { kind: 'info' });
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
