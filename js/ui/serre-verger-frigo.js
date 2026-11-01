import { DATA } from '../engine/catalog.js';
import { isBroken } from '../engine/devices.js';
import { countItem } from '../engine/inventory.js';
import { deviceStatus } from '../engine/energy.js';
import {
  availableEnergy, buildFridge, FRIGO_OBJET, fridgeCoversNight, fridgeNightNeed,
  fridgeCapacity, fridgeUnits, fridgeUpgradeCost, upgradeFridge,
} from '../engine/fridge.js';
import { serreCap, serreUpgradeCost, upgradeSerre } from '../engine/crops.js';
import {
  harvestTree, isTreeAdult, treeAge, treeNextHarvest, treeStageName,
} from '../engine/orchard.js';
import { canAfford } from '../engine/stamina.js';
import { techAuto } from '../engine/techtree.js';
import { formatCoins, formatNumber, formatWh } from '../engine/format.js';
import { state } from './store.js';
import { applyResult } from './game-actions.js';
import { wearHtml } from './ferme.js';
import { autoChip, groupButtons, plotCard } from './elevage.js';
import { stationControls } from './cuisine.js';
import { nightsLabel } from './inventaire.js';
import { artIcon, treeArt } from './animations.js';
import { helpBtn } from './aide.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, costLabel, itemsText } from './common.js';

/* ---------- Lot 8 : Serre, Verger, Réfrigérateur ---------- */

export function renderSerre() {
  const g = state.serre;
  if (!g.construit) {
    return `
      <div class="section-head"><h3>${artIcon('serre')}Serre</h3>${helpBtn('serre')}</div>
      <div class="card">
        <span class="muted">Bâtis une pièce close et poses-y le bac à semis (fabriqué à l'Atelier, menu ${DATA.ATELIER.ICONE} Construire) : c'est la Serre.</span>
      </div>`;
  }
  const up = serreUpgradeCost(state);
  const upBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Serre au niveau maximum</button>'
      : `<button type="button" class="btn" data-action="upgrade-serre"${canPay(up) ? '' : ' disabled'}>Agrandir : niveau ${g.niveau + 1}, jusqu'à ${DATA.SERRE.PARCELLES[g.niveau]} parcelles (${costLabel(up)})</button>`;
  return `
    <div class="section-head">
      <h3>${artIcon('serre')}Serre · niveau ${g.niveau}</h3>
      <span class="chips">${autoChip('serre', 'Travaille tout seul, à 100 %, pendant la nuit')}${helpBtn('serre')}</span>
    </div>
    <p class="muted">${g.parcelles.length} / ${serreCap(state)} parcelles labourées. Prends la houe et laboure les cases de la Serre pour y semer.</p>
    <div class="plots">${g.parcelles.map((p, i) => plotCard(p, i + 1)).join('')}</div>
    <div class="row plot-foot">${groupButtons('serre')}${upBtn}</div>
  `;
}

// Version 1.13 (v2, lot 9) : une carte par case du Verger. Un arbre montre son dessin,
// sa croissance et, en fruits, le bouton « Cueillir » ; une case libre propose de planter.
function treeCard(tree) {
  const V = DATA.VERGER;
  const def = V.ARBRES[tree.espece];
  const fruit = DATA.OBJETS[def.fruit];
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

export function renderVerger() {
  const v = state.verger;
  // pas d'emplacements : les arbres plantés dans le sol (étape 5b-8)
  const auto = techAuto(state, 'recolte', 'verger');
  return `
    <div class="section-head">
      <h3>${artIcon('verger')}Arbres fruitiers · ${v.arbres.length}</h3>
      <span class="chips">${auto ? autoChip('verger', 'Les arbres en fruits sont cueillis la nuit (Récolte du verger)') : ''}${helpBtn('verger')}</span>
    </div>
    <p class="muted">Achète de jeunes arbres à la calèche (onglet Acheter, les semences), puis plante-les dans le sol, dehors, avec la case ${DATA.ATELIER.ICONE}. Un appui sur un arbre en fruits le cueille.</p>
    ${v.arbres.length ? `<div class="plots">${v.arbres.map(treeCard).join('')}</div>` : ''}`;
}

// ❄️ quand le frigo est alimenté ; ⚠️ en panne, éteint ou hors tension.
export function fridgeIcon() {
  const f = state.frigo;
  if (!f.construit) return '';
  const d = f.appareil;
  return !isBroken(d) && d.allume && f.alimente ? '❄️' : '⚠️';
}

export function renderFridgeCard() {
  const f = state.frigo;
  if (!f.construit) {
    // acheté, il attend dans l'inventaire d'être posé dans la maison (un bloc, js/engine/blocs.js)
    const cost = DATA.FRIGO.PRIX_CONSTRUCTION, enMain = countItem(state, FRIGO_OBJET) > 0;
    return `
      <div class="card">
        <span class="card-title"><span>${artIcon('frigo')}Réfrigérateur</span><span class="chips"><span class="chip">${enMain ? 'À poser' : 'Non construit'}</span>${helpBtn('frigo')}</span></span>
        <span class="muted">Les aliments rangés au frigo ne vieillissent plus, et la famille y mange : posé dans la maison, il remplace la boîte à nourriture. Il contient ${formatNumber(DATA.FRIGO.CAPACITE[0])} unités (jusqu'à ${formatNumber(DATA.FRIGO.CAPACITE[DATA.FRIGO.CAPACITE.length - 1])} en l'améliorant) et consomme un peu de courant par unité stockée (rien s'il est vide). Appareil électrique : interrupteur, usure, pannes.</span>
        ${enMain
    ? '<span class="hint">Il est dans l\'inventaire : pose-le dans la maison avec 🔨 Construire.</span>'
    : `<button type="button" class="btn primary" data-action="build-fridge"${canPay(cost) ? '' : ' disabled'}>Acheter le Réfrigérateur (${costLabel(cost)})</button>`}
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
      <span class="card-title"><span>${artIcon('frigo')}${fridgeIcon()} Réfrigérateur</span><span class="chips"><span class="chip${st.code === 'panne' ? ' panne' : ''}">${st.label}</span>${helpBtn('frigo')}</span></span>
      ${badge}
      <span class="muted">${ok ? 'Alimenté : la conservation est figée.' : 'Pas alimenté.'}</span>
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

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({

  'upgrade-serre': () => {
    applyResult(upgradeSerre(state));
  },




  'harvest-tree': (target) => {
    const result = applyResult(harvestTree(state, target.dataset.id));
    // fiche 10 : cueillir arbre après arbre fait monter une seule notification par fruit
    if (result.ok && !result.aRamasser) notify(null, { cumul: { cle: `verger:${result.item}`, quantites: { [result.item]: result.qty }, texte: (t) => itemsText(t, 'gain') } });
  },

  'upgrade-fridge': () => {
    const result = applyResult(upgradeFridge(state));
    if (result.ok) notify(`🧊 Réfrigérateur niveau ${result.niveau} : ${result.capacite} unités (−${formatCoins(result.cost)} 💰)`);
  },
  'build-fridge': () => {
    const result = applyResult(buildFridge(state));
    if (result.ok) notify(`🧊 Réfrigérateur acheté (−${formatCoins(result.cost)} 💰) : pose-le dans la maison avec 🔨 Construire.`);
  },
});
