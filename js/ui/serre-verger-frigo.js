import { DATA } from '../engine/catalog.js';
import { isBroken } from '../engine/devices.js';
import { deviceStatus } from '../engine/energy.js';
import {
  availableEnergy, buildFridge, fridgeCount, fridgeCounts, fridgeCoversNight, fridgeNightNeed,
  fridgeRate, fridgeUnits,
} from '../engine/fridge.js';
import { buildSerre, serreUpgradeCost, upgradeSerre } from '../engine/crops.js';
import {
  buildVerger, buyOrchardSlot, isTreeAdult, orchardFree, orchardSlotPrice,
  treeAge, treeNextHarvest,
} from '../engine/orchard.js';
import { formatCoins, formatNumber, formatQty, formatWh, formatWhRate } from '../engine/format.js';
import { state } from './store.js';
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
        <button type="button" class="btn primary" data-action="build-serre"${canPay(cost) ? '' : ' disabled'}>Construire la Serre (${costLabel(cost)})</button>
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

function treeCard(tree) {
  const V = DATA.VERGER;
  const def = V.ARBRES[tree.espece];
  const fruit = DATA.items[def.fruit];
  const age = Math.min(V.MATURITE, treeAge(state, tree));
  const adult = isTreeAdult(state, tree);
  const next = treeNextHarvest(state, tree);
  let line;
  if (!adult) line = `Jeune plant : ${age} / ${V.MATURITE} nuits`;
  else line = 'Adulte';
  const when = next === null ? '' : next === state.day ? 'Prochaine récolte : cette nuit' : `Prochaine récolte : nuit ${next} (dans ${nightsLabel(next - state.day)})`;
  return `
    <div class="card plot tree${adult ? ' adult' : ''}">
      <span class="card-title"><span>${def.nom}</span><span aria-hidden="true">${fruit.icone}</span></span>
      ${treeArt(tree)}
      <span class="muted">${line}${adult ? ` · ${V.FRUITS} ${fruit.nom.toLowerCase()}s par récolte` : ''}</span>
      <span class="bar" role="progressbar" aria-label="Croissance" aria-valuemin="0" aria-valuemax="${V.MATURITE}" aria-valuenow="${age}"><span class="bar-fill" style="width:${Math.round((age / V.MATURITE) * 100)}%"></span></span>
      <span class="muted">${when}</span>
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
        <span class="muted">${V.EMPLACEMENTS_DEPART} emplacements au départ. Pommiers et poiriers s'achètent ici, au Verger, sans arrosage : ${V.FRUITS} fruits toutes les ${V.PERIODE} nuits, toute l'année, à partir de ${V.MATURITE} nuits après la plantation.</span>
        <button type="button" class="btn primary" data-action="build-verger"${canPay(cost) ? '' : ' disabled'}>Aménager le Verger (${costLabel(cost)})</button>
      </div>`;
  }
  const price = orchardSlotPrice(state);
  const free = orchardFree(state);
  const slots = [];
  for (const t of v.arbres) slots.push(treeCard(t));
  for (let i = 0; i < free; i++) {
    slots.push(`
      <div class="card plot tree free">
        <span class="card-title"><span>Emplacement libre</span></span>
        ${artPx(['plot-soil'], 'plot-art')}
        <span class="muted">Achète un pommier ou un poirier ci-dessous.</span>
      </div>`);
  }
  const atMax = v.places >= V.EMPLACEMENTS_MAX;
  return `
    <div class="section-head">
      <h3>${icon('verger')}Verger · ${v.arbres.length} / ${v.places} emplacements</h3>
      ${helpBtn('verger')}
    </div>
    <div class="plots">${slots.join('')}</div>
    <div class="card">
      <span class="muted">Un arbre adulte donne ${V.FRUITS} fruits toutes les ${V.PERIODE} nuits, toute l'année.</span>
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
        <span class="muted">Les aliments rangés au frigo ne vieillissent plus. Capacité illimitée, mais il consomme en permanence : ${formatNumber(DATA.FRIGO.BASE_WH_S)} Wh/s + ${formatNumber(DATA.FRIGO.PAR_UNITE_MWH_S)} mWh/s par unité stockée. Appareil électrique : interrupteur, usure, pannes.</span>
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
      <span class="muted">Consommation à pleine charge : <span class="num">${formatWhRate(fridgeRate(state))}</span> · ${fridgeUnits(state)} unité${fridgeUnits(state) > 1 ? 's' : ''} au frais (onglet Inventaire › Frigo)</span>
      ${alert}
      ${wearHtml(d)}
      ${stationControls(d)}
    </div>`;
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
      <span class="card-title"><span>${fridgeIcon()} Réfrigérateur</span><span class="chip">${fridgeUnits(state)} unité${fridgeUnits(state) > 1 ? 's' : ''}</span></span>
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
  'buy-orchard-slot': () => {
    const result = applyResult(buyOrchardSlot(state));
    if (result.ok) showToast(`Emplacement acheté : ${result.places} au total (−${formatCoins(result.cost)} 💰)`);
  },
  'build-fridge': () => {
    const result = applyResult(buildFridge(state));
    if (result.ok) showToast(`🧊 Réfrigérateur construit (−${formatCoins(result.cost)} 💰)`);
  },
});
