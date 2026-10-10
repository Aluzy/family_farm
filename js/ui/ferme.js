import { DATA } from '../engine/catalog.js';
import {
  batteryCapacity, efficiency, isBroken, isOwned, maintainCost, needsService, panelOutput, pumpFlow, repairCost,
  starterOf, tankCapacity, toggleDevice, upgradeCost, upgradeDevice, upgradeTank,
} from '../engine/devices.js';
import { hourOfDay } from '../engine/clock.js';
import { deviceStatus, energyStats } from '../engine/energy.js';
import { energyChip } from './energie.js';
import { zone2Open, zone2Plots } from '../engine/crops.js';
import { hoePanelHtml } from './houe.js';
import { renderStarterCards } from './depart.js';
import { isUnlocked } from '../engine/campaign.js';
import {
  formatCoins, formatLitres, formatLitresRate, formatNumber, formatWh, formatWhRate,
} from '../engine/format.js';
import { FERME_LINKS, hoeMode, setEcranFerme, state, tabAvailable, TABS } from './store.js';
import { telView } from './consent.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import {
  coopShown, herdShown, renderAchatArbres, renderAchatPoules, renderAchatTroupeau, setStageReturn,
  setStageWindow, stageReturn, stageWindow,
} from './stage-windows.js';
import { autoChip, groupButtons, plotCard, renderPaturage, renderPoulailler, renderSilo } from './elevage.js';
import { renderFridgeCard, renderSerre, renderVerger } from './serre-verger-frigo.js';
import { renderAteliers, renderMoulin } from './cuisine.js';
import { renderChapterBanner } from './chapitres.js';
import { icon } from './animations.js';
import { helpBtn, tutoTarget } from './aide.js';
import { registerActions } from './actions.js';
import { canPay, costLabel } from './common.js';

/* ---------- Ferme : cartes et écrans de détail ---------- */

const DEVICE_ICONS = { panneau: '☀️', batterie: '🔋', pompe: '⛲', moulin: '⚙️', presse: '🌻', frigo: '🧊' };
const DEVICE_NAMES = { panneau: 'Panneau solaire', batterie: 'Batterie', pompe: 'Pompe', moulin: 'Moulin', presse: 'Presse', frigo: 'Réfrigérateur' };

// Version 1.6 : un seul appareil de chaque type, son nom suffit.
export function deviceName(d) {
  return DEVICE_NAMES[d.type];
}

// Le soleil brille-t-il à l'heure actuelle de l'horloge ?
function sunText() {
  const h = hourOfDay(state);
  return h >= DATA.SOLEIL.DEBUT && h < DATA.SOLEIL.FIN
    ? `☀️ Soleil jusqu'à ${DATA.SOLEIL.FIN} h`
    : `🌙 Pas de soleil : le panneau produit de ${DATA.SOLEIL.DEBUT} h à ${DATA.SOLEIL.FIN} h`;
}

function alertLine(aEntretenir, enPanne) {
  const parts = [];
  if (enPanne) parts.push(`⛔ ${enPanne} en panne`);
  if (aEntretenir) parts.push(`⚠️ ${aEntretenir} à entretenir`);
  return parts.length ? `<span class="alert">${parts.join(' · ')}</span>` : '';
}

// En-tête des écrans ouverts depuis la Ferme.
export function backToFerme() {
  return '<div class="screen-head"><button type="button" class="btn" data-action="switch-tab" data-tab="ferme">← Ferme</button></div>';
}

// Raccourcis de la Ferme : Famille, Livre de recette, Arbre des technologies
// (les deux derniers seulement une fois débloqués).
function renderFermeLinks() {
  const links = FERME_LINKS.filter((id) => tabAvailable(id))
    .map((id) => TABS.find((t) => t.id === id))
    .map((t) => `<button type="button" class="ferme-link" data-action="switch-tab" data-tab="${t.id}"><span aria-hidden="true">${t.icon}</span><span>${t.label}</span></button>`)
    .join('');
  return links ? `<nav class="ferme-links" aria-label="Raccourcis de la ferme">${links}</nav>` : '';
}

export function renderFerme() {
  // Lot 11 : une tranche par section, toujours le même nombre de tranches (une
  // section pas encore débloquée est vide) : chacune n'est mise à jour que si
  // son gabarit a changé.
  // Les achats d'animaux et d'arbres suivent leur section (comme dans les fenêtres de la
  // carte) ; les ancres sont celles des indicateurs du bandeau et des notifications.
  return [
    `<h2>🌾 Ferme</h2>${renderFermeLinks()}${renderChapterBanner()}`,
    renderPotager(),
    renderZone2(),
    isUnlocked(state, 'serre') ? renderSerre() : '',
    isUnlocked(state, 'silo') ? renderSilo() : '',
    coopShown() ? `<div id="etable-poules" class="ancre">${renderPoulailler()}</div>` : '',
    coopShown() ? renderAchatPoules() : '',
    herdShown() ? `<div id="etable-troupeau" class="ancre">${renderPaturage()}</div>` : '',
    herdShown() ? renderAchatTroupeau() : '',
    isUnlocked(state, 'verger') ? renderVerger() : '',
    isUnlocked(state, 'verger') ? renderAchatArbres() : '',
    renderAteliers(),
    typeof renderMoulin === 'function' ? renderMoulin() : '',
    `<div id="bat-eau" class="ancre">${renderEnergieEau()}</div>`,
  ];
}

// Cartes « Énergie et eau » : dans la liste classique de la Ferme et dans la fenêtre
// Maison › Installations de la carte.
export function renderEnergieEau() {
  const e = energyStats(state), p = state.pompe, ps = deviceStatus(state, p), cap = tankCapacity(state);
  const tankUp = upgradeCost({ type: 'reservoir', niveau: state.reservoir.niveau });
  let netText = 'Stable (0 Wh/s)';
  if (e.net > 0) netText = `En charge (${formatWhRate(e.net, true)})`;
  else if (e.net < 0) netText = `En décharge (${formatWhRate(e.net, true)})`;
  const tankText = state.eauMl >= cap ? 'Réservoir plein' : `Vitesse de remplissage : ${formatLitresRate(state.flux.eau)}`;
  // version 1.12 : la maison à réparer et les appareils à acheter passent en premier ;
  // un appareil pas encore acheté n'a pas de carte
  const owned = (t) => isOwned(starterOf(state, t));
  const panneauCard = owned('panneau') ? `
      <button type="button" class="card" data-action="open-screen" data-screen="panneaux">
        <span class="card-title"><span>${icon('panneau')}Production d'énergie</span><span class="chevron" aria-hidden="true">›</span></span>
        <span class="big">${formatWhRate(e.production)}</span>
        <span class="muted">Panneau niveau ${state.panneaux[0].niveau} · ${sunText()}</span>
        ${alertLine(e.panneauxAEntretenir, e.panneauxEnPanne)}
      </button>` : '';
  const batterieCard = owned('batterie') ? `
      <button type="button" class="card" data-action="open-screen" data-screen="batteries">
        <span class="card-title"><span>${icon('batterie')}Stockage d'énergie</span><span class="chevron" aria-hidden="true">›</span></span>
        <span class="big">${formatNumber(Math.floor(e.charge / 1000))} / ${formatWh(e.capacite)}</span>
        <span class="muted">${netText}</span>
        ${alertLine(e.batteriesAEntretenir, e.batteriesEnPanne)}
      </button>` : '';
  const pompeCard = owned('pompe') ? `
      <div class="card ancre${tutoTarget('eau')}" id="dev-pompe">
        <span class="card-title"><span>${icon('pompe')}Pompe · niveau ${p.niveau}</span><span class="chips"><span class="chip${ps.code === 'panne' ? ' panne' : ''}">${ps.label}</span>${helpBtn('pompe')}</span></span>
        <span class="muted">Débit réel : <span class="num">${formatLitresRate(p.debit)}</span> (max ${formatLitresRate(pumpFlow(p))})</span>
        <span class="muted">Consommation : <span class="num">${formatWhRate(p.conso)}</span></span>
        ${wearHtml(p)}
        ${deviceControls(p)}
      </div>` : '';
  const reservoirCard = owned('reservoir') ? `
      <div class="card${tutoTarget('eau')}">
        <span class="card-title"><span>${icon('reservoir')}Réservoir · niveau ${state.reservoir.niveau}</span>${helpBtn('reservoir')}</span>
        <span class="big">${formatNumber(Math.floor(state.eauMl / 1000))} / ${formatLitres(cap)}</span>
        <span class="muted">${tankText}</span>
        ${tankUp === null
          ? '<button type="button" class="btn" disabled>Niveau max</button>'
          : `<button type="button" class="btn" data-action="upgrade-tank"${canPay(tankUp) ? '' : ' disabled'}>Agrandir : ${formatLitres(DATA.GRID.reservoir.litres[state.reservoir.niveau] * 1000)} (${costLabel(tankUp)})</button>`}
      </div>` : '';
  return `
    <h3 class="section-title">⚡ Énergie et eau</h3>
    <div class="cards">
      ${renderStarterCards()}
      ${panneauCard}
      ${batterieCard}
      ${pompeCard}
      ${reservoirCard}
      ${isUnlocked(state, 'frigo') ? renderFridgeCard() : ''}
    </div>
  `;
}

export function wearHtml(d) {
  const pct = d.usure;
  const cls = isBroken(d) ? ' bad' : needsService(d) ? ' warn' : '';
  return `
    <span class="muted">Usure : <span class="num">${formatNumber(pct)} %</span> · rendement ${formatNumber(efficiency(d))} %</span>
    <span class="bar" role="progressbar" aria-label="Usure" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(d.usure)}"><span class="bar-fill${cls}" style="width:${pct}%"></span></span>
  `;
}

// Interrupteur à deux positions : rouge à l'arrêt, vert en marche, et l'état
// est aussi écrit (la couleur n'est jamais la seule indication).
export function switchHtml(d) {
  const broken = isBroken(d);
  const on = d.allume && !broken;
  const text = broken ? 'En panne' : on ? 'Marche' : 'Arrêt';
  return `<button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${deviceName(d)}" data-action="toggle" data-id="${d.id}"${broken ? ' disabled' : ''}><span class="knob" aria-hidden="true"></span><span>${text}</span></button>`;
}

function deviceControls(d) {
  const up = upgradeCost(d);
  const maintain = maintainCost(d);
  const repair = repairCost(d);
  const broken = isBroken(d);
  const upgradeBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Niveau max</button>'
      : `<button type="button" class="btn" data-action="upgrade" data-id="${d.id}"${canPay(up) ? '' : ' disabled'}>Améliorer (${costLabel(up)})</button>`;
  const maintainOk = !broken && (d.usure > 0 || d.usureMs > 0) && canPay(maintain);
  const repairOk = broken && canPay(repair);
  return `
    <span class="device-actions">
      ${switchHtml(d)}
      ${upgradeBtn}
      <button type="button" class="btn" data-action="maintain" data-id="${d.id}"${maintainOk ? '' : ' disabled'}>Entretenir (${costLabel(maintain)})</button>
      <button type="button" class="btn" data-action="repair" data-id="${d.id}"${repairOk ? '' : ' disabled'}>Réparer (${costLabel(repair)})</button>
    </span>
  `;
}

function deviceRow(d) {
  const st = deviceStatus(state, d);
  let detail;
  if (d.type === 'panneau') {
    detail = `<span class="muted">Production : <span class="num">${formatWhRate(d.prod)}</span> (max ${formatWhRate(panelOutput(d, state))}, de ${DATA.SOLEIL.DEBUT} h à ${DATA.SOLEIL.FIN} h)</span>`;
  } else {
    const cap = batteryCapacity(d);
    let flow = 'Ni charge ni décharge';
    if (st.code === 'decharge') flow = `Puissance soutirée : ${formatWhRate(-d.sortie, true)}`;
    else if (st.code === 'charge') flow = `Charge : ${formatWhRate(d.entree, true)}`;
    detail = `
      <span class="muted">Charge : <span class="num">${formatNumber(Math.floor(d.chargeMwh / 1000))} / ${formatWh(cap)}</span></span>
      <span class="muted">${flow}</span>`;
  }
  const badge = st.badge ? `<span class="chip warn">⚠️ ${st.badge}</span>` : '';
  return `
    <article class="card ancre" id="dev-${d.id}">
      <span class="card-title"><span>${DEVICE_ICONS[d.type]} ${deviceName(d)} · niveau ${d.niveau}</span><span class="chip${st.code === 'panne' ? ' panne' : ''}">${st.label}</span></span>
      ${badge}
      ${detail}
      ${wearHtml(d)}
      ${deviceControls(d)}
    </article>
  `;
}

export function renderDeviceScreen(kind) {
  const isPanels = kind === 'panneaux';
  const list = isPanels ? state.panneaux : state.batteries;
  const type = isPanels ? 'panneau' : 'batterie';
  const e = energyStats(state);
  const summary = isPanels
    ? `<span class="big">${formatWhRate(e.production)}</span>
       <span class="muted">${sunText()}</span>`
    : `<span class="big">${formatNumber(Math.floor(e.charge / 1000))} / ${formatWh(e.capacite)}</span>
       <span class="muted">Total reçu : ${formatWhRate(e.entree, true)} · Total soutiré : ${formatWhRate(-e.sortie, true)}</span>`;
  return `
    <div class="screen-head">
      <button type="button" class="btn" data-action="close-screen">← Ferme</button>
      <h2>${icon(type)}${isPanels ? 'Production d\'énergie' : 'Stockage d\'énergie'}</h2>
      ${helpBtn(type)}
    </div>
    <div class="stack">${summary}</div>
    <div class="device-list">${list.map(deviceRow).join('')}</div>
  `;
}

/* ---------- Ferme : Zone de culture (state.potager) ---------- */

// Version 1.9 : plus d'agrandissement en pièces ; la houe laboure l'herbe (plafond de tuiles
// par niveau). En mode houe, la grille des cases remplace les cartes des parcelles.
export function renderPotager() {
  const pot = state.potager;
  const plots = hoeMode && pot.houe
    ? ''
    : `<div class="plots${tutoTarget('potager')}">${pot.parcelles.map((p, i) => plotCard(p, i + 1)).join('')}</div>
    <div class="row plot-foot">${groupButtons('potager', 1)}</div>`;
  return `
    <div class="section-head">
      <h3>${icon('potager')}${DATA.POTAGER.NOM} · ${pot.parcelles.length} parcelles</h3>
      <span class="chips">${autoChip('potager', 'Arrose et récolte tout seul, à 100 %, pendant la nuit')}${energyChip('arroser')}${helpBtn('potager')}</span>
    </div>
    ${hoePanelHtml(1)}
    ${plots}
  `;
}

/* ---------- Ferme : le Champ (state.potager.zone2), deuxième zone de culture ---------- */

// Ouvert avec le Moulin, en herbe (version 1.9) ; aucune section avant. Mêmes cartes de
// parcelle et mêmes règles que la Zone de culture ; « Arroser tout » et « Récolter tout »
// n'agissent qu'ici.
export function renderZone2() {
  const Z = DATA.POTAGER.ZONE2;
  if (!zone2Open(state)) return '';
  const plots = zone2Plots(state);
  const list = hoeMode && state.potager.houe
    ? ''
    : plots.length
      ? `<div class="plots">${plots.map((p, i) => plotCard(p, i + 1)).join('')}</div>
    <div class="row plot-foot">${groupButtons('potager', 2)}</div>`
      : '<p class="muted">Tout est en herbe : prends la houe pour labourer.</p>';
  return `
    <div class="section-head">
      <h3><span aria-hidden="true">${Z.ICONE}</span> ${Z.NOM} · ${plots.length} parcelles</h3>
      <span class="chips">${autoChip('potager', 'Arrose et récolte tout seul, à 100 %, pendant la nuit')}${energyChip('arroser')}${helpBtn('potager')}</span>
    </div>
    ${hoePanelHtml(2)}
    ${list}
  `;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'open-screen': (target) => {
    setStageReturn(stageWindow);
    setStageWindow(null);
    setEcranFerme(target.dataset.screen);
    telView();
    refresh();
  },
  'close-screen': () => {
    setEcranFerme(null);
    setStageWindow(stageReturn);
    setStageReturn(null);
    telView();
    refresh();
  },
  'toggle': (target) => {
    applyResult(toggleDevice(state, target.dataset.id));
  },
  'upgrade': (target) => {
    applyResult(upgradeDevice(state, target.dataset.id));
  },
  'upgrade-tank': () => {
    applyResult(upgradeTank(state));
  },
});
