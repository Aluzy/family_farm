import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { energyChip, formatEnergy } from './energie.js';
import { actionCost } from '../engine/stamina.js';
import {
  allPlots, cropProduct, findPlot, harvest, harvestYield, isMature, maxStage, plant, seedStock,
  growHoursLeft, water, waterCost, waterCostFor, seedLabel,
} from '../engine/crops.js';
import {
  buildPaturage, buildPoulailler, buildSilo, buyPasture, canFeedHen, coopCapacity, coopUpgradeCost,
  cowCount, cowsOnHerbs, feedAllHens, feedHen, freeSheepPlaces, hensToFeed, herbStock, herbsOn, pastureCost,
  setCowHerbs, shear, sheepCount, sheepToShear, siloCapacity, siloUpgradeCost, stableOccupied, strawMissing,
  strawNeed, strawStock, upgradePoulailler, upgradeSilo, wheatTotal, woolReady,
} from '../engine/animals.js';
import { techAuto, techFlag } from '../engine/techtree.js';
import { AUTO_TACHES, harvestAll, isAutomated, plantAll, setSemis, waterAll } from '../engine/automation.js';
import { plantableCropsFor } from '../engine/campaign.js';
import { formatCoins, formatNumber, formatQty } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { applyResult } from './game-actions.js';
import { itemsSummary } from './inventaire.js';
import { artPx, coopArtRow, icon } from './animations.js';
import { pxGauge, pxText } from './pixel-art.js';
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
        <button type="button" class="btn primary" data-action="build-silo"${canPay(cost) ? '' : ' disabled'}>Réparer le Silo (${costLabel(cost)})</button>
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
      ${s.ble >= cap - EPS || surplus > 0 ? `<span class="chips">${s.ble >= cap - EPS ? '<span class="chip warn">Silo plein</span>' : ''}${surplus > 0 ? `<span class="chip">🎒 ${formatQty(surplus)} 🌾</span>` : ''}</span>` : ''}
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
        <button type="button" class="btn primary" data-action="build-poulailler"${canPay(cost) ? '' : ' disabled'}>Réparer le Poulailler (${costLabel(cost)})</button>
      </div>`;
  }
  const cap = coopCapacity(state);
  const toFeed = hensToFeed(state);
  const noWheat = !canFeedHen(state);
  const up = coopUpgradeCost(state);
  const upBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Poulailler au niveau maximum</button>'
      : `<button type="button" class="btn" data-action="upgrade-poulailler"${canPay(up) ? '' : ' disabled'}>Agrandir : niveau ${p.niveau + 1}, ${DATA.POULAILLER.CAPACITE[p.niveau]} poules (${costLabel(up)})</button>`;
  // Une ligne d'état, courte ; les règles (rations, ponte, niveaux) sont dans « ? ».
  let hint;
  if (p.poules === 0) hint = '<span class="muted">Aucune poule : achètes-en au Marché.</span>';
  else if (toFeed === 0) hint = '<span class="muted">✅ Toutes nourries : elles pondront cette nuit.</span>';
  else if (isAutomated(state, 'poulailler')) hint = '<span class="muted">🤖 Nourries toutes seules cette nuit.</span>';
  else if (noWheat) hint = '<span class="alert">⚠️ Pas assez de blé.</span>';
  else hint = '';
  return `
    <div class="section-head">
      <h3>${icon('poulailler')}Poulailler · niveau ${p.niveau}</h3>
      <span class="chips">${autoChip('poulailler', 'Nourrit les poules tout seul, à 100 %, pendant la nuit')}${helpBtn('poulailler')}</span>
    </div>
    <div class="card">
      ${coopArtRow()}
      <span class="card-title"><span class="big" aria-label="Poules nourries sur total">🥚 ${p.nourries} / ${p.poules} nourries</span><span class="chips"><span class="chip num" title="Poules sur places">🐔 ${p.poules} / ${cap}</span><span class="chip num" title="Blé disponible">🌾 ${formatQty(wheatTotal(state))}</span></span></span>
      <span class="bar" role="progressbar" aria-label="Poules nourries" aria-valuemin="0" aria-valuemax="${p.poules}" aria-valuenow="${p.nourries}"><span class="bar-fill" style="width:${p.poules ? Math.round((p.nourries / p.poules) * 100) : 0}%"></span></span>
      ${hint}
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
// d'abord, puis les vaches, dans l'ordre de la liste (comme feedLivestock()) ;
// les premières vaches mangent les herbes de montagne, si l'Étable les leur
// donne (`alpage` : celles qui donneront du lait d'alpage).
function strawPlan() {
  const A = DATA.ANIMAUX;
  let left = strawStock(state);
  const fed = new Set();
  const alpage = new Set();
  for (const m of state.paturage.moutons) {
    if (left < A.mouton.pailleParNuit) continue;
    left -= A.mouton.pailleParNuit;
    fed.add(m.id);
  }
  let herbes = cowsOnHerbs(state);
  for (const v of state.paturage.vaches) {
    if (herbes > 0) {
      herbes -= 1;
      fed.add(v.id);
      alpage.add(v.id);
      continue;
    }
    if (left < A.vache.pailleParNuit) continue;
    left -= A.vache.pailleParNuit;
    fed.add(v.id);
  }
  fed.alpage = alpage;
  return fed;
}

// Les animaux de l'Étable en cartes carrées, deux par rangée : le dessin, le nom, ce qu'il
// donne cette nuit (laine qui avance, lait) et, pour un mouton prêt, « Tondre ». Les règles
// (paille, laine, lait) sont dans « ? ».
function sheepCard(m, fed) {
  const M = DATA.ANIMAUX.mouton;
  const ready = woolReady(m);
  const woolPct = Math.round((m.laine / M.joursLaine) * 100);
  const willEat = fed.has(m.id);
  const etat = ready ? '🧶 Prêt à tondre' : willEat ? `Laine ${m.laine} / ${M.joursLaine}` : '⚠️ Sans paille';
  return `
    <article class="card animal-card ancre${ready ? ' ready' : ''}${willEat || ready ? '' : ' hungry'}" id="animal-${m.id}" title="${ready ? 'Laine prête' : `Laine : ${m.laine} / ${M.joursLaine} nuits nourri${willEat ? '' : ' · pas de paille pour lui cette nuit'}`}">
      <span class="animal-art">${artPx([ready ? 'sheep-wool' : 'sheep-shorn'], '', `${m.id}-${ready ? 'laine' : 'tondu'}`, 'grow')}</span>
      <strong>Mouton n°${sheepNumber(m)}</strong>
      <span class="animal-state${willEat || ready ? '' : ' alert'}">${etat}</span>
      ${ready
        ? `<button type="button" class="btn primary" data-action="shear" data-id="${m.id}">✂️ Tondre</button>`
        : `<span class="bar" role="progressbar" aria-label="Laine" aria-valuemin="0" aria-valuemax="${M.joursLaine}" aria-valuenow="${m.laine}"><span class="bar-fill warn" style="width:${woolPct}%"></span></span>`}
    </article>`;
}

// Carte d'une vache : pas de laine, son lait vient la nuit même où elle mange
// (du lait d'alpage si elle mange des herbes de montagne).
function cowCard(v, fed) {
  const willEat = fed.has(v.id);
  const alpage = fed.alpage && fed.alpage.has(v.id);
  const lait = DATA.items[DATA.ANIMAUX.vache.laitAlpage];
  const etat = alpage ? `${lait.icone} ${lait.nom} cette nuit` : willEat ? '🥛 Lait cette nuit' : '⚠️ Sans paille';
  return `
    <article class="card animal-card ancre${willEat ? '' : ' hungry'}" id="animal-${v.id}">
      <span class="animal-art">${artPx(['cow'], '', v.id, 'grow')}</span>
      <strong>Vache n°${cowNumber(v)}</strong>
      <span class="animal-state${willEat ? '' : ' alert'}">${etat}</span>
    </article>`;
}

// Carte « Herbes de montagne » de l'Étable : le stock (une trouvaille de la
// montagne) et le bouton qui les donne (ou non) aux vaches, chaque nuit, à la
// place de leur paille : elles donnent alors du lait d'alpage.
function herbsCard(cCount) {
  const herbes = DATA.items[DATA.PATURAGE.herbes];
  const lait = DATA.items[DATA.ANIMAUX.vache.laitAlpage];
  const stock = herbStock(state);
  const on = herbsOn(state);
  const n = cowsOnHerbs(state);
  if (!cCount && !stock && !on) return '';
  const parVache = DATA.ANIMAUX.vache.herbesParNuit;
  let etat;
  if (!on) etat = `<span class="muted">Les vaches mangent leur paille. Nourries aux herbes (${formatNumber(parVache)} par vache et par nuit, à la place de la paille), elles donnent du ${lait.nom.toLowerCase()}.</span>`;
  else if (!cCount) etat = '<span class="muted">Pas de vache à nourrir.</span>';
  else if (n > 0) etat = `<span>${lait.icone} ${plural(n, 'vache')} au ${lait.nom.toLowerCase()} cette nuit${n < cCount ? ` ; les autres mangent leur paille` : ''}.</span>`;
  else etat = '<span class="alert">Plus d\'herbes : cueille-les dans les prés de la montagne (le train, à la gare de la ville).</span>';
  return `
    <div class="card ancre" id="etable-herbes">
      <span class="card-title"><span><span aria-hidden="true">${herbes.icone}</span> ${herbes.nom} : <span class="num">${formatNumber(stock)}</span></span><span class="chip${on ? ' badge' : ''}">${on ? '✅ données aux vaches' : 'pas données'}</span></span>
      ${etat}
      <button type="button" class="btn${on ? '' : ' primary'}" data-action="cow-herbs" data-on="${on ? '0' : '1'}" aria-pressed="${on}"${on || cCount ? '' : ' disabled'}>${on ? '🌾 Revenir à la paille' : `${herbes.icone} Nourrir les vaches aux herbes`}</button>
    </div>`;
}

// Section « Moutons et vaches » de l'Étable. (Le nom de la fonction et
// state.paturage sont historiques.) L'essentiel seulement : places, paille, animaux ; les
// règles sont dans « ? ».
export function renderPaturage() {
  const p = state.paturage;
  const P = DATA.PATURAGE;
  const M = DATA.ANIMAUX.mouton;
  const V = DATA.ANIMAUX.vache;
  const straw = DATA.items[P.nourriture];
  if (!p.construit) {
    const cost = P.deblocage;
    return `
      <div class="section-head"><h3>${icon('paturage')}Moutons et vaches</h3>${helpBtn('paturage')}</div>
      <div class="card">
        <button type="button" class="btn primary" data-action="build-paturage"${canPay(cost) ? '' : ' disabled'}>Préparer ${formatPlaces(P.placesDepart)} pour les moutons et les vaches (${costLabel(cost)})</button>
      </div>`;
  }
  const sCount = sheepCount(state);
  const cCount = cowCount(state);
  const sFree = freeSheepPlaces(state);
  const cost = pastureCost(state);
  const occupied = stableOccupied(state);
  const pct = p.places > 0 ? Math.min(100, Math.round((occupied / p.places) * 100)) : 0;
  const ready = sheepToShear(state);
  const need = strawNeed(state);
  const stock = strawStock(state);
  const missing = strawMissing(state);
  const fed = strawPlan();
  let hint = '';
  if (sCount === 0 && cCount === 0) hint = '<span class="muted">Aucun animal : achètes-en au Marché.</span>';
  else if (sFree === 0) hint = '<span class="alert">⚠️ Plus de place : achètes-en une.</span>';
  // Les places s'achètent à la suite, tant que les pièces suffisent (voir buyPasture()).
  const buyOk = canPay(cost);
  return `
    <div class="section-head">
      <h3>${icon('paturage')}Moutons et vaches · ${formatPlaces(p.places)}</h3>
      <span class="chips">${autoChip('paturage', 'Tond tout seul les moutons dont la laine est prête, pendant la nuit')}${ready > 0 ? `<span class="chip badge">🧶 ${ready} à tondre</span>` : ''}${helpBtn('paturage')}</span>
    </div>
    <div class="card">
      <span class="card-title"><span class="big" aria-label="Moutons et vaches">${M.icone} ${sCount} · ${V.icone} ${cCount}</span><span class="chip num" title="Places occupées">${formatNumber(occupied)} / ${formatNumber(p.places)} places</span></span>
      <span class="bar" role="progressbar" aria-label="Places occupées" aria-valuemin="0" aria-valuemax="${p.places}" aria-valuenow="${occupied}"><span class="bar-fill${sFree === 0 ? ' warn' : ''}" style="width:${pct}%"></span></span>
      ${hint}
      <button type="button" class="btn" data-action="buy-pasture"${buyOk ? '' : ' disabled'}>Acheter une place (${costLabel(cost)})</button>
    </div>
    <div class="card ancre" id="etable-paille">
      <span class="card-title"><span><span aria-hidden="true">${straw.icone}</span> Paille : <span class="num">${formatQty(stock)} / ${formatQty(need)}</span> pour cette nuit</span><span class="chip${missing > 0 ? ' warn' : ''}">${missing > 0 ? `⚠️ il en manque ${formatNumber(missing)}` : '✅ assez'}</span></span>
      ${missing > 0 ? '<span class="alert">Mouds du blé au Moulin : 1 blé donne 1 paille.</span>' : ''}
    </div>
    ${herbsCard(cCount)}
    ${sCount + cCount > 0 ? `<div class="animal-grid ancre" id="etable-animaux">${p.moutons.map((m) => sheepCard(m, fed)).join('')}${p.vaches.map((v) => cowCard(v, fed)).join('')}</div>` : ''}`;
}

// Pastille « Automatique » : les tâches que l'Arbre des technologies automatise ici.
export function autoChip(id, title) {
  if (!isAutomated(state, id)) return '';
  const taches = (AUTO_TACHES[id] || []).filter((t) => techAuto(state, t, id));
  const noms = { arrosage: 'arrosage', recolte: 'récolte', semis: 'semis', nourrissage: 'nourrissage', tonte: 'tonte' };
  return `<span class="chip auto" title="${title}">🤖 ${taches.map((t) => noms[t]).join(', ')}</span>`;
}

// Arbre v2 (Outils de jardin) : « Arroser tout » et « Récolter tout ».
// Fluidité (FLU-09, FLU-10, FLU-11) : « Planter partout », « Arroser tout » et « Récolter
// tout », dès le niveau 1, avec leur coût (eau, énergie) ; un bouton qui ne peut pas servir
// dit pourquoi, en toutes lettres.
export function groupButtons(lieu) {
  const plots = allPlots(state).filter((p) => p.lieu === lieu);
  const vides = plots.filter((p) => !p.culture).length;
  const aArroser = plots.filter((p) => p.culture && !p.arrose && !isMature(p));
  const murs = plots.filter((p) => p.culture && isMature(p)).length;
  const remise = (n) => n - Math.floor((n * (techFlag(state, 'groupeEconome') || 0)) / 100);
  const btns = [];
  const notes = [];
  if (vides) {
    btns.push(`<button type="button" class="btn" data-action="plant-all-open" data-lieu="${lieu}">🌱 Planter partout (${vides} vide${vides > 1 ? 's' : ''})</button>`);
  }
  if (aArroser.length) {
    const litres = aArroser.reduce((t, p) => t + waterCost(state, p), 0);
    const energie = remise(aArroser.length * actionCost(state, 'arroser'));
    const eau = state.eauMl / 1000;
    let manque = '';
    if (eau + 1e-9 < litres) manque = `Il manque ${formatQty(litres - eau)} L d'eau pour tout arroser.`;
    else if ((Number(state.energie) || 0) < energie) manque = `Il manque ${formatEnergy(energie - (Number(state.energie) || 0))} d'énergie pour tout arroser.`;
    btns.push(`<button type="button" class="btn" data-action="water-all" data-lieu="${lieu}"${manque ? ' disabled' : ''}>💧 Arroser tout (${aArroser.length} · ${formatQty(litres)} L · ⚡ ${formatEnergy(energie)})</button>`);
    if (manque) notes.push(manque);
  }
  if (murs) {
    const energie = remise(murs * actionCost(state, 'recolter'));
    const manque = (Number(state.energie) || 0) < energie ? `Il manque ${formatEnergy(energie - (Number(state.energie) || 0))} d'énergie pour tout récolter.` : '';
    btns.push(`<button type="button" class="btn" data-action="harvest-all" data-lieu="${lieu}"${manque ? ' disabled' : ''}>🧺 Récolter tout (${murs} · ⚡ ${formatEnergy(energie)})</button>`);
    if (manque) notes.push(manque);
  }
  return btns.join('') + notes.map((n) => `<span class="muted group-note">${n}</span>`).join('');
}

// FLU-09 : choix de la culture pour toutes les parcelles vides d'un lieu.
function openPlantAllModal(lieu) {
  tel('modal', 'plant');
  const vides = allPlots(state).filter((p) => p.lieu === lieu && !p.culture).length;
  const rows = plantableCropsFor(state, lieu)
    .map((c) => {
      const def = DATA.crops[c];
      const n = seedStock(state, c);
      const stock = seedLabel(c);
      return `
        <button type="button" class="btn plant-choice" data-action="plant-all" data-lieu="${lieu}" data-crop="${c}"${n >= 1 ? '' : ' disabled'}>
          <span>${def.icone} ${def.nom}</span>
          <span class="muted">${stock} : ${formatQty(n)} pour ${vides} parcelle${vides > 1 ? 's' : ''} · ${def.stades} jours · ⚡ ${formatEnergy(Math.min(vides, Math.floor(n)) * actionCost(state, 'planter'))}</span>
        </button>`;
    })
    .join('');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal bois" role="dialog" aria-modal="true" aria-labelledby="plant-title" data-stop-propagation>
        <h2 id="plant-title">🌱 Planter partout</h2>
        <p class="muted">La même culture sur les ${vides} parcelle${vides > 1 ? 's' : ''} vide${vides > 1 ? 's' : ''}, autant que tes graines et ton énergie le permettent.</p>
        <div class="stack">${rows}</div>
        <button type="button" class="btn" data-action="close-modal">Annuler</button>
      </div>
    </div>
  `;
}

function semisLabel(p) {
  if (p.semis === 'off') return '⛔ Semis auto : désactivé';
  if (p.semis === 'verrou' && p.verrou && DATA.crops[p.verrou]) return `🔒 Semis auto : ${DATA.crops[p.verrou].icone} ${DATA.crops[p.verrou].nom}`;
  return '🔁 Semis auto : même culture';
}

// Bouton d'icône : l'emoji devient son icône en pixel art ; le libellé est dans title / aria-label.
function iconBtn(emoji, label, attrs, { primary = false, done = false, disabled = false } = {}) {
  const cls = `btn icon-btn-px${primary ? ' primary' : ''}${done ? ' done' : ''}`;
  return `<button type="button" class="${cls}" ${attrs} title="${label}" aria-label="${label}"${disabled ? ' disabled' : ''}>${emoji}</button>`;
}

// Automatisation de la parcelle (semis automatique). Tant que l'Arbre des technologies ne
// l'a pas débloquée, le bouton est là, grisé, pour qu'on sache qu'elle existe.
function autoButton(p) {
  // FLU-27 : rien tant que le semis automatique n'est pas débloqué (la carte garde sa hauteur :
  // le bouton principal reste sur la ligne)
  if (!techAuto(state, 'semis', p.lieu)) return '';
  return iconBtn('🤖', semisLabel(p).replace(/^\S+ /, ''), `data-action="semis-open" data-id="${p.id}"`, { done: p.semis !== 'off' });
}

// Fiche d'une parcelle : « #n », la culture et son icône, une jauge en cases (une par stade,
// sans texte) et des boutons d'icônes (arroser ou récolter, automatisation).
export function plotCard(p, n) {
  const head = (name, emoji) =>
    `<span class="plot-head"><span class="plot-num" role="img" aria-label="Parcelle ${n}">${pxText(`#${n}`)}</span><span class="plot-name">${name}</span>${emoji ? `<span class="plot-ico" aria-hidden="true">${emoji}</span>` : ''}</span>`;
  if (!p.culture) {
    const seedsAvailable = plantableCropsFor(state, p.lieu).some((c) => seedStock(state, c) > 0);
    return `
      <div class="card plot ancre empty" id="plot-${p.id}">
        ${head('Vide', '')}
        ${pxGauge(0, 4, 'Parcelle vide', 'off')}
        <span class="plot-btns">${iconBtn('🌱', seedsAvailable ? 'Planter' : 'Planter : aucune graine', `data-action="plant-open" data-id="${p.id}"`, { primary: true, disabled: !seedsAvailable })}${autoButton(p)}</span>
      </div>`;
  }
  const def = DATA.crops[p.culture];
  const max = maxStage(p);
  const mature = isMature(p);
  const etat = mature ? 'mûre' : `stade ${p.stade} sur ${max}`;
  let main;
  if (mature) {
    const label = `Récolter : +${harvestYield(state, p.culture)} ${DATA.items[cropProduct(p.culture)].nom.toLowerCase()}`;
    main = iconBtn('🧺', label, `data-action="harvest" data-id="${p.id}"`, { primary: true });
  } else {
    const litres = waterCost(state, p);
    const noWater = state.eauMl < litres * 1000;
    const reste = growHoursLeft(state, p);
    const label = p.arrose ? `Arrosée : un stade dans ${Math.max(1, Math.ceil(reste))} h` : noWater ? `Arroser : il faut ${formatQty(litres)} L d'eau` : `Arroser (${formatQty(litres)} L)`;
    main = iconBtn('💧', label, `data-action="water" data-id="${p.id}"`, { done: p.arrose, disabled: p.arrose || noWater });
  }
  return `
    <div class="card plot ancre${mature ? ' mature' : ''}" id="plot-${p.id}" title="${def.nom} : ${etat}">
      ${head(def.nom, def.icone)}
      ${pxGauge(p.stade, max, `Croissance : ${etat}`, mature ? 'full' : '')}
      <span class="plot-btns">${main}${autoButton(p)}</span>
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
    return choice('verrou', c, `🔒 Toujours ${def.icone} ${def.nom}`, `${seedLabel(c)} en stock : ${formatQty(seedStock(state, c))}`);
  });
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal bois" role="dialog" aria-modal="true" aria-labelledby="semis-title" data-stop-propagation>
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
      const stock = seedLabel(c);
      return `
        <button type="button" class="btn plant-choice" data-action="plant" data-id="${plotId}" data-crop="${c}"${n > 0 ? '' : ' disabled'}>
          <span>${def.icone} ${def.nom}</span>
          <span class="muted">${stock} : ${formatQty(n)} · ${def.stades} jours · ${formatQty(waterCostFor(state, c))} L par arrosage</span>
        </button>`;
    })
    .join('');
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal bois" role="dialog" aria-modal="true" aria-labelledby="plant-title" data-stop-propagation>
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
  'harvest': (target) => {
    const result = applyResult(harvest(state, target.dataset.id));
    // version 1.18 : ce qui attend le personnage s'annonce par sa bulle, au ramassage
    if (result.ok && !result.aRamasser) showToast(harvestToast(result));
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
    if (result.ok) showToast('🌾 Une poule nourrie (1 blé pour 2 poules)');
  },
  'feed-all': () => {
    const result = applyResult(feedAllHens(state));
    if (result.ok) {
      showToast(`${result.nourries} poule${result.nourries > 1 ? 's' : ''} nourrie${result.nourries > 1 ? 's' : ''}.`);
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
  'cow-herbs': (target) => {
    const result = applyResult(setCowHerbs(state, target.dataset.on === '1'));
    if (result.ok) showToast(result.herbes ? `${DATA.items[DATA.PATURAGE.herbes].icone} Les vaches mangeront les herbes de montagne : lait d'alpage cette nuit.` : '🌾 Les vaches reviennent à la paille.');
  },
  'shear': (target) => {
    const result = applyResult(shear(state, target.dataset.id));
    if (result.ok && !result.aRamasser) showToast(`✂️ Tonte : +${result.laine} 🧶`);
  },
  'plant-all-open': (target) => {
    openPlantAllModal(target.dataset.lieu);
  },
  'plant-all': (target) => {
    closeModal();
    const result = applyResult(plantAll(state, target.dataset.lieu, target.dataset.crop));
    if (result.ok) {
      const def = DATA.crops[target.dataset.crop];
      const reste = result.vides - result.plantees;
      showToast(`🌱 ${plural(result.plantees, 'parcelle')} de ${def.nom.toLowerCase()} plantée${result.plantees > 1 ? 's' : ''}${reste ? ` · ${reste} restée${reste > 1 ? 's' : ''} vide${reste > 1 ? 's' : ''} : ${result.raison}` : ''}`);
    }
  },
  'water-all': (target) => {
    const result = applyResult(waterAll(state, target.dataset.lieu));
    if (result.ok) showToast(`💧 ${plural(result.arrosees, 'parcelle')} arrosée${result.arrosees > 1 ? 's' : ''}${result.sansEau ? ` · ${result.sansEau} sans eau` : ''}`);
  },
  'harvest-all': (target) => {
    const result = applyResult(harvestAll(state, target.dataset.lieu));
    if (result.ok && !result.aRamasser) showToast(`🧺 ${itemsSummary(result.items)}`);
  },
  'semis-open': (target) => {
    openSemisModal(target.dataset.id);
  },
  'semis-set': (target) => {
    closeModal();
    applyResult(setSemis(state, target.dataset.id, target.dataset.mode, target.dataset.crop));
  },
});
