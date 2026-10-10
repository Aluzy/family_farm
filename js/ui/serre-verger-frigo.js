import { DATA } from '../engine/catalog.js';
import { isBroken } from '../engine/devices.js';
import { deviceStatus } from '../engine/energy.js';
import {
  availableEnergy, buildFridge, fridgeCount, fridgeCounts, fridgeCoversNight, fridgeNightNeed,
  fridgeCapacity, fridgeRate, fridgeUnits, fridgeUpgradeCost, upgradeFridge,
} from '../engine/fridge.js';
import { buildSerre, serreUpgradeCost, upgradeSerre } from '../engine/crops.js';
import {
  buildVerger, buyOrchardSlot, harvestTree, isTreeAdult, orchardSlotPrice, plantTree,
  treeAge, treeAt, treeNextHarvest, treeStageName,
} from '../engine/orchard.js';
import { canAfford } from '../engine/stamina.js';
import { techAuto } from '../engine/techtree.js';
import { formatCoins, formatNumber, formatQty, formatWh, formatWhRate } from '../engine/format.js';
import { setVergerCase, state, vergerCase } from './store.js';
import { applyResult } from './game-actions.js';
import { stageUsable } from './stage.js';
import { wearHtml } from './ferme.js';
import { autoChip, groupButtons, plotCard } from './elevage.js';
import { stationControls } from './cuisine.js';
import { nightsLabel } from './inventaire.js';
import { artPx, icon, treeArt } from './animations.js';
import { pxText } from './pixel-art.js';
import { helpBtn } from './aide.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { refresh } from './render.js';
import { openStageWindow, stageWindow } from './stage-windows.js';
import { canPay, costLabel } from './common.js';

/* ---------- Lot 8 : Serre, Verger, Réfrigérateur ---------- */

export function renderSerre() {
  const g = state.serre;
  if (!g.construit) {
    const cost = DATA.SERRE.CONSTRUCTION;
    return `
      <div class="section-head"><h3>${icon('serre')}Serre</h3>${helpBtn('serre')}</div>
      <div class="card">
        <span class="muted">Tomate, courgette, aubergine et poivron, plus trois cultures de rente exclusives à la Serre (cacao, vanille, café) : ${DATA.SERRE.PARCELLES[0]} parcelles au départ, +${DATA.SERRE.PARCELLES[1] - DATA.SERRE.PARCELLES[0]} par niveau.</span>
        <button type="button" class="btn primary" data-action="build-serre"${canPay(cost) ? '' : ' disabled'}>Réparer la Serre (${costLabel(cost)})</button>
      </div>`;
  }
  const up = serreUpgradeCost(state);
  const upBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Serre au niveau maximum</button>'
      : `<button type="button" class="btn" data-action="upgrade-serre"${canPay(up) ? '' : ' disabled'}>Agrandir : niveau ${g.niveau + 1}, ${DATA.SERRE.PARCELLES[g.niveau]} parcelles (${costLabel(up)})</button>`;
  return `
    <div class="section-head">
      <h3>${icon('serre')}Serre · niveau ${g.niveau}</h3>
      <span class="chips">${autoChip('serre', 'Travaille tout seul, à 100 %, pendant la nuit')}${helpBtn('serre')}</span>
    </div>
    <div class="plots">${g.parcelles.map((p, i) => plotCard(p, i + 1)).join('')}</div>
    <div class="row plot-foot">${groupButtons('serre')}${upBtn}</div>
  `;
}

// Version 1.13 (v2, lot 9) : une carte par case du Verger. Un arbre montre son dessin,
// sa croissance et, en fruits, le bouton « Cueillir » ; une case libre propose de planter.
function treeCard(tree) {
  const V = DATA.VERGER;
  const def = V.ARBRES[tree.espece];
  const fruit = DATA.items[def.fruit];
  const age = Math.min(V.MATURITE, treeAge(state, tree));
  const adult = isTreeAdult(state, tree);
  const next = treeNextHarvest(state, tree);
  const stade = treeStageName(state, tree);
  let foot;
  if (tree.fruits) {
    foot = `<button type="button" class="btn primary" data-action="harvest-tree" data-id="${tree.id}"${canAfford(state, 'cueillir') ? '' : ' disabled'}>Cueillir ${V.FRUITS} ${fruit.icone}</button>`;
  } else {
    foot = `<span class="muted">${next === state.day ? 'Fruits cette nuit' : `Fruits nuit ${next} (dans ${nightsLabel(next - state.day)})`}</span>`;
  }
  return `
    <div class="card plot tree${adult ? ' adult' : ''}${tree.fruits ? ' ready' : ''}">
      <span class="card-title"><span>${def.nom}</span><span aria-hidden="true">${fruit.icone}</span></span>
      ${treeArt(tree)}
      <span class="muted">${stade}${adult ? '' : ` · ${age} / ${V.MATURITE} nuits`}</span>
      ${adult ? '' : `<span class="bar" role="progressbar" aria-label="Croissance" aria-valuemin="0" aria-valuemax="${V.MATURITE}" aria-valuenow="${age}"><span class="bar-fill" style="width:${Math.round((age / V.MATURITE) * 100)}%"></span></span>`}
      ${foot}
    </div>`;
}

function freeCard(c) {
  return `
    <div class="card plot tree free">
      <span class="card-title"><span>Emplacement ${c + 1}</span></span>
      ${artPx(['plot-soil'], 'plot-art')}
      <button type="button" class="btn" data-action="tree-slot" data-case="${c}">Planter un arbre</button>
    </div>`;
}

// « Choisir un arbre » : ouvert par un appui sur un emplacement libre (carte ou fenêtre).
function treeChoice() {
  const c = vergerCase;
  if (c === null || c >= state.verger.places || treeAt(state, c)) return '';
  const V = DATA.VERGER;
  const rows = Object.entries(V.ARBRES).map(([espece, def]) => {
    const fruit = DATA.items[def.fruit];
    return `
      <div class="shop-row">
        <div class="inv-main"><span><span aria-hidden="true">${fruit.icone}</span> ${def.nom}</span><span class="muted">${formatCoins(def.prix)} 💰</span></div>
        <span class="muted">Premiers fruits ${V.MATURITE} nuits après la plantation (${V.STADES.slice(0, 3).join(', ').toLowerCase()}, ${V.NUITS_STADE} nuits chacun), puis ${V.FRUITS} ${fruit.nom.toLowerCase()}s toutes les ${V.PERIODE} nuits.</span>
        <button type="button" class="btn primary" data-action="plant-tree" data-species="${espece}" data-case="${c}"${canPay(def.prix) ? '' : ' disabled'}>Planter un ${def.nom.toLowerCase()} (${formatCoins(def.prix)} 💰)</button>
      </div>`;
  }).join('');
  return `
    <div class="card tree-choice">
      <span class="card-title"><span>🌱 Choisir un arbre · emplacement ${c + 1}</span><button type="button" class="icon-btn" data-action="tree-slot-cancel" aria-label="Fermer le choix" title="Fermer">✕</button></span>
      ${rows}
    </div>`;
}

export function renderVerger() {
  const v = state.verger;
  const V = DATA.VERGER;
  if (!v.construit) {
    const cost = V.CONSTRUCTION;
    return `
      <div class="section-head"><h3>${icon('verger')}Verger</h3>${helpBtn('verger')}</div>
      <div class="card">
        <span class="muted">${V.EMPLACEMENTS_DEPART} emplacements au départ. Appuie sur un emplacement pour y planter un pommier ou un poirier, sans arrosage : ${V.FRUITS} fruits toutes les ${V.PERIODE} nuits, toute l'année, à partir de ${V.MATURITE} nuits après la plantation.</span>
        <button type="button" class="btn primary" data-action="build-verger"${canPay(cost) ? '' : ' disabled'}>Aménager le Verger (${costLabel(cost)})</button>
      </div>`;
  }
  const price = orchardSlotPrice(state);
  const slots = [];
  for (let c = 0; c < v.places; c++) {
    const t = treeAt(state, c);
    slots.push(t ? treeCard(t) : freeCard(c));
  }
  const atMax = v.places >= V.EMPLACEMENTS_MAX;
  const auto = techAuto(state, 'recolte', 'verger');
  return `
    <div class="section-head">
      <h3>${icon('verger')}Verger · ${v.arbres.length} / ${v.places} emplacements</h3>
      <span class="chips">${auto ? autoChip('verger', 'Les arbres en fruits sont cueillis la nuit (Récolte du verger)') : ''}${helpBtn('verger')}</span>
    </div>
    ${treeChoice()}
    <div class="plots">${slots.join('')}</div>
    <div class="card">
      <span class="muted">Un arbre adulte se couvre de ${V.FRUITS} fruits toutes les ${V.PERIODE} nuits après la cueillette, toute l'année.${auto ? '' : ' Ils attendent sur l\'arbre que tu les cueilles.'}</span>
      ${atMax
        ? `<span class="muted">Le Verger a atteint sa taille maximale (${V.EMPLACEMENTS_MAX} emplacements).</span>`
        : `<button type="button" class="btn" data-action="buy-orchard-slot"${canPay(price) ? '' : ' disabled'}>Acheter un emplacement (${costLabel(price)})</button>`}
    </div>
  `;
}

// ❄️ quand le frigo est alimenté ; ⚠️ en panne, éteint ou hors tension.
function fridgeIcon() {
  const f = state.frigo;
  if (!f.construit) return '';
  const d = f.appareil;
  return !isBroken(d) && d.allume && f.alimente ? '❄️' : '⚠️';
}

export function renderFridgeCard() {
  const f = state.frigo;
  if (!f.construit) {
    const cost = DATA.FRIGO.CONSTRUCTION;
    return `
      <div class="card">
        <span class="card-title"><span>${icon('frigo')}Réfrigérateur</span><span class="chips"><span class="chip">Non construit</span>${helpBtn('frigo')}</span></span>
        <span class="muted">Les aliments rangés au frigo ne vieillissent plus. Il contient ${formatNumber(DATA.FRIGO.CAPACITE[0])} unités (jusqu'à ${formatNumber(DATA.FRIGO.CAPACITE[DATA.FRIGO.CAPACITE.length - 1])} en l'améliorant) et consomme ${formatNumber(DATA.FRIGO.PAR_UNITE_MWH_S)} mWh/s par unité stockée (rien s'il est vide). Appareil électrique : interrupteur, usure, pannes.</span>
        <button type="button" class="btn primary" data-action="build-fridge"${canPay(cost) ? '' : ' disabled'}>Construire le Réfrigérateur (${costLabel(cost)})</button>
      </div>`;
  }
  const d = f.appareil;
  const st = deviceStatus(state, d);
  const ok = fridgeIcon() === '❄️';
  const need = fridgeNightNeed(state);
  const avail = availableEnergy(state);
  const alert = !fridgeCoversNight(state)
    ? `<span class="alert">⚠️ La batterie ne couvrira pas la nuit : il faut <span class="num">${formatWh(need + 999)}</span>, il y en a <span class="num">${formatWh(avail)}</span>. Les aliments perdront une nuit de conservation.</span>`
    : '';
  const badge = st.badge ? `<span class="chip warn">⚠️ ${st.badge}</span>` : '';
  return `
    <div class="card fridge ancre ${ok ? 'cold' : 'warm'}" id="dev-frigo">
      <span class="card-title"><span>${icon('frigo')}${fridgeIcon()} Réfrigérateur</span><span class="chips"><span class="chip${st.code === 'panne' ? ' panne' : ''}">${st.label}</span>${helpBtn('frigo')}</span></span>
      ${badge}
      <span class="big">${formatWhRate(d.conso)}</span>
      <span class="muted">Consommation : <span class="num">${formatWhRate(fridgeRate(state))}</span> (${formatNumber(DATA.FRIGO.PAR_UNITE_MWH_S)} mWh/s par unité) · onglet Inventaire › Frigo</span>
      ${fridgeFillHtml()}
      ${alert}
      ${fridgeUpgradeHtml()}
      ${wearHtml(d)}
      ${stationControls(d)}
    </div>`;
}

// Version 1.10 : remplissage du frigo (unités / capacité) et amélioration.
function fridgeFillHtml() {
  const n = fridgeUnits(state);
  const cap = fridgeCapacity(state);
  const pct = cap ? Math.round((n * 100) / cap) : 0;
  return `<span>Niveau ${state.frigo.niveau} · <span class="num">${n} / ${cap}</span> unités au frais</span>
      <span class="bar" role="progressbar" aria-label="Remplissage du frigo" aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${n}"><span class="bar-fill${n >= cap ? ' warn' : ''}" style="width:${pct}%"></span></span>`;
}

function fridgeUpgradeHtml() {
  const cost = fridgeUpgradeCost(state);
  if (cost === null) return '<span class="muted">Niveau maximum.</span>';
  const next = DATA.FRIGO.CAPACITE[state.frigo.niveau];
  return `<button type="button" class="btn" data-action="upgrade-fridge"${canPay(cost) ? '' : ' disabled'}>Agrandir : ${next} unités (${costLabel(cost)})</button>`;
}

// Frigo (Inventaire) : une fiche par aliment, comme les parcelles : l'icône, le nom, le
// nombre au frais en police pixel, et les boutons pour sortir. Ni jauge ni détail des lots :
// au frais la conservation est figée, et ce qui va périmer est signalé dans l'onglet Frais.
function fridgeRowHtml(item) {
  const it = DATA.items[item];
  const n = fridgeCount(state, item);
  return `
    <div class="card plot fridge-item" title="${it.nom} : ${formatQty(n)} au frais">
      <span class="plot-head"><span class="plot-ico" aria-hidden="true">${it.icone}</span><span class="plot-name">${it.nom}</span><span class="plot-qty" role="img" aria-label="${formatQty(n)} au frais">${pxText(`x${Math.round(n)}`)}</span></span>
      <span class="plot-btns">
        <button type="button" class="btn" data-action="fridge-out" data-item="${item}" data-qty="1">Sortir 1</button>
        <button type="button" class="btn" data-action="fridge-out" data-item="${item}" data-qty="all">Tout</button>
      </span>
    </div>`;
}

export function renderFridgeTab() {
  const f = state.frigo;
  if (!f.construit) {
    return `<p class="hint">🧊 Pas encore de Réfrigérateur : construis-le ${stageUsable() ? 'dans la Maison, onglet Installations' : 'dans l\'onglet Ferme'} (${costLabel(DATA.FRIGO.CONSTRUCTION)}). Les aliments qui y sont rangés ne vieillissent plus.</p>`;
  }
  const counts = fridgeCounts(state);
  const items = Object.keys(DATA.items).filter((k) => counts[k] > 0);
  const ok = fridgeIcon() === '❄️';
  return `
    <div class="card fridge ${ok ? 'cold' : 'warm'}">
      <span class="card-title"><span>${fridgeIcon()} Réfrigérateur</span><span class="chip${fridgeUnits(state) >= fridgeCapacity(state) ? ' warn' : ''}">${fridgeUnits(state)} / ${fridgeCapacity(state)}</span></span>
      <span class="muted">${ok ? 'Alimenté : la conservation est figée.' : '⚠️ Pas alimenté : si le froid manque plus de la moitié de l\'éveil, ou toute la nuit, chaque lot perd une nuit.'} Consommation : <span class="num">${formatWhRate(fridgeRate(state))}</span>.</span>
      ${!fridgeCoversNight(state) ? '<span class="alert">⚠️ La batterie ne couvrira pas la nuit.</span>' : ''}
      <span class="muted">La famille mange aussi le contenu du frigo, après ce qui est dans l'inventaire. Le Marché et les recettes utilisent l'inventaire : sors ce qu'il te faut.</span>
    </div>
    ${items.length ? `<div class="plots fridge-items">${items.map(fridgeRowHtml).join('')}</div>` : '<p class="hint">Le frigo est vide. Range des aliments frais depuis l\'onglet Frais.</p>'}`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'build-serre': () => {
    const result = applyResult(buildSerre(state));
    if (result.ok) showToast(`🏡 Serre construite : ${state.serre.parcelles.length} parcelles (−${formatCoins(result.cost)} 💰)`);
  },
  'upgrade-serre': () => {
    applyResult(upgradeSerre(state));
  },
  'build-verger': () => {
    const result = applyResult(buildVerger(state));
    if (result.ok) showToast(`🌳 Verger aménagé : ${state.verger.places} emplacements`);
  },
  // Version 1.13 : un emplacement libre (carte ou fenêtre) ouvre le choix de l'arbre.
  'tree-slot': (target) => {
    setVergerCase(Number(target.dataset.case));
    if (stageWindow !== 'verger') openStageWindow('verger');
    else refresh();
  },
  'tree-slot-cancel': () => {
    setVergerCase(null);
    refresh();
  },
  'plant-tree': (target) => {
    const espece = target.dataset.species;
    const result = applyResult(plantTree(state, espece, Number(target.dataset.case)));
    if (result.ok) {
      setVergerCase(null);
      showToast(`🌱 ${DATA.VERGER.ARBRES[espece].nom} planté (−${formatCoins(result.cost)} 💰)`);
    }
  },
  'harvest-tree': (target) => {
    const result = applyResult(harvestTree(state, target.dataset.id));
    if (result.ok) showToast(`+${result.qty} ${DATA.items[result.item].icone}`);
  },
  'buy-orchard-slot': () => {
    const result = applyResult(buyOrchardSlot(state));
    if (result.ok) showToast(`Emplacement acheté : ${result.places} au total (−${formatCoins(result.cost)} 💰)`);
  },
  'upgrade-fridge': () => {
    const result = applyResult(upgradeFridge(state));
    if (result.ok) showToast(`🧊 Réfrigérateur niveau ${result.niveau} : ${result.capacite} unités (−${formatCoins(result.cost)} 💰)`);
  },
  'build-fridge': () => {
    const result = applyResult(buildFridge(state));
    if (result.ok) showToast(`🧊 Réfrigérateur construit (−${formatCoins(result.cost)} 💰)`);
  },
});
