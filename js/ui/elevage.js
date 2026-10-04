import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { productivity } from '../engine/family.js';
import {
  allPlots, cropProduct, findPlot, harvest, harvestYield, isMature, maxStage, plant, seedStock,
  toggleBolting, water, waterCost, waterCostFor,
} from '../engine/crops.js';
import {
  buildPaturage, buildPoulailler, buildSilo, buyPasture, canFeedHen, coopCapacity, coopUpgradeCost,
  cowCount, feedAllHens, feedHen, freeCowPlaces, freeSheepPlaces, hensToFeed, pastureCost, shear,
  sheepCount, sheepToShear, siloCapacity, siloUpgradeCost, stableOccupied, strawMissing, strawNeed,
  strawStock, upgradePoulailler, upgradeSilo, wheatTotal, woolReady,
} from '../engine/animals.js';
import { techAuto, techFlag } from '../engine/techtree.js';
import { AUTO_TACHES, harvestAll, isAutomated, setSemis, waterAll } from '../engine/automation.js';
import { plantableCropsFor } from '../engine/campaign.js';
import { formatCoins, formatNumber, formatPercent, formatQty } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { applyResult } from './game-actions.js';
import { itemsSummary } from './inventaire.js';
import { artSvg, coopArtRow, icon, plotArt } from './animations.js';
import { helpBtn } from './aide.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, closeModal, costLabel, plural } from './common.js';

/* ---------- Ferme : Silo et Poulailler ---------- */

export function renderSilo() {
  const s = state.silo;
  if (!s.construit) {
    const cost = DATA.SILO.CONSTRUCTION;
    return `
      <div class="section-head"><h3>${icon('silo')}Silo</h3>${helpBtn('silo')}</div>
      <div class="card">
        <span class="muted">Le blé récolté y est rangé d'abord ; les poules y mangent d'abord. Capacité de départ : ${DATA.SILO.CAPACITE[0]} blés.</span>
        <button type="button" class="btn primary" data-action="build-silo"${canPay(cost) ? '' : ' disabled'}>Construire le Silo (${costLabel(cost)})</button>
      </div>`;
  }
  const cap = siloCapacity(state);
  const pct = cap > 0 ? Math.min(100, Math.round((s.ble / cap) * 100)) : 0;
  const cls = s.ble >= cap - EPS ? ' warn' : '';
  const surplus = countItem(state, DATA.SILO.ITEM);
  const up = siloUpgradeCost(state);
  const upBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Silo au niveau maximum</button>'
      : `<button type="button" class="btn" data-action="upgrade-silo"${canPay(up) ? '' : ' disabled'}>Agrandir : niveau ${s.niveau + 1}, ${formatNumber(DATA.SILO.CAPACITE[s.niveau])} blés (${costLabel(up)})</button>`;
  return `
    <div class="section-head"><h3>${icon('silo')}Silo · niveau ${s.niveau}</h3>${helpBtn('silo')}</div>
    <div class="card">
      <span class="big">${formatQty(s.ble)} / ${formatNumber(cap)} 🌾</span>
      <span class="bar" role="progressbar" aria-label="Remplissage du Silo" aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${Math.round(s.ble)}"><span class="bar-fill${cls}" style="width:${pct}%"></span></span>
      <span class="muted">${s.ble >= cap - EPS ? 'Silo plein : le surplus de blé va dans l\'inventaire.' : 'Le blé récolté est rangé ici en premier.'}${surplus > 0 ? ` Inventaire : ${formatQty(surplus)} blé${surplus > 1 ? 's' : ''}.` : ''}</span>
      ${upBtn}
    </div>`;
}

export function renderPoulailler() {
  const p = state.poulailler;
  if (!p.construit) {
    const cost = DATA.POULAILLER.CONSTRUCTION;
    return `
      <div class="section-head"><h3>${icon('poulailler')}Poulailler</h3>${helpBtn('poulailler')}</div>
      <div class="card">
        <span class="muted">1 blé nourrit ${DATA.ANIMAUX.poule.poulesParBle} poules pour la nuit ; une poule nourrie pond 1 œuf. Capacité de départ : ${DATA.POULAILLER.CAPACITE[0]} poules. Les poules s'achètent au Marché.</span>
        <button type="button" class="btn primary" data-action="build-poulailler"${canPay(cost) ? '' : ' disabled'}>Construire le Poulailler (${costLabel(cost)})</button>
      </div>`;
  }
  const cap = coopCapacity(state);
  const toFeed = hensToFeed(state);
  const noWheat = !canFeedHen(state);
  const prod = productivity(state);
  const up = coopUpgradeCost(state);
  const upBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Poulailler au niveau maximum</button>'
      : `<button type="button" class="btn" data-action="upgrade-poulailler"${canPay(up) ? '' : ' disabled'}>Agrandir : niveau ${p.niveau + 1}, ${DATA.POULAILLER.CAPACITE[p.niveau]} poules (${costLabel(up)})</button>`;
  let hint;
  if (p.poules === 0) hint = 'Aucune poule : achètes-en au Marché (onglet Animaux).';
  else if (toFeed === 0) hint = '✅ Toutes les poules sont nourries : elles pondront cette nuit.';
  else if (isAutomated(state, 'poulailler')) hint = `🤖 Nourrissage automatique : les poules restantes seront nourries cette nuit avec le blé disponible (${formatQty(wheatTotal(state))}).`;
  else if (noWheat) hint = '⚠️ Pas assez de blé pour nourrir une poule.';
  else hint = `Une poule non nourrie ne pond pas. Blé disponible : ${formatQty(wheatTotal(state))}.`;
  return `
    <div class="section-head">
      <h3>${icon('poulailler')}Poulailler · niveau ${p.niveau}</h3>
      <span class="chips">${autoChip('poulailler', 'Nourrit les poules tout seul, à 100 %, pendant la nuit')}<span class="chip${prod < 100 ? ' warn' : ''}" title="Un nourrissage au clic ne compte qu'avec cette probabilité">Productivité ${formatPercent(prod)}</span>${helpBtn('poulailler')}</span>
    </div>
    <div class="card">
      ${coopArtRow()}
      <span class="big" aria-label="Poules nourries sur total">🥚 ${p.nourries} / ${p.poules} nourries</span>
      <span class="muted">Poules : <span class="num">${p.poules} / ${cap}</span> · 1 blé pour ${DATA.ANIMAUX.poule.poulesParBle} poules${p.restes > 0 ? ` (ration entamée : encore ${p.restes})` : ''}</span>
      <span class="bar" role="progressbar" aria-label="Poules nourries" aria-valuemin="0" aria-valuemax="${p.poules}" aria-valuenow="${p.nourries}"><span class="bar-fill" style="width:${p.poules ? Math.round((p.nourries / p.poules) * 100) : 0}%"></span></span>
      <span class="muted">${hint}</span>
      <span class="device-actions">
        <button type="button" class="btn primary" data-action="feed-all"${toFeed > 0 && !noWheat ? '' : ' disabled'}>🌾 Nourrir tout</button>
        <button type="button" class="btn" data-action="feed-hen"${toFeed > 0 && !noWheat ? '' : ' disabled'}>Nourrir une poule</button>
      </span>
      ${upBtn}
    </div>`;
}

/* ---------- Ferme : Étable — moutons et vaches (state.paturage) ---------- */

// « 1 place », « 3 places ».
export function formatPlaces(n) {
  return `${formatNumber(n)} place${n > 1 ? 's' : ''}`;
}

// « 1 paille », « 2 pailles ».
export function formatStraw(n) {
  return `${formatNumber(n)} paille${n > 1 ? 's' : ''}`;
}

function sheepNumber(m) {
  return m.id.replace('mouton-', '');
}

// Numéro d'affichage d'une vache, sur le modèle de sheepNumber().
function cowNumber(v) {
  return v.id.replace('vache-', '');
}

// Animaux qui mangeront cette nuit avec la paille en stock : les moutons
// d'abord, puis les vaches, dans l'ordre de la liste (comme feedLivestock()).
function strawPlan() {
  const A = DATA.ANIMAUX;
  let left = strawStock(state);
  const fed = new Set();
  for (const m of state.paturage.moutons) {
    if (left < A.mouton.pailleParNuit) continue;
    left -= A.mouton.pailleParNuit;
    fed.add(m.id);
  }
  for (const v of state.paturage.vaches) {
    if (left < A.vache.pailleParNuit) continue;
    left -= A.vache.pailleParNuit;
    fed.add(v.id);
  }
  return fed;
}

function sheepCard(m, fed) {
  const M = DATA.ANIMAUX.mouton;
  const ready = woolReady(m);
  const woolPct = Math.round((m.laine / M.joursLaine) * 100);
  const woolText = ready ? 'Laine prête' : `Laine : ${m.laine} / ${M.joursLaine} nuits nourri`;
  const willEat = fed.has(m.id);
  return `
    <article class="card sheep ancre${ready ? ' ready' : ''}" id="animal-${m.id}">
      <span class="card-title"><span>Mouton n°${sheepNumber(m)}</span><span class="chip${ready ? ' badge' : ''}">${ready ? '🧶 Prêt à tondre' : 'Laine en cours'}</span></span>
      <span class="card-art-row">${artSvg([ready ? 'sheep-wool' : 'sheep-shorn'], '', `${m.id}-${ready ? 'laine' : 'tondu'}`, 'grow')}</span>
      <span class="muted">${woolText}</span>
      <span class="bar" role="progressbar" aria-label="Laine" aria-valuemin="0" aria-valuemax="${M.joursLaine}" aria-valuenow="${m.laine}"><span class="bar-fill${ready ? '' : ' warn'}" style="width:${woolPct}%"></span></span>
      <span class="${willEat ? 'muted' : 'alert'}">${willEat ? `✅ Mangera ${formatStraw(M.pailleParNuit)} cette nuit` : '⚠️ Pas de paille pour lui cette nuit : sa laine n\'avancera pas'}</span>
      <span class="device-actions">
        <button type="button" class="btn primary" data-action="shear" data-id="${m.id}"${ready ? '' : ' disabled'}>✂️ Tondre</button>
      </span>
    </article>`;
}

// Carte d'une vache : pas de laine, son lait vient la nuit même où elle mange.
function cowCard(v, fed) {
  const V = DATA.ANIMAUX.vache;
  const willEat = fed.has(v.id);
  return `
    <article class="card sheep ancre" id="animal-${v.id}">
      <span class="card-title"><span>Vache n°${cowNumber(v)}</span><span class="chip${willEat ? ' badge' : ''}">${willEat ? '🥛 Lait cette nuit' : 'Pas de lait cette nuit'}</span></span>
      <span class="card-art-row">${artSvg(['cow'], '', v.id, 'grow')}</span>
      <span class="${willEat ? 'muted' : 'alert'}">${willEat ? `✅ Mangera ${formatStraw(V.pailleParNuit)} cette nuit` : `⚠️ Il lui faut ${formatStraw(V.pailleParNuit)} pour donner son lait`}</span>
    </article>`;
}

// Section « Moutons et vaches » de l'Étable. (Le nom de la fonction et
// state.paturage sont historiques.)
export function renderPaturage() {
  const p = state.paturage;
  const P = DATA.PATURAGE;
  const M = DATA.ANIMAUX.mouton;
  const V = DATA.ANIMAUX.vache;
  const straw = DATA.items[P.nourriture];
  const rules = `Chaque nuit, un mouton mange ${formatStraw(M.pailleParNuit)} et une vache ${formatStraw(V.pailleParNuit)}. La paille vient du Moulin : 1 blé moulu donne 1 farine et 1 paille. Un mouton nourri ${M.joursLaine} nuits donne ${M.laineParTonte} laine ; une vache nourrie donne ${V.laitParNuit} lait la nuit même.`;
  if (!p.construit) {
    const cost = P.deblocage;
    return `
      <div class="section-head"><h3>${icon('paturage')}Moutons et vaches</h3>${helpBtn('paturage')}</div>
      <div class="card">
        <span class="muted">Les moutons et les vaches vivent à l'Étable : ${formatPlaces(P.placesDepart)} au départ, ${formatPlaces(P.placesParMouton)} par mouton, ${formatPlaces(P.placesParVache)} par vache. ${rules} Sans paille, un animal ne produit rien cette nuit-là, et rien d'autre ne lui arrive. Les moutons et les vaches s'achètent au Marché.</span>
        <button type="button" class="btn primary" data-action="build-paturage"${canPay(cost) ? '' : ' disabled'}>Préparer ${formatPlaces(P.placesDepart)} pour les moutons et les vaches (${costLabel(cost)})</button>
      </div>`;
  }
  const sCount = sheepCount(state);
  const cCount = cowCount(state);
  const sFree = freeSheepPlaces(state);
  const cFree = freeCowPlaces(state);
  const cost = pastureCost(state);
  const occupied = stableOccupied(state);
  const pct = p.places > 0 ? Math.min(100, Math.round((occupied / p.places) * 100)) : 0;
  const ready = sheepToShear(state);
  const need = strawNeed(state);
  const stock = strawStock(state);
  const missing = strawMissing(state);
  const fed = strawPlan();
  let hint;
  if (sCount === 0 && cCount === 0) hint = 'Aucun animal : achètes-en au Marché (onglet Animaux).';
  else if (sFree === 0) hint = `⚠️ Plus de place : achète une place de plus (une vache en demande ${P.placesParVache}).`;
  else hint = `${formatPlaces(sFree)} libre${sFree > 1 ? 's' : ''} : de quoi accueillir ${sFree} mouton${sFree > 1 ? 's' : ''}${cFree > 0 ? ` ou ${cFree} vache${cFree > 1 ? 's' : ''}` : ''}.`;
  let strawHint;
  if (need === 0) strawHint = 'Pas d\'animaux à nourrir pour l\'instant.';
  else if (missing > 0) strawHint = `⚠️ Il manque ${formatStraw(missing)} pour cette nuit : mouds du blé au Moulin. Les animaux sans paille ne donneront rien cette nuit (ils mangent dans l'ordre de la liste).`;
  else strawHint = `✅ Assez de paille pour cette nuit${stock >= need * 2 ? ` (il y en a pour ${formatNumber(Math.floor(stock / need))} nuits)` : ''}.`;
  // L'achat d'une place est refusé tant qu'il en reste une de libre (voir buyPasture()).
  const buyOk = sFree === 0 && canPay(cost);
  return `
    <div class="section-head">
      <h3>${icon('paturage')}Moutons et vaches · ${formatPlaces(p.places)}</h3>
      <span class="chips">${autoChip('paturage', 'Tond tout seul les moutons dont la laine est prête, pendant la nuit')}${ready > 0 ? `<span class="chip badge">🧶 ${ready} à tondre</span>` : ''}${helpBtn('paturage')}</span>
    </div>
    <div class="card">
      <span class="big" aria-label="Moutons et vaches">${M.icone} ${sCount} mouton${sCount > 1 ? 's' : ''} · ${V.icone} ${cCount} vache${cCount > 1 ? 's' : ''}</span>
      <span class="bar" role="progressbar" aria-label="Places occupées" aria-valuemin="0" aria-valuemax="${p.places}" aria-valuenow="${occupied}"><span class="bar-fill${sFree === 0 ? ' warn' : ''}" style="width:${pct}%"></span></span>
      <span class="muted">Places : <span class="num">${formatNumber(occupied)} / ${formatNumber(p.places)}</span> · ${formatPlaces(P.placesParMouton)} par mouton, ${formatPlaces(P.placesParVache)} par vache. Une place achetée reste acquise.</span>
      <span class="muted">${hint}</span>
      <button type="button" class="btn" data-action="buy-pasture"${buyOk ? '' : ' disabled'}>Acheter une place (${costLabel(cost)})</button>
    </div>
    <div class="card ancre" id="etable-paille">
      <span class="card-title"><span><span aria-hidden="true">${straw.icone}</span> Paille</span><span class="chip${missing > 0 ? ' warn' : ''}">${missing > 0 ? `⚠️ il en manque ${formatNumber(missing)}` : 'en stock'}</span></span>
      <span class="big" aria-label="Paille en stock sur paille mangée cette nuit">${formatQty(stock)} / ${formatQty(need)} pour cette nuit</span>
      <span class="${missing > 0 ? 'alert' : 'muted'}">${strawHint}</span>
      <span class="muted">${rules}</span>
    </div>
    ${sCount + cCount > 0 ? `<div class="cards sheep-list ancre" id="etable-animaux">${p.moutons.map((m) => sheepCard(m, fed)).join('')}${p.vaches.map((v) => cowCard(v, fed)).join('')}</div>` : ''}`;
}

// Pastille « Automatique » : les tâches que l'Arbre des technologies automatise ici.
export function autoChip(id, title) {
  if (!isAutomated(state, id)) return '';
  const taches = (AUTO_TACHES[id] || []).filter((t) => techAuto(state, t, id));
  const noms = { arrosage: 'arrosage', recolte: 'récolte', semis: 'semis', nourrissage: 'nourrissage', tonte: 'tonte' };
  return `<span class="chip auto" title="${title}">🤖 ${taches.map((t) => noms[t]).join(', ')}</span>`;
}

// Arbre v2 (Outils de jardin) : « Arroser tout » et « Récolter tout ».
export function groupButtons(lieu) {
  const g = techFlag(state, 'actionsGroupees') || [];
  if (!g.length) return '';
  const plots = allPlots(state).filter((p) => p.lieu === lieu);
  const aArroser = plots.filter((p) => p.culture && !p.arrose && !isMature(p)).length;
  const murs = plots.filter((p) => p.culture && isMature(p)).length;
  return `${g.includes('arroser') ? `<button type="button" class="btn" data-action="water-all" data-lieu="${lieu}"${aArroser ? '' : ' disabled'}>💧 Arroser tout (${aArroser})</button>` : ''}${g.includes('recolter') ? `<button type="button" class="btn" data-action="harvest-all" data-lieu="${lieu}"${murs ? '' : ' disabled'}>🧺 Récolter tout (${murs})</button>` : ''}`;
}

function semisLabel(p) {
  if (p.semis === 'off') return '⛔ Semis auto : désactivé';
  if (p.semis === 'verrou' && p.verrou && DATA.crops[p.verrou]) return `🔒 Semis auto : ${DATA.crops[p.verrou].icone} ${DATA.crops[p.verrou].nom}`;
  return '🔁 Semis auto : même culture';
}

function semisButton(p) {
  if (!techAuto(state, 'semis', p.lieu)) return '';
  return `<button type="button" class="btn" data-action="semis-open" data-id="${p.id}">${semisLabel(p)}</button>`;
}

export function plotCard(p, n) {
  const seedsAvailable = plantableCropsFor(state, p.lieu).some((c) => seedStock(state, c) > 0);
  if (!p.culture) {
    return `
      <div class="card plot ancre" id="plot-${p.id}">
        <span class="card-title"><span>Parcelle ${n}</span></span>
        ${plotArt(p)}
        <span class="muted">Vide</span>
        <button type="button" class="btn primary" data-action="plant-open" data-id="${p.id}"${seedsAvailable ? '' : ' disabled'}>${seedsAvailable ? 'Planter' : 'Aucune graine'}</button>
        ${semisButton(p)}
      </div>`;
  }
  const def = DATA.crops[p.culture];
  const max = maxStage(p);
  const mature = isMature(p);
  const pct = Math.round((p.stade / max) * 100);
  const stateLine = mature
    ? (p.montee ? '🌱 Graines prêtes' : '✅ Mûre')
    : `Stade ${p.stade} / ${max}${p.montee ? ' · monte en graine' : ''}`;
  const canBolt = def.graines.mode === 'montee' && p.stade >= def.stades;
  const boltBtn = canBolt
    ? `<button type="button" class="btn" data-action="bolt" data-id="${p.id}">${p.montee ? '↩ Annuler la montée en graine' : '🌱 Laisser monter en graine'}</button>`
    : '';
  let actions;
  if (mature) {
    const label = p.montee
      ? `Récolter (+${def.graines.quantite} 🌱)`
      : `Récolter (+${harvestYield(state, p.culture, false, p.lieu)} ${DATA.items[cropProduct(p.culture)].icone})`;
    actions = `<button type="button" class="btn primary" data-action="harvest" data-id="${p.id}">${label}</button>${boltBtn}`;
  } else {
    const litres = waterCost(state, p);
    const noWater = state.eauMl < litres * 1000;
    actions = `<button type="button" class="btn" data-action="water" data-id="${p.id}"${p.arrose || noWater ? ' disabled' : ''}>${p.arrose ? '💧 Arrosée' : `💧 Arroser (${formatQty(litres)} L)`}</button>${boltBtn}`;
  }
  return `
    <div class="card plot ancre${mature ? ' mature' : ''}" id="plot-${p.id}">
      <span class="card-title"><span>Parcelle ${n}</span><span aria-hidden="true">${def.icone}</span></span>
      ${plotArt(p)}
      <span class="muted">${def.nom} · ${stateLine}</span>
      <span class="bar" role="progressbar" aria-label="Croissance" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${p.stade}"><span class="bar-fill" style="width:${pct}%"></span></span>
      ${actions}
      ${semisButton(p)}
    </div>`;
}

// Réglage du semis automatique d'une parcelle (Lot 7).
function openSemisModal(plotId) {
  const plot = findPlot(state, plotId);
  if (!plot) return;
  const choice = (mode, crop, title, sub) => {
    const pressed = plot.semis === mode && (mode !== 'verrou' || plot.verrou === crop);
    return `
      <button type="button" class="btn semis-choice" data-action="semis-set" data-id="${plotId}" data-mode="${mode}"${crop ? ` data-crop="${crop}"` : ''} aria-pressed="${pressed}">
        <span>${pressed ? '✅ ' : ''}${title}</span>
        <span class="muted">${sub}</span>
      </button>`;
  };
  const locks = plantableCropsFor(state, plot.lieu).map((c) => {
    const def = DATA.crops[c];
    return choice('verrou', c, `🔒 Toujours ${def.icone} ${def.nom}`, `${def.graines.mode === 'plant' ? 'Plants' : 'Graines'} en stock : ${formatQty(seedStock(state, c))}`);
  });
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="semis-title" data-stop-propagation>
        <h2 id="semis-title">🔁 Semis automatique</h2>
        <p class="muted">Après une récolte automatique, cette parcelle est replantée si une graine reste au-delà de la réserve de semences.</p>
        <div class="stack">
          ${choice('meme', null, '🔁 Même culture que la récolte', 'Réglage par défaut.')}
          ${choice('off', null, '⛔ Désactivé', 'La parcelle reste vide après la récolte.')}
          ${locks.join('')}
        </div>
        <button type="button" class="btn" data-action="close-modal">Fermer</button>
      </div>
    </div>
  `;
}

// Choix de la graine à planter sur une parcelle vide.
function openPlantModal(plotId) {
  tel('modal', 'plant');
  const plot = findPlot(state, plotId);
  if (!plot || plot.culture) return;
  const rows = plantableCropsFor(state, plot.lieu)
    .map((c) => {
      const def = DATA.crops[c];
      const n = seedStock(state, c);
      const stock = def.graines.mode === 'plant' ? 'Plants' : 'Graines';
      return `
        <button type="button" class="btn plant-choice" data-action="plant" data-id="${plotId}" data-crop="${c}"${n > 0 ? '' : ' disabled'}>
          <span>${def.icone} ${def.nom}</span>
          <span class="muted">${stock} : ${formatQty(n)} · ${def.stades} nuits · ${formatQty(waterCostFor(state, c, plot.lieu))} L par arrosage</span>
        </button>`;
    })
    .join('');
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="plant-title" data-stop-propagation>
        <h2 id="plant-title">🌱 Planter</h2>
        <p class="muted">Choisis ce que tu plantes sur cette parcelle.</p>
        <div class="stack">${rows}</div>
        <button type="button" class="btn" data-action="close-modal">Annuler</button>
      </div>
    </div>
  `;
}

function harvestToast(result) {
  const parts = Object.entries(result.items).map(([item, n]) => `+${n} ${DATA.items[item].icone}`);
  return `Récolte : ${parts.join(' ')}`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'plant-open': (target) => {
    openPlantModal(target.dataset.id);
  },
  'plant': (target) => {
    closeModal();
    applyResult(plant(state, target.dataset.id, target.dataset.crop));
  },
  'water': (target) => {
    applyResult(water(state, target.dataset.id));
  },
  'bolt': (target) => {
    applyResult(toggleBolting(state, target.dataset.id));
  },
  'harvest': (target) => {
    const result = applyResult(harvest(state, target.dataset.id));
    if (result.ok) showToast(harvestToast(result));
  },
  'build-silo': () => {
    applyResult(buildSilo(state));
  },
  'upgrade-silo': () => {
    applyResult(upgradeSilo(state));
  },
  'build-poulailler': () => {
    applyResult(buildPoulailler(state));
  },
  'upgrade-poulailler': () => {
    applyResult(upgradePoulailler(state));
  },
  'feed-hen': () => {
    const result = applyResult(feedHen(state));
    if (result.ok) showToast(result.compte ? '🌾 Une poule nourrie (1 blé pour 2 poules)' : 'Le geste n\'a pas compté (santé faible) : le blé est conservé, réessaie.');
  },
  'feed-all': () => {
    const result = applyResult(feedAllHens(state));
    if (result.ok) {
      showToast(
        result.ratees > 0
          ? `${result.nourries} poule${result.nourries > 1 ? 's' : ''} nourrie${result.nourries > 1 ? 's' : ''}, ${result.ratees} geste${result.ratees > 1 ? 's' : ''} sans effet (santé faible) : réessaie.`
          : `${result.nourries} poule${result.nourries > 1 ? 's' : ''} nourrie${result.nourries > 1 ? 's' : ''}.`
      );
    }
  },
  'build-paturage': () => {
    const result = applyResult(buildPaturage(state));
    if (result.ok) showToast(`🐑 L'Étable est prête pour les moutons et les vaches : ${formatPlaces(result.places)} (−${formatCoins(result.cost)} 💰)`);
  },
  'buy-pasture': () => {
    const result = applyResult(buyPasture(state));
    if (result.ok) showToast(`Place achetée : ${formatPlaces(result.places)} au total (−${formatCoins(result.cost)} 💰)`);
  },
  'shear': (target) => {
    const result = applyResult(shear(state, target.dataset.id));
    if (result.ok) showToast(`✂️ Tonte : +${result.laine} 🧶`);
  },
  'water-all': (target) => {
    const result = applyResult(waterAll(state, target.dataset.lieu));
    if (result.ok) showToast(`💧 ${plural(result.arrosees, 'parcelle')} arrosée${result.arrosees > 1 ? 's' : ''}${result.sansEau ? ` · ${result.sansEau} sans eau` : ''}`);
  },
  'harvest-all': (target) => {
    const result = applyResult(harvestAll(state, target.dataset.lieu));
    if (result.ok) showToast(`🧺 ${itemsSummary(result.items)}`);
  },
  'semis-open': (target) => {
    openSemisModal(target.dataset.id);
  },
  'semis-set': (target) => {
    closeModal();
    applyResult(setSemis(state, target.dataset.id, target.dataset.mode, target.dataset.crop));
  },
});
