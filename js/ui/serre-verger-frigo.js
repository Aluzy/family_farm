import { DATA } from '../engine/catalog.js';
import { currentSeason, seasonFactor, seasonNight, yearNight } from '../engine/seasons.js';
import { isBroken } from '../engine/devices.js';
import { deviceStatus } from '../engine/energy.js';
import {
  availableEnergy, buildFridge, fridgeCount, fridgeCounts, fridgeCoversNight, fridgeLots, fridgeNightNeed,
  fridgeRate, fridgeUnits,
} from '../engine/fridge.js';
import { buildSerre, serreUpgradeCost, upgradeSerre } from '../engine/crops.js';
import {
  buildVerger, buyOrchardSlot, isTreeAdult, orchardFree, orchardProducesOn, orchardSlotPrice, orchardWindow,
  treeAge, treeNextHarvest,
} from '../engine/orchard.js';
import { formatCoins, formatNumber, formatQty, formatWh, formatWhRate } from '../engine/format.js';
import { state } from './store.js';
import { applyResult } from './game-actions.js';
import { stageUsable } from './stage.js';
import { wearHtml } from './ferme.js';
import { autoChip, groupButtons, plotCard } from './elevage.js';
import { stationControls } from './cuisine.js';
import { nightsLabel, unitLabel } from './inventaire.js';
import { artSvg, icon, treeArt } from './animations.js';
import { helpBtn } from './aide.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, costLabel } from './common.js';

/* ---------- Lot 8 : calendrier, Serre, Verger, Réfrigérateur ---------- */

// Facteur de saison en % : « +10 % », « −30 % », « 0 % ».
export function formatFactor(f) {
  const d = f - 100;
  return d === 0 ? '0 %' : `${d > 0 ? '+' : '−'}${Math.abs(d)} %`;
}

// Calendrier : saison, nuit x / 10, et les modificateurs de la saison (en vert
// ce qui aide, en rouge ce qui freine ; la couleur n'est jamais la seule
// indication : le facteur est écrit).
export function renderCalendar() {
  const S = DATA.SAISONS;
  const id = currentSeason(state);
  const info = S.INFOS[id];
  const n = seasonNight(state);
  const chips = Object.keys(S.FACTEURS)
    .map((kind) => {
      const f = seasonFactor(state, kind);
      const cls = f > 100 ? ' auto' : f < 100 ? ' warn' : '';
      const sign = f > 100 ? '▲ ' : f < 100 ? '▼ ' : '';
      const k = S.FACTEURS[kind];
      return `<span class="chip${cls}" title="${k.nom} ${formatFactor(f)}"><span aria-hidden="true">${k.icone}</span> ${k.nom} ${sign}${formatFactor(f)}</span>`;
    })
    .join('');
  return `
    <div class="card season-card">
      <span class="card-title"><span>${info.icone} ${info.nom}</span><span class="chip">Nuit ${n} / ${S.LONGUEUR}</span></span>
      <span class="bar" role="progressbar" aria-label="Avancement de la saison" aria-valuemin="0" aria-valuemax="${S.LONGUEUR}" aria-valuenow="${n}"><span class="bar-fill" style="width:${Math.round((n / S.LONGUEUR) * 100)}%"></span></span>
      <span class="season-chips">${chips}</span>
      <span class="muted">Les modificateurs jouent sur la Zone de culture, l'eau des arrosages et le solaire. La Serre et les animaux les ignorent.</span>
    </div>`;
}

export function renderSerre() {
  const g = state.serre;
  if (!g.construit) {
    const cost = DATA.SERRE.CONSTRUCTION;
    return `
      <div class="section-head"><h3>${icon('serre')}Serre</h3>${helpBtn('serre')}</div>
      <div class="card">
        <span class="muted">Tomate, courgette, aubergine et poivron, plus trois cultures de rente exclusives à la Serre (cacao, vanille, café) : ${DATA.SERRE.PARCELLES[0]} parcelles au départ, +${DATA.SERRE.PARCELLES[1] - DATA.SERRE.PARCELLES[0]} par niveau. Aucun modificateur de saison : ni l'hiver ni l'été n'y changent rien.</span>
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
      <span class="chips">${autoChip('serre', 'Travaille tout seul, à 100 %, pendant la nuit')}<span class="chip" title="La Serre ignore les modificateurs de saison">🌡️ Sans saison</span>${helpBtn('serre')}</span>
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
  const inWindow = orchardProducesOn(state.day);
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
      <span class="muted">${when}${inWindow && adult ? ' · 🍎 en saison' : ''}</span>
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
        <span class="muted">${V.EMPLACEMENTS_DEPART} emplacements au départ. Pommiers et poiriers s'achètent ici, au Verger, sans arrosage : ${V.FRUITS} fruits toutes les ${V.PERIODE} nuits pendant la fin de l'été et l'automne, ${V.MATURITE} nuits après la plantation.</span>
        <button type="button" class="btn primary" data-action="build-verger"${canPay(cost) ? '' : ' disabled'}>Aménager le Verger (${costLabel(cost)})</button>
      </div>`;
  }
  const w = orchardWindow();
  const L = DATA.SAISONS.LONGUEUR;
  const price = orchardSlotPrice(state);
  const free = orchardFree(state);
  const slots = [];
  for (const t of v.arbres) slots.push(treeCard(t));
  for (let i = 0; i < free; i++) {
    slots.push(`
      <div class="card plot tree free">
        <span class="card-title"><span>Emplacement libre</span></span>
        ${artSvg(['plot-soil'], 'plot-art')}
        <span class="muted">Achète un pommier ou un poirier ci-dessous.</span>
      </div>`);
  }
  const nightOfYear = yearNight(state.day);
  const season = nightOfYear >= w.debut && nightOfYear <= w.fin ? '🍎 Les fruits sont de saison.' : `Les fruits arrivent de la nuit ${w.debut} à la nuit ${w.fin} de l'année (l'année compte ${L * DATA.SAISONS.ORDRE.length} nuits).`;
  const atMax = v.places >= V.EMPLACEMENTS_MAX;
  return `
    <div class="section-head">
      <h3>${icon('verger')}Verger · ${v.arbres.length} / ${v.places} emplacements</h3>
      ${helpBtn('verger')}
    </div>
    <div class="plots">${slots.join('')}</div>
    <div class="card">
      <span class="muted">${season}</span>
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

// Frigo (Inventaire) : contenu, conservation figée, ce qu'on peut sortir.
function fridgeRowHtml(item) {
  const it = DATA.items[item];
  const n = fridgeCount(state, item);
  const lots = fridgeLots(state, item)
    .map((l) => `<li><span>${l.qty} ${unitLabel(item, l.qty)} — ${nightsLabel(l.nightsLeft)} <span class="muted">(figé)</span></span></li>`)
    .join('');
  return `
    <div class="inv-row">
      <div class="inv-main"><span><span aria-hidden="true">${it.icone}</span> ${it.nom}</span><span class="big num">${formatQty(n)}</span></div>
      <ul class="lot-list" aria-label="Lots au frigo">${lots}</ul>
      <span class="device-actions">
        <button type="button" class="btn" data-action="fridge-out" data-item="${item}" data-qty="1">Sortir 1</button>
        <button type="button" class="btn" data-action="fridge-out" data-item="${item}" data-qty="all">Tout sortir</button>
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
    <div class="inv-group">
      ${items.length ? items.map(fridgeRowHtml).join('') : '<p class="hint">Le frigo est vide. Range des aliments frais depuis l\'onglet Frais.</p>'}
    </div>`;
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
