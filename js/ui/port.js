import { DATA, prixIle } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount } from '../engine/fridge.js';
import { sellableCount } from '../engine/market.js';
import {
  chargeablesPort, devisPort, etalPort, heuresPort, lieuPort, niveauPort, ouEstLePort, PORT, portOuvert, poserPort, vendablesPort,
} from '../engine/port.js';
import { capaciteDe, capacitePortage, chargeDe, vehiculePortage, vehiculesPortage, volumeCharge, volumeDe } from '../engine/portage.js';
import {
  articleDe, avancerBac, caissesAQuai, catalogueImport, commandesDuBac, etatBac, heuresBac, importsAttendus, nomArticle,
  prendreAvisBac, prochainNiveau,
} from '../engine/bac.js';
import { setupPending } from '../engine/depart.js';
import { avancerContrats, contratsDuPort, prendreAvisContrats } from '../engine/contrats.js';
import { palierVocation, scoreVocation } from '../engine/vocations.js';
import '../engine/vocation-production.js';
import { son } from './son.js';
import { horsFerme } from '../engine/dehors.js';
import { villageActif } from '../engine/village.js';
import { choisirBut } from '../engine/monde-vu.js';
import { farmSeed, farmTerrain } from '../engine/terrain.js';
import { formatCoins, formatDay, formatQty } from '../engine/format.js';
import { solDuMonde } from './monde-sol.js';
import { openStageWindow } from './stage-windows.js';
import { persistState } from './storage.js';
import { comptoirTab, enLigne, state } from './store.js';
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
     chargé, et, sous la halle, « Tout décharger » (tout se vend d'un coup).
   - Le bac (fiche I1c, js/engine/bac.js) : l'onglet Commandes (le bac, son prochain passage, ses commandes à honorer
     avec ce qu'on a porté), l'onglet Import (le catalogue, par rang du port ; ce qui est attendu), l'onglet Le port
     (son niveau, le chantier du suivant : les matériaux à apporter, les pièces à payer ; ce qu'il ouvre). watchBac, à
     chaque veille : les passages du bac (son arrivée sonne la cloche et se dit), les livraisons. Le port agrandi, la
     page se recharge (le monde de la partie est celui du niveau du port : son quai plus long). */

export const PORT_TABS = [
  { id: 'vendre', label: 'Vendre', icon: '💰' },
  { id: 'acheter', label: 'Acheter', icon: '🛒' },
  { id: 'porter', label: 'Porter', icon: '🧺' },
  { id: 'commandes', label: 'Commandes du bac', icon: '📦' },
  { id: 'contrats', label: 'Contrats d\'export', icon: '📜' },
  { id: 'import', label: 'Import', icon: '🚢' },
  { id: 'niveau', label: 'Le port', icon: '🏗️' },
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
  const it = DATA.OBJETS[item], n = charge(item), prix = prixIle(item);
  return shopSlot(it.icone, it.nom, `data-item="${item}"`, prix, pxText(String(n), 'light'), n < 1 || !ici,
    `${it.nom} : ${formatCoins(prix)} pièces l'unité, ${formatQty(n)} chargé${n > 1 ? 's' : ''}`).replace('data-action="shop-item"', 'data-action="port-fiche" data-mode="vendre"');
}

// Une case à charger (l'onglet Porter) : son volume au lieu du prix.
function chargeSlot(item, ferme) {
  const it = DATA.OBJETS[item], n = vendable(item);
  return shopSlot(it.icone, it.nom, `data-item="${item}"`, prixIle(item), pxText(String(n), 'light'), n < 1 || !ferme,
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
  const v = vendablesPort(state), gain = v.reduce((t, k) => t + charge(k) * prixIle(k), 0);
  const bouton = p.ici && v.length ? `<div class="row"><button type="button" class="btn primary" data-action="port-decharger">⬇️ Tout décharger sous la halle (+${formatCoins(gain)} 💰)</button></div>` : '';
  // (fiche I1c : des matériaux du chantier du port portés : les y apporter avant de tout vendre)
  const nx = prochainNiveau(state), chantier = nx && Object.keys(nx.manque).some((k) => charge(k) > 0)
    ? `<p class="muted">🧱 Tu portes des matériaux du chantier du port : apporte-les d'abord (l'onglet Le port), sinon ils se vendent avec le reste.</p>` : '';
  return `${chantier}${bouton}${slotsHtml(v.map((k) => venteSlot(k, p.ici)), 'Rien de chargé : ce que tu vends au port, tu l\'y portes (l\'onglet Porter, sur la ferme).')}`;
}

function achatSlot(o, ici) {
  const it = DATA.OBJETS[o.item], n = Math.floor(countItem(state, o.item) + EPS);
  const ok = ici && devisPort(state, o.item, 1).quantite >= 1;
  return shopSlot(it.icone, it.nom, `data-item="${o.item}"`, o.prix, n > 0 ? pxText(String(n), 'light') : '', !ok,
    `${it.nom} : ${formatCoins(o.prix)} pièces, ${formatQty(n)} en stock`).replace('data-action="shop-item"', 'data-action="port-fiche" data-mode="acheter"');
}

/* -- le bac (fiche I1c) -- */

const MATERIAUX = (o) => Object.entries(o).map(([k, n]) => `${formatQty(n)} ${DATA.OBJETS[k].icone} ${DATA.OBJETS[k].nom.toLowerCase()}`).join(', ');

// Le bac en une ligne : à quai (ses caisses), ou son prochain passage.
function ligneBac() {
  const e = etatBac(state);
  if (!e) return '';
  const caisses = e.caisses ? ` ${e.caisses} caisse${e.caisses > 1 ? 's' : ''} attend${e.caisses > 1 ? 'ent' : ''} sur le quai.` : '';
  if (e.aQuai) return `⛴️ <strong>Le bac est à quai</strong> jusqu'à ${e.heures[1]} h : il emporte tout ce que tu as vendu.${caisses}`;
  const quand = e.prochain === state.day ? 'aujourd\'hui' : e.prochain === state.day + 1 ? 'demain' : formatDay(e.prochain);
  return `⛴️ Prochain passage du bac : <strong>${quand}</strong>, ${heuresBac()}.${caisses}`;
}

function commandesHtml(p) {
  const L = commandesDuBac(state);
  const lignes = L.map((c) => {
    const it = DATA.OBJETS[c.objet], ok = p.ici && c.prete;
    const titre = ok ? 'Honorer la commande' : !p.ici ? 'Au comptoir du port' : `Porte ${c.quantite} ${it.nom.toLowerCase()} (l'onglet Porter)`;
    return `<li class="bac-commande${c.prete ? ' prete' : ''}"><span class="bac-ico" aria-hidden="true">${it.icone}</span>
      <span class="bac-texte"><strong>${it.nom} × ${c.quantite}</strong><span class="muted">porté : ${formatQty(Math.min(c.charge, c.quantite))} / ${c.quantite} · prime +${c.prime} %</span></span>
      <button type="button" class="btn small${ok ? ' primary' : ''}" data-action="port-honorer" data-commande="${c.id}"${ok ? '' : ' disabled'} title="${titre}">+${formatCoins(c.paiement.total)} 💰</button></li>`;
  }).join('');
  const vide = '<p class="muted">Pas de commande en cours : le bac en apporte à chaque passage, de ce que tu sais produire (tes récoltes, tes plats, les produits de tes bêtes).</p>';
  const jusqua = L.length ? `<p class="muted">Valables jusqu'au prochain passage (${formatDay(L[0].jusqua)}) ; une commande manquée s'efface sans rien coûter.</p>` : '';
  return `<p class="bac-ligne">${ligneBac()}</p><h3 class="section-title">📦 Les commandes du bac</h3>${L.length ? `<ul class="bac-liste">${lignes}</ul>${jusqua}` : vide}`;
}

// Fiche I8b : la ferme productive en une ligne (son score, son palier, ce que le suivant ouvre).
function ligneProduction() {
  const V = DATA.VOCATIONS && DATA.VOCATIONS.production;
  if (!V) return '';
  const sc = scoreVocation(state, 'production'), pa = palierVocation(state, 'production');
  const suite = pa.suivant ? ` ; le palier ${pa.palier + 1} à ${formatQty(pa.suivant.score)} : ${pa.suivant.debloque.map((k) => (V.TEXTES || {})[k] || k).join(', ')}` : ' ; tous ses paliers sont atteints';
  return `<p class="muted">${V.icone} ${V.nom} : <strong>${formatQty(sc.score)}</strong> (palier ${pa.palier} sur ${V.PALIERS.length}${suite}).</p>`;
}

// Fiche I8b : les contrats d'export (proposés au bac, acceptés : ce qui est livré, ce qui reste, les passages).
function contratsHtml(p) {
  const d = contratsDuPort(state);
  if (!d) return '';
  const C = DATA.PRODUCTION.CONTRATS;
  const tete = `<p class="bac-ligne">${ligneBac()}</p>${ligneProduction()}`;
  if (!d.ouvert) return `${tete}<p class="muted">Le port de niveau ${C.NIVEAU} ouvre les contrats d'export : de grosses commandes sur ${C.PASSAGES} passages du bac, avec une prime (l'onglet Le port 🏗️).</p>`;
  const acc = d.acceptes.map((c) => {
    const it = DATA.OBJETS[c.objet], porte = Math.min(c.charge, c.reste), ok = p.ici && porte > 0;
    const titre = ok ? 'Livrer ce que tu as porté' : !p.ici ? 'Au comptoir du port' : `Porte des ${it.nom.toLowerCase()} (l'onglet Porter, ou la tournée d'un villageois)`;
    return `<li class="bac-commande${c.reste <= porte ? ' prete' : ''}"><span class="bac-ico" aria-hidden="true">${it.icone}</span>
      <span class="bac-texte"><strong>${it.nom} × ${formatQty(c.quantite)}</strong><span class="muted">livré : ${formatQty(c.livre)} / ${formatQty(c.quantite)} · porté : ${formatQty(c.charge)} · ${c.passagesRestants} passage${c.passagesRestants > 1 ? 's' : ''} du bac encore · prime +${c.prime} % (${formatCoins(c.paiement.prime)} 💰)</span></span>
      <button type="button" class="btn small${ok ? ' primary' : ''}" data-action="port-livrer" data-contrat="${c.id}"${ok ? '' : ' disabled'} title="${titre}">Livrer ${formatQty(porte)}</button></li>`;
  }).join('');
  const pleins = d.acceptes.length >= d.max;
  const prop = d.proposes.map((c) => {
    const it = DATA.OBJETS[c.objet], ok = p.ici && !pleins;
    return `<li class="bac-commande"><span class="bac-ico" aria-hidden="true">${it.icone}</span>
      <span class="bac-texte"><strong>${it.nom} × ${formatQty(c.quantite)}</strong><span class="muted">sur ${c.passages} passages du bac · ${formatCoins(c.paiement.base)} 💰 au prix de vente, plus ${formatCoins(c.paiement.prime)} 💰 de prime (+${c.prime} %)</span></span>
      <button type="button" class="btn small${ok ? ' primary' : ''}" data-action="port-contrat" data-contrat="${c.id}"${ok ? '' : ' disabled'} title="${ok ? 'Accepter le contrat' : pleins ? `Déjà ${d.max} contrats en cours` : 'Au comptoir du port'}">Accepter</button></li>`;
  }).join('');
  const encours = d.acceptes.length ? `<h3 class="section-title">📜 En cours</h3><ul class="bac-liste">${acc}</ul>` : '';
  const vide = '<p class="muted">Pas de contrat proposé : le bac en apporte à chaque passage, de ce que tu sais produire en volume (le pain, les fromages, les conserves, l\'huile, la farine, les produits de tes bêtes).</p>';
  const proposes = `<h3 class="section-title">⛴️ Proposés par le bac</h3>${d.proposes.length ? `<ul class="bac-liste">${prop}</ul><p class="muted">À accepter avant le prochain passage ; ${d.max} en cours au plus.</p>` : vide}`;
  const bilan = d.honores ? `<p class="muted">Contrats honorés : ${formatQty(d.honores)} (${formatCoins(d.primes)} 💰 de primes).</p>` : '';
  return `${tete}${encours}${proposes}${bilan}`;
}

function importHtml(p) {
  const attendus = importsAttendus(state);
  const att = attendus.length ? `<h3 class="section-title">⛴️ Attendu au prochain bac</h3><ul class="item-lines">${attendus.map((x) => `<li>${x.icone} ${x.nom} × ${formatQty(x.quantite)} <span class="muted">(${formatDay(x.arrive)})</span></li>`).join('')}</ul>` : '';
  const n = niveauPort(state), rangs = new Map();
  for (const a of catalogueImport(state)) { if (!rangs.has(a.rang)) rangs.set(a.rang, []); rangs.get(a.rang).push(a); }
  const blocs = [...rangs.entries()].map(([r, L]) => {
    const titre = `${r <= n ? '🔓' : '🔒'} Rang ${r} <span class="muted">(${r <= n ? 'ouvert' : `le port de niveau ${r}`})</span>`;
    const lignes = L.map((a) => {
      const ok = p.ici && !a.refus && state.pieces + EPS >= a.prix;
      const lot = a.lot > 1 ? ` × ${a.lot}` : '';
      const pourquoi = a.refus ? `<span class="muted">${a.refus}</span>` : '';
      return `<li class="bac-commande${a.refus ? ' ferme' : ''}"><span class="bac-ico" aria-hidden="true">${a.icone}</span><span class="bac-texte"><strong>${a.nom}${lot}</strong>${pourquoi}</span>
        <button type="button" class="btn small${ok ? ' primary' : ''}" data-action="port-importer" data-article="${a.cle}"${ok ? '' : ' disabled'} title="${ok ? 'Commander : il arrive au prochain bac' : a.refus || (p.ici ? 'Pas assez de pièces' : 'Au comptoir du port')}">−${formatCoins(a.prix)} 💰</button></li>`;
    }).join('');
    return `<h3 class="section-title">${titre}</h3><ul class="bac-liste">${lignes}</ul>`;
  }).join('');
  return `<p class="bac-ligne">${ligneBac()}</p><p class="muted">Ce que le bac apporte : payé d'avance, livré à la ferme au passage suivant. Chaque niveau du port ouvre un rang.</p>${att}${blocs}`;
}

function niveauHtml(p) {
  const n = niveauPort(state), nx = prochainNiveau(state);
  const tete = `<p><strong>${PORT.ICONE} Le port, niveau ${n}</strong> sur ${PORT.NIVEAUX.length}.</p>`;
  if (!nx) return `${tete}<p class="muted">Le port est à son plus haut niveau : le grand quai, tout le catalogue.</p>`;
  const c = chargeDe(state);
  const lignes = Object.entries(nx.materiaux).map(([k, v]) => {
    const a = nx.apporte[k] || 0, it = DATA.OBJETS[k];
    return `<li${a >= v ? ' class="fait"' : ''}>${it.icone} ${it.nom} : <strong>${formatQty(Math.min(a, v))} / ${formatQty(v)}</strong> apportés${(c[k] || 0) > 0 && a < v ? ` <span class="muted">(${formatQty(c[k])} portés)</span>` : ''}</li>`;
  }).join('');
  const porte = Object.keys(nx.manque).some((k) => (c[k] || 0) > 0);
  const paye = nx.pret && state.pieces + EPS >= nx.pieces;
  const ouvre = [`un quai de ${nx.quai} cases`, `${nx.commandes} commandes par passage`, nx.rang ? `le rang ${nx.niveau} du catalogue (${nx.rang} articles)` : null, nx.plafond ? `jusqu'à ${nx.plafond} villageois` : null].filter(Boolean).join(', ');
  const boutons = `<div class="row">
    <button type="button" class="btn small${porte && p.ici ? ' primary' : ''}" data-action="port-apporter"${porte && p.ici ? '' : ' disabled'}>🧱 Apporter au chantier</button>
    <button type="button" class="btn${paye && p.ici ? ' primary' : ''}" data-action="port-agrandir"${paye && p.ici ? '' : ' disabled'}>🏗️ Agrandir (−${formatCoins(nx.pieces)} 💰)</button></div>`;
  const aide = nx.pret ? 'Tout est au chantier : il reste à payer.' : `Porte au port ${MATERIAUX(nx.manque)} (l'onglet Porter, sur la ferme), puis apporte-les au chantier ; tu peux le faire en plusieurs fois.`;
  return `${tete}<h3 class="section-title">🏗️ Le niveau ${nx.niveau}</h3><p>Il ouvre ${ouvre}.</p>
    <ul class="item-lines chantier-port">${lignes}<li>💰 ${formatCoins(nx.pieces)} pièces, payées au comptoir</li></ul><p class="muted">${aide}</p>${boutons}`;
}

// La fenêtre (`fenetre` : dans la fenêtre flottante de la carte, les onglets sont dans son en-tête).
export function renderPort(fenetre = false) {
  const tab = currentTab(), p = presence();
  const body = tab.id === 'vendre' ? vendreHtml(p)
    : tab.id === 'porter' ? porterHtml()
      : tab.id === 'commandes' ? commandesHtml(p)
        : tab.id === 'contrats' ? contratsHtml(p)
        : tab.id === 'import' ? importHtml(p)
          : tab.id === 'niveau' ? niveauHtml(p)
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
    const n = charge(o.id), attrs = `data-action="port-vendre" data-item="${o.id}"`, prix = prixIle(o.id);
    const lots = [lotBtn(attrs, 1, '×1', `+${formatCoins(prix)} 💰`, n >= 1 && p.ici)];
    if (n >= 5) lots.push(lotBtn(attrs, 5, '×5', `+${formatCoins(5 * prix)} 💰`, p.ici));
    if (n > 1 && n !== 5) lots.push(lotBtn(attrs, n, `Tout (${n})`, `+${formatCoins(n * prix)} 💰`, p.ici));
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${formatCoins(prix)} 💰 l'unité</span></span></div>
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
  if (tab === 'commandes') return `${base} À chaque passage (tous les ${DATA.PORT.BAC.PERIODE} jours, ${heuresBac()}), le bac apporte des commandes, tirées de ce que tu sais produire. Porte ce qu'elles demandent (l'onglet Porter, sur la ferme) et honore-les au comptoir : le prix de vente, plus la prime, plus de l'expérience. Elles valent jusqu'au passage suivant ; une commande manquée ne coûte rien. Le bac emporte aussi tout ce que tu vends : tes caisses attendent sur le quai et partent avec lui.`;
  if (tab === 'contrats') return `${base} À partir du port de niveau ${DATA.PRODUCTION.CONTRATS.NIVEAU}, le bac propose à chaque passage des contrats d'export : de grosses commandes (cent pains, trente fromages…) à livrer sur ${DATA.PRODUCTION.CONTRATS.PASSAGES} passages, avec une prime. Accepte-les au comptoir ; livre-les en autant de fois que tu veux, avec ce que tu as porté ou par la tournée du port d'un villageois (elle les livre d'abord). Chaque livraison est payée au prix de vente ; le contrat complet, sa prime. Manqué, il s'efface sans rien coûter. Plus le port est grand, plus les contrats sont gros. Le quai de chargement (l'Atelier) regroupe les envois de la tournée.`;
  if (tab === 'import') return `${base} Le bac importe ce que l'île n'a pas : des jeunes arbres, des plants de vigne, les espèces de la serre, des bêtes, des plans, et les plants sauvages de l'île que tu as rapportés et cultivés. Une commande se paie d'avance et arrive à la ferme au passage suivant. Chaque niveau du port ouvre un rang du catalogue ; ce que ton niveau débloquait le reste.`;
  if (tab === 'niveau') return `${base} Agrandir le port allonge son quai, ouvre un rang du catalogue d'import, fait venir plus de commandes à chaque passage et accueillir plus de villageois. Chaque niveau demande des matériaux, que tu portes au chantier (en une ou plusieurs fois), et des pièces.`;
  if (tab === 'porter') return `Ce que tu vends au port, tu l'y portes. Chaque objet a un volume (un, plus pour le bois, la pierre, les minerais et les lingots). À la main : ${capaciteDe('mains')} volumes ; la brouette (l'Atelier) : ${capaciteDe('brouette')} ; la charrette attelée au cheval (l'Atelier, avec un cheval) : ${capaciteDe('charrette')}. Charge sur la ferme : ce qui ne tient pas reste ici, rien ne se perd. Sur un chemin, tu vas plus vite, à pied comme à cheval.`;
  return `${base} Le port vend les semences que ton niveau a débloquées (et l'engrais) ; leur prix monte un peu à chaque achat : produire les tiennes reste plus rentable. Les outils et les animaux se fabriquent à l'Atelier.`;
}

/* ---------- la carte : le lieu du port, le comptoir touché ---------- */

// À chaque veille (js/ui/loop.js) : le lieu du port posé dans le moteur dès que le Web Worker a tiré les éléments ;
// le bac (fiche I1c : watchBac).
export function watchPort() {
  if (!villageActif(state)) return;
  watchBac();
  watchSauvages();
  // (I9a2 : en ligne, le lieu du port est posé à la mise en ligne, I9f : la page n'écrit pas dans la partie du monde)
  if (lieuPort(state) || enLigne) return;
  const T = farmTerrain(state), sol = T && T.MONDE ? solDuMonde(T) : null, L = sol && sol.lieux ? sol.lieux() : null;
  if (L && L.port) poserPort(farmSeed(state), L.port);
}

// Les plants sauvages (fiche I7e, js/engine/sauvages.js) : un plant récolté la première fois s'inscrit au catalogue
// d'import du port ; la page le dit (une fois : ceux qu'elle a déjà vus ne s'annoncent plus, ni au chargement).
let sauvagesVus = null;
function watchSauvages() {
  const L = state.port && Array.isArray(state.port.sauvages) ? state.port.sauvages : [];
  if (sauvagesVus === null || sauvagesVus.partie !== state) { sauvagesVus = { partie: state, ids: new Set(L) }; return; }
  for (const id of L) {
    if (sauvagesVus.ids.has(id)) continue;
    sauvagesVus.ids.add(id);
    const it = DATA.OBJETS[id];
    if (it) notify(`${it.icone} ${it.nom} : rapporté de l'île et cultivé, il entre au catalogue d'import du port (au niveau ${DATA.PORT.IMPORT.SAUVAGES.RANG}).`, { kind: 'succes', duree: 9000 });
  }
}

// Le bac (fiche I1c) : ses passages (bac.js avancerBac : son arrivée, son départ), et ce qu'ils disent au joueur : la
// cloche et un mot à son arrivée (ses commandes, les imports livrés).
function watchBac() {
  if (!state || setupPending(state)) return;
  // (I9a2 : sur une île en ligne, le bac et les contrats avancent dans le pas du monde, chez chacun : la page n'en dit
  // que les avis, une fois chacun — la partie locale refaite les rend)
  const vivant = !!(enLigne && enLigne.vivante);
  const r = vivant ? { depart: false, arrivees: [] } : avancerBac(state);
  if (!r) return;
  // (fiche I8b : les contrats d'export suivent le bac ; un contrat honoré, manqué, de nouveaux proposés)
  if (!vivant) avancerContrats(state);
  const avisC = prendreAvisContrats(state).filter((a) => !vivant || nouvelAvis(a));
  for (const a of avisC) {
    const it = a.objet && DATA.OBJETS[a.objet];
    if (a.quoi === 'honore') notify(`📜 Contrat d'export honoré : ${it.icone} ${it.nom} × ${formatQty(a.quantite)} (+${formatCoins(a.prime)} 💰 de prime).`, { kind: 'info', cible: { fenetre: 'comptoir' } });
    else if (a.quoi === 'manque') notify(`📜 Le contrat de ${it.nom.toLowerCase()} s'efface : ${formatQty(a.livre)} livrés sur ${formatQty(a.quantite)} (ce qui est livré est payé).`, { kind: 'info' });
    else if (a.quoi === 'proposes' && a.n) notify(`📜 Le bac propose ${a.n} contrat${a.n > 1 ? 's' : ''} d'export au comptoir.`, { kind: 'info', cible: { fenetre: 'comptoir' } });
  }
  if (avisC.length) { persistState(); refresh(); }
  const avis = prendreAvisBac(state).filter((a) => !vivant || nouvelAvis(a));
  for (const a of avis.slice(-1)) {
    const livres = a.livres.map((x) => { const ar = articleDe(x.cle, state); const n = ar ? x.quantite * (ar.lot || 1) : 0; return ar ? `${nomArticle(ar)[1]} ${nomArticle(ar)[0]}${n > 1 ? ` × ${n}` : ''}` : ''; }).filter(Boolean);
    const morceaux = [a.commandes ? `${a.commandes} commande${a.commandes > 1 ? 's' : ''} t'attend${a.commandes > 1 ? 'ent' : ''} au comptoir` : null, livres.length ? `livré à la ferme : ${livres.join(', ')}` : null].filter(Boolean);
    const rendus = a.rendus.length ? ' (une bête sans place : son prix t\'est rendu)' : '';
    notify(`⛴️ Le bac accoste au port${morceaux.length ? ` : ${morceaux.join(' ; ')}` : '.'}${rendus}`, { kind: 'info', cible: { fenetre: 'comptoir' } });
    son('cloche');
  }
  if (avis.length || r.depart || r.arrivees.length) { persistState(); refresh(); }
}

// (I9a2 : les avis déjà dits en ligne, par leur texte)
const avisDits = new Set();
function nouvelAvis(a) {
  const k = JSON.stringify(a);
  if (avisDits.has(k)) return false;
  avisDits.add(k);
  return true;
}

// Le bac pour la scène (js/carte/ferme/bac.js) : { aQuai, caisses, jour, heures } ; null le chantier éteint.
export function bacModele() {
  if (!state || !villageActif(state)) return null;
  const e = etatBac(state);
  return e ? { aQuai: e.aQuai, caisses: caissesAQuai(state), jour: e.jour, heures: e.heures } : null;
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
    const items = chargeablesPort(state).filter((k) => ['légume', 'fruit', 'produit'].includes(DATA.OBJETS[k].categorie)).sort((a, b) => prixIle(b) / volumeDe(b) - prixIle(a) / volumeDe(a));
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
  'port-honorer': (target) => {
    const r = applyResult(executer('port.honorer', { commande: target.dataset.commande, case: Math.max(0, ouPerso()) }));
    if (r.ok) notify(`📦 Commande honorée : ${DATA.OBJETS[r.commande.objet].icone} × ${r.commande.quantite} (+${formatCoins(r.gain)} 💰, dont ${formatCoins(r.prime)} de prime ; +${r.xp} XP).`, { kind: 'info' });
  },
  'port-contrat': (target) => {
    const r = applyResult(executer('port.contrat', { contrat: target.dataset.contrat, case: Math.max(0, ouPerso()) }));
    if (r.ok) notify(`📜 Contrat accepté : ${DATA.OBJETS[r.contrat.objet].icone} ${DATA.OBJETS[r.contrat.objet].nom} × ${formatQty(r.contrat.quantite)}, sur ${DATA.PRODUCTION.CONTRATS.PASSAGES} passages du bac.`, { kind: 'info' });
  },
  'port-livrer': (target) => {
    const r = applyResult(executer('port.livrer', { contrat: target.dataset.contrat, case: Math.max(0, ouPerso()) }));
    if (r.ok) notify(`📜 Livré au contrat : ${DATA.OBJETS[r.contrat.objet].icone} × ${formatQty(r.n)} (+${formatCoins(r.gain + r.prime)} 💰${r.complet ? `, dont ${formatCoins(r.prime)} de prime : il est honoré` : ` ; il en reste ${formatQty(r.contrat.quantite - r.contrat.livre)}`}).`, { kind: 'info' });
  },
  'port-importer': (target) => {
    const r = applyResult(executer('port.importer', { article: target.dataset.article, quantite: 1, case: Math.max(0, ouPerso()) }));
    if (r.ok) { const [nom, icone] = nomArticle(r.article); notify(`🚢 Commandé : ${icone} ${nom} (−${formatCoins(r.cout)} 💰). Il arrive au bac du ${formatDay(r.arrive)}.`, { kind: 'info' }); }
  },
  'port-apporter': () => {
    const r = applyResult(executer('port.apporter', { case: Math.max(0, ouPerso()) }));
    if (r.ok) notify(`🧱 Apporté au chantier du port : ${MATERIAUX(r.apporte)}.${Object.keys(r.manque).length ? ` Il manque encore ${MATERIAUX(r.manque)}.` : ' Tout y est : il reste à payer.'}`, { kind: 'info' });
  },
  'port-agrandir': () => {
    const r = applyResult(executer('port.agrandir', { case: Math.max(0, ouPerso()) }));
    if (!r.ok) return;
    notify(`🏗️ Le port passe au niveau ${r.niveau} : son quai s'allonge.`, { kind: 'info' });
    son('niveau');
    persistState();
    // (le monde de la partie est celui du niveau du port : la scène se refait avec son quai plus long)
    setTimeout(() => location.reload(), 1200);
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
